// ============================================================================
// INLINEDECORATIONMANAGER.TS - Inline Message Display
// ============================================================================
// This file manages displaying Slack messages inline next to URLs in the editor
// Think: A Rails presenter or view helper that adds visual elements to the UI
//
// KEY CONCEPTS FOR RAILS DEVELOPERS:
// - Decorations: Virtual text that appears in the editor (doesn't modify the file)
// - Like: Adding tooltips or badges in a web UI
// - Status bar: The bar at the bottom of VS Code (like a navbar)
// - Interface: A contract that defines what methods a class must have
// ============================================================================

// IMPORTS
import * as vscode from "vscode"
// Import VS Code API for editor manipulation and UI elements
// Like: require 'vscode' in Ruby

import {SLACK_URL_REGEX} from "./slackApi"
// Import the regex pattern for matching Slack URLs
// Like: require_relative './slack_api' and using SLACK_URL_REGEX

// ============================================================================
// MESSAGEFETCHER INTERFACE
// ============================================================================
// This defines a contract that any message fetcher must follow
// Think: A Ruby module or abstract base class
//
// WHY USE AN INTERFACE?
// - Decoupling: InlineDecorationManager doesn't need to know HOW messages are fetched
// - Testing: Easy to create mock implementations for tests
// - Flexibility: Can swap implementations (cached, non-cached, etc.)
//
// Ruby equivalent:
//   module MessageFetcher
//     def get_message_content(url)
//       raise NotImplementedError
//     end
//   end
//
// EXPORT: Makes this available to other files
export interface MessageFetcher {
  // This method must return a Promise<string>
  // Like: def get_message_content(url) -> String
  getMessageContent(url: string): Promise<string>
}

// ============================================================================
// INLINEDECORATIONMANAGER CLASS
// ============================================================================
// Manages the display of Slack messages inline in the editor
//
// RESPONSIBILITIES:
// 1. Find all Slack URLs in the document
// 2. Fetch message content for each URL
// 3. Display messages as decorations (virtual text) next to URLs
// 4. Toggle decorations on/off
// 5. Show status in status bar
//
// Think: A Rails concern or presenter that adds visual elements
// ============================================================================
export class InlineDecorationManager {
  // ============================================================================
  // PRIVATE PROPERTIES (Instance Variables)
  // ============================================================================
  // private = only accessible within this class
  // Like: @is_active in Ruby (but enforced by the language)

  // IS ACTIVE: Tracks whether decorations are currently showing
  // boolean = can only be true or false
  // Like: @is_active = false
  private isActive = false

  // DECORATION TYPE: Defines how decorations look
  // null = no decoration type created yet
  // | null = union type (can be TextEditorDecorationType OR null)
  // Like: @decoration_type = nil
  //
  // WHY NULLABLE?
  // - We only create the decoration type when needed (lazy initialization)
  // - We dispose of it when done (to free memory)
  private decorationType: vscode.TextEditorDecorationType | null = null

  // STATUS BAR ITEM: The clickable item in the bottom status bar
  // Shows whether inline messages are active or not
  // Like: A status indicator in a web UI
  private statusBarItem: vscode.StatusBarItem

  // MESSAGE FETCHER: The object that fetches Slack messages
  // readonly = cannot be reassigned after constructor
  // Like: attr_reader :message_fetcher
  private readonly messageFetcher: MessageFetcher

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================
  // Called when creating: new InlineDecorationManager(messageFetcher)
  // Ruby equivalent: def initialize(message_fetcher)
  //
  // PARAMETER:
  // - messageFetcher: MessageFetcher = must implement the MessageFetcher interface
  constructor(messageFetcher: MessageFetcher) {
    // STORE MESSAGE FETCHER
    // this.messageFetcher = reference to the instance variable
    // Like: @message_fetcher = message_fetcher
    this.messageFetcher = messageFetcher

    // CREATE STATUS BAR ITEM
    // vscode.window.createStatusBarItem creates a clickable item in the status bar
    //
    // PARAMETERS:
    // - vscode.StatusBarAlignment.Right = position on right side
    // - 100 = priority (higher numbers appear more to the left)
    //
    // Ruby equivalent (conceptual):
    //   @status_bar_item = StatusBar.create_item(alignment: :right, priority: 100)
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)

    // SET COMMAND: What happens when user clicks the status bar item
    // This will execute the "slackoscope.toggleInlineMessage" command
    // Like: onclick="toggleInlineMessage()" in HTML
    this.statusBarItem.command = "slackoscope.toggleInlineMessage"

    // SET TOOLTIP: Text shown when hovering over status bar item
    // Like: title="..." in HTML
    this.statusBarItem.tooltip = "Toggle Slack inline messages"

    // UPDATE STATUS BAR: Initialize the display
    // This will show the status bar item with appropriate text/icon
    this.updateStatusBar()
  }

  // ============================================================================
  // TOGGLE METHOD
  // ============================================================================
  // Toggles inline message decorations on/off
  // This is called when user runs the "Toggle Inline Message Display" command
  //
  // PARAMETERS:
  // - editor: vscode.TextEditor | undefined
  //   - Can be undefined if no editor is open
  //   - | undefined = union type (either TextEditor OR undefined)
  //
  // RETURNS:
  // - Promise<boolean> = true if now active, false if now inactive
  //
  // async = this method returns a Promise (might take time to fetch messages)
  //
  // Ruby equivalent:
  //   def toggle(editor = nil)
  //     return @is_active if editor.nil?
  //     if @is_active
  //       disable(editor)
  //       false
  //     else
  //       enable(editor)
  //       true
  //     end
  //   end
  // ============================================================================
  async toggle(editor: vscode.TextEditor | undefined): Promise<boolean> {
    // CHECK IF EDITOR EXISTS
    if (!editor) {
      // Show warning notification to user
      // Like: Rails flash[:warning] = "No active editor"
      vscode.window.showWarningMessage("No active editor")

      // Return current state (unchanged)
      return this.isActive
    }

    // TOGGLE STATE
    // If currently active, disable; otherwise enable
    if (this.isActive) {
      this.disable(editor)
      return false // Now inactive
    } else {
      await this.enable(editor) // Wait for messages to be fetched
      return true // Now active
    }
  }

  // ============================================================================
  // ENABLE METHOD (Private)
  // ============================================================================
  // Turns on inline decorations for all Slack URLs in the document
  //
  // WORKFLOW:
  // 1. Clean up any existing decorations
  // 2. Create new decoration type (defines styling)
  // 3. Find all Slack URLs and fetch their messages
  // 4. Apply decorations to editor
  // 5. Update status bar
  //
  // private = only accessible within this class
  // async = returns a Promise (fetching messages takes time)
  //
  // Ruby equivalent:
  //   private
  //
  //   def enable(editor)
  //     clear_decorations(editor)
  //     create_decoration_type
  //     decorations = find_slack_url_decorations(editor.document)
  //     editor.apply_decorations(@decoration_type, decorations)
  //     @is_active = true
  //     update_status_bar
  //   end
  // ============================================================================
  private async enable(editor: vscode.TextEditor): Promise<void> {
    // CLEAN UP EXISTING DECORATIONS
    // Ensures we start with a clean slate
    // Like: @decorations&.clear in Ruby
    this.clearDecorations(editor)

    // CREATE DECORATION TYPE
    // This defines how the inline text will look
    //
    // createTextEditorDecorationType creates a reusable style
    // Like: CSS classes in web development
    //
    // PARAMETERS: Options object defining the style
    this.decorationType = vscode.window.createTextEditorDecorationType({
      // "after" = content appears after the text (not before)
      after: {
        // MARGIN: Space before the decoration
        // "0 0 0 1em" = top right bottom left (like CSS)
        // 1em = one character width of space
        margin: "0 0 0 1em",

        // TEXT DECORATION: CSS styling
        // "none" = no underline, strikethrough, etc.
        // "opacity: 0.7" = 70% opaque (slightly faded)
        textDecoration: "none; opacity: 0.7;",

        // COLOR: Use theme color
        // ThemeColor = adapts to user's color theme (dark/light)
        // "editorCodeLens.foreground" = color used for code lens (subtle gray)
        //
        // WHY ThemeColor?
        // - Respects user's theme (doesn't hardcode colors)
        // - Ensures text is always visible
        color: new vscode.ThemeColor("editorCodeLens.foreground")
      }
    })

    // FIND ALL SLACK URLS AND CREATE DECORATIONS
    // This scans the document, finds URLs, fetches messages
    // await = wait for all messages to be fetched
    // Like: decorations = find_slack_url_decorations(editor.document)
    const decorations = await this.findSlackUrlDecorations(editor.document)

    // APPLY DECORATIONS TO EDITOR
    // This actually displays the decorations in the editor
    //
    // setDecorations(decorationType, decorations) does:
    // - Takes a decoration type (the style)
    // - Takes an array of decoration options (what and where to show)
    // - Applies them to the editor
    //
    // Like: editor.render(decorations: decorations, style: @decoration_type)
    editor.setDecorations(this.decorationType, decorations)

    // UPDATE STATE
    // Mark decorations as active
    this.isActive = true

    // UPDATE STATUS BAR
    // Change icon/text to show decorations are active
    this.updateStatusBar()
  }

  // ============================================================================
  // DISABLE METHOD (Private)
  // ============================================================================
  // Turns off inline decorations
  //
  // WORKFLOW:
  // 1. Clear all decorations from editor
  // 2. Update state
  // 3. Update status bar
  //
  // Ruby equivalent:
  //   private
  //
  //   def disable(editor)
  //     clear_decorations(editor)
  //     @is_active = false
  //     update_status_bar
  //   end
  // ============================================================================
  private disable(editor: vscode.TextEditor): void {
    // CLEAR DECORATIONS
    // Remove all inline messages from the editor
    this.clearDecorations(editor)

    // UPDATE STATE
    // Mark decorations as inactive
    this.isActive = false

    // UPDATE STATUS BAR
    // Change icon/text to show decorations are inactive
    this.updateStatusBar()
  }

  // ============================================================================
  // CLEAR DECORATIONS METHOD (Private)
  // ============================================================================
  // Removes all decorations and cleans up resources
  //
  // IMPORTANT: Always clean up decorations before creating new ones
  // - Prevents memory leaks
  // - Avoids duplicate decorations
  //
  // Ruby equivalent:
  //   private
  //
  //   def clear_decorations(editor)
  //     if @decoration_type
  //       editor.clear_decorations(@decoration_type)
  //       @decoration_type.dispose
  //       @decoration_type = nil
  //     end
  //   end
  // ============================================================================
  private clearDecorations(editor: vscode.TextEditor): void {
    // CHECK IF DECORATION TYPE EXISTS
    // Only try to clear if we have a decoration type
    if (this.decorationType) {
      // CLEAR DECORATIONS FROM EDITOR
      // setDecorations with empty array = remove all decorations of this type
      // Like: editor.decorations[@decoration_type] = []
      editor.setDecorations(this.decorationType, [])

      // DISPOSE OF DECORATION TYPE
      // Free memory and resources
      // Like: @decoration_type.cleanup or @decoration_type = nil
      //
      // WHY DISPOSE?
      // - VS Code keeps decoration types in memory
      // - Disposing tells VS Code we're done with it
      // - Prevents memory leaks
      this.decorationType.dispose()

      // SET TO NULL
      // Indicates no decoration type exists
      this.decorationType = null
    }
  }

  // ============================================================================
  // FIND SLACK URL DECORATIONS METHOD (Private)
  // ============================================================================
  // Finds all Slack URLs in the document and creates decoration options
  //
  // WORKFLOW:
  // 1. Get document text
  // 2. Find all Slack URLs using regex
  // 3. Fetch message content for each URL (in parallel)
  // 4. Create decoration options for each URL
  //
  // PARAMETERS:
  // - document: vscode.TextDocument = the file being edited
  //
  // RETURNS:
  // - Promise<vscode.DecorationOptions[]> = array of decoration options
  //
  // async = fetching messages takes time
  //
  // Ruby equivalent:
  //   private
  //
  //   def find_slack_url_decorations(document)
  //     text = document.text
  //     matches = text.scan(SLACK_URL_REGEX)
  //     matches.map do |match|
  //       # Fetch message and create decoration
  //     end
  //   end
  // ============================================================================
  private async findSlackUrlDecorations(document: vscode.TextDocument): Promise<vscode.DecorationOptions[]> {
    // INITIALIZE DECORATIONS ARRAY
    // We'll fill this with decoration options
    // Like: decorations = []
    //
    // TYPE ANNOTATION:
    // vscode.DecorationOptions[] = array of DecorationOptions objects
    const decorations: vscode.DecorationOptions[] = []

    // GET DOCUMENT TEXT
    // getText() returns the entire content of the file
    // Like: text = document.read
    const text = document.getText()

    // CREATE GLOBAL REGEX
    // We need a regex with the "g" flag to find ALL matches (not just first)
    //
    // WHY CREATE A NEW REGEX?
    // - SLACK_URL_REGEX doesn't have the "g" flag
    // - We need "g" to use matchAll()
    //
    // new RegExp(pattern.source, "g") does:
    // - pattern.source = get the regex pattern as a string
    // - "g" = global flag (find all matches)
    //
    // Ruby equivalent:
    //   global_regex = Regexp.new(SLACK_URL_REGEX.source)
    const globalRegex = new RegExp(SLACK_URL_REGEX.source, "g")

    // FIND ALL MATCHES
    // matchAll() returns an iterator of all matches
    // Like: text.scan(SLACK_URL_REGEX) in Ruby
    //
    // RETURNS: An iterable of match objects
    // Each match object has:
    // - match[0] = full matched string (the URL)
    // - match[1] = first capture group (channel ID)
    // - match[2] = second capture group (timestamp)
    // - match.index = position in string where match starts
    const matches = text.matchAll(globalRegex)

    // URL PROMISES ARRAY
    // We'll store promises for fetching messages here
    // We fetch all messages in parallel for better performance
    //
    // TYPE ANNOTATION:
    // Promise<{range: vscode.Range; url: string; content: string}>[]
    // = array of promises that resolve to objects with range, url, and content
    //
    // Like: url_futures = [] in Ruby with concurrent-ruby
    const urlPromises: Promise<{range: vscode.Range; url: string; content: string}>[] = []

    // ITERATE OVER MATCHES
    // for (const match of matches) = for each match in matches
    // Like: matches.each do |match| in Ruby
    //
    // WHY NOT forEach()?
    // - matchAll() returns an iterator, not an array
    // - for...of works with iterators
    for (const match of matches) {
      // GET MATCH POSITION
      // match.index = character position where match starts
      // ! = non-null assertion (tell TypeScript index definitely exists)
      //
      // positionAt(offset) converts character offset to Position (line, character)
      // Like: position = document.offset_to_position(match.begin(0))
      const startPos = document.positionAt(match.index!)

      // GET MATCH END POSITION
      // match.index + match[0].length = position where match ends
      // match[0] = the full matched string (the URL)
      // Like: end_pos = document.offset_to_position(match.end(0))
      const endPos = document.positionAt(match.index! + match[0].length)

      // CREATE RANGE
      // Range = start and end position in the document
      // Like: range = Range.new(start_pos, end_pos)
      //
      // WHY RANGE?
      // - Tells VS Code where to place the decoration
      // - Range is independent of text changes (line/character based)
      const range = new vscode.Range(startPos, endPos)

      // GET SLACK URL
      // match[0] = the full matched string
      const slackUrl = match[0]

      // FETCH MESSAGE CONTENT (Async)
      // We push the promise to the array WITHOUT awaiting yet
      // This allows all fetches to happen in parallel
      //
      // PATTERN EXPLAINED:
      // this.messageFetcher.getMessageContent(slackUrl) returns Promise<string>
      // .then(content => ({...})) transforms the promise
      // Result: Promise<{range, url, content}>
      //
      // Ruby equivalent (with concurrent-ruby):
      //   promise = Concurrent::Promises.future do
      //     content = @message_fetcher.get_message_content(slack_url)
      //     { range: range, url: slack_url, content: content }
      //   end
      //   url_promises << promise
      //
      // WHY .then() INSTEAD OF await?
      // - We want to start all fetches simultaneously
      // - await would block and wait for each one sequentially
      // - .then() returns a new promise we can await later
      urlPromises.push(
        this.messageFetcher.getMessageContent(slackUrl).then(content => ({
          range,
          url: slackUrl,
          content
        }))
      )
    }

    // WAIT FOR ALL MESSAGES TO BE FETCHED
    // Promise.all() waits for all promises to resolve
    // Like: results = url_promises.map(&:value) in Ruby (waits for all futures)
    //
    // WHY Promise.all()?
    // - Efficient: All fetches happen in parallel
    // - Simple: Single await for all results
    // - Type-safe: Returns array of results in same order
    //
    // await = wait for all promises to complete
    const results = await Promise.all(urlPromises)

    // CREATE DECORATIONS FROM RESULTS
    // for (const {...} of results) = destructure each result
    // Like: results.each do |range:, url:, content:| in Ruby
    for (const {range, content} of results) {
      // TRUNCATE MESSAGE
      // Long messages would make the line too long
      // This shortens them for display
      const truncatedContent = this.truncateMessage(content)

      // CREATE DECORATION OPTION
      // This defines what to show and where
      //
      // STRUCTURE:
      // - range: Where to place the decoration (after this range)
      // - renderOptions: How to render it
      //   - after: Content to show after the range
      //     - contentText: The actual text to display
      //
      // Like:
      //   decoration = {
      //     range: range,
      //     render_options: {
      //       after: { content_text: "  |  #{truncated_content}" }
      //     }
      //   }
      decorations.push({
        range,
        renderOptions: {
          after: {
            contentText: `  |  ${truncatedContent}` // "  |  " separator + message
          }
        }
      })
    }

    // RETURN DECORATIONS ARRAY
    // This array will be used by editor.setDecorations()
    return decorations
  }

  // ============================================================================
  // TRUNCATE MESSAGE METHOD (Private)
  // ============================================================================
  // Shortens long messages for inline display
  //
  // PARAMETERS:
  // - message: string = the message to truncate
  // - maxLength: number = max characters (default: 100)
  //   - = 100 = default parameter value
  //   - Like: def truncate_message(message, max_length = 100) in Ruby
  //
  // RETURNS:
  // - string = truncated message (with "..." if truncated)
  //
  // Ruby equivalent:
  //   private
  //
  //   def truncate_message(message, max_length = 100)
  //     single_line = message.gsub("\n", " ")
  //     return single_line if single_line.length <= max_length
  //     "#{single_line[0...max_length]}..."
  //   end
  // ============================================================================
  private truncateMessage(message: string, maxLength = 100): string {
    // REPLACE NEWLINES WITH SPACES
    // .replace(/\n/g, " ") does:
    // - /\n/g = regex that matches newlines (g = global, all occurrences)
    // - " " = replacement string (single space)
    //
    // Result: Multi-line message becomes single line
    // Like: message.gsub("\n", " ") in Ruby
    const singleLine = message.replace(/\n/g, " ")

    // CHECK IF TRUNCATION NEEDED
    // If message is short enough, return as-is
    if (singleLine.length > maxLength) {
      // TRUNCATE AND ADD ELLIPSIS
      // .substring(0, maxLength) = get first maxLength characters
      // Like: single_line[0...max_length] in Ruby
      // + "..." = add ellipsis to show it's truncated
      return singleLine.substring(0, maxLength) + "..."
    }

    // RETURN UNMODIFIED
    // Message is short enough, no truncation needed
    return singleLine
  }

  // ============================================================================
  // UPDATE STATUS BAR METHOD (Private)
  // ============================================================================
  // Updates the status bar item to reflect current state
  //
  // BEHAVIOR:
  // - Active: Shows eye icon with orange background
  // - Inactive: Shows closed eye icon with normal background
  //
  // Ruby equivalent:
  //   private
  //
  //   def update_status_bar
  //     if @is_active
  //       @status_bar_item.text = "👁 Slack"
  //       @status_bar_item.background_color = :warning
  //     else
  //       @status_bar_item.text = "👁 Slack"
  //       @status_bar_item.background_color = nil
  //     end
  //     @status_bar_item.show
  //   end
  // ============================================================================
  private updateStatusBar(): void {
    // CHECK IF ACTIVE
    if (this.isActive) {
      // ACTIVE STATE
      // Set text with open eye icon
      // $(eye) = VS Code icon syntax (built-in icons)
      // Like: @status_bar_item.text = "👁 Slack"
      this.statusBarItem.text = "$(eye) Slack"

      // Set background color to warning (usually orange/yellow)
      // ThemeColor = adapts to user's theme
      // Like: @status_bar_item.background = :warning
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground")

      // Show the status bar item
      // Like: @status_bar_item.visible = true
      this.statusBarItem.show()
    } else {
      // INACTIVE STATE
      // Set text with closed eye icon
      // $(eye-closed) = VS Code closed eye icon
      this.statusBarItem.text = "$(eye-closed) Slack"

      // Clear background color (use default)
      // undefined = no special background
      this.statusBarItem.backgroundColor = undefined

      // Show the status bar item
      this.statusBarItem.show()
    }
  }

  // ============================================================================
  // GET IS ACTIVE METHOD
  // ============================================================================
  // Public getter for the active state
  // Like: attr_reader :is_active in Ruby
  //
  // WHY A METHOD?
  // - Encapsulation: External code can read but not write
  // - TypeScript doesn't have Ruby-style attr_reader
  //
  // Ruby equivalent:
  //   def is_active?
  //     @is_active
  //   end
  // ============================================================================
  getIsActive(): boolean {
    return this.isActive
  }

  // ============================================================================
  // REFRESH METHOD
  // ============================================================================
  // Refreshes decorations if currently active
  // Useful when cache is cleared or document changes
  //
  // PARAMETERS:
  // - editor: vscode.TextEditor | undefined
  //
  // async = might need to fetch messages
  //
  // Ruby equivalent:
  //   def refresh(editor = nil)
  //     enable(editor) if @is_active && editor
  //   end
  // ============================================================================
  async refresh(editor: vscode.TextEditor | undefined): Promise<void> {
    // ONLY REFRESH IF ACTIVE AND EDITOR EXISTS
    // && = logical AND (both conditions must be true)
    if (this.isActive && editor) {
      // RE-ENABLE DECORATIONS
      // This will fetch messages again and update decorations
      await this.enable(editor)
    }
  }

  // ============================================================================
  // DISPOSE METHOD
  // ============================================================================
  // Cleans up all resources when the extension is deactivated
  // This is called automatically by VS Code (via context.subscriptions)
  //
  // IMPORTANT: Always implement dispose() for classes that manage resources
  // - Prevents memory leaks
  // - Ensures clean shutdown
  //
  // Ruby equivalent:
  //   def dispose
  //     @decoration_type&.dispose
  //     @decoration_type = nil
  //     @status_bar_item.dispose
  //     @is_active = false
  //   end
  // ============================================================================
  dispose(): void {
    // DISPOSE DECORATION TYPE
    // Clean up decoration resources if they exist
    if (this.decorationType) {
      this.decorationType.dispose()
      this.decorationType = null
    }

    // DISPOSE STATUS BAR ITEM
    // Remove the item from the status bar
    // Like: @status_bar_item.remove or @status_bar_item = nil
    this.statusBarItem.dispose()

    // RESET STATE
    // Mark as inactive
    this.isActive = false
  }
}
