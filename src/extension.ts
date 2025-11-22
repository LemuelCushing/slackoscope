// ============================================================================
// EXTENSION.TS - Main Entry Point
// ============================================================================
// This file is like the main controller or application.rb in Rails.
// It handles the extension lifecycle and registers all features.
//
// KEY CONCEPTS FOR RAILS DEVELOPERS:
// - import/export: Like Ruby's require, but explicit (must export to share)
// - async/await: Makes asynchronous code look synchronous
// - vscode namespace: The VS Code API (like Rails' ActionController, ActionView, etc.)
// - context.subscriptions: Ensures cleanup when extension unloads (like Rails' ensure block)
// ============================================================================

// IMPORTS: Bring in external modules
// Think: require 'vscode' in Ruby, but more explicit
import * as vscode from "vscode"
// * as vscode = import everything from the 'vscode' module and call it 'vscode'
// This gives us access to the VS Code API

import {SlackApi, SLACK_URL_REGEX} from "./slackApi"
// { } = named imports (only import specific things)
// SlackApi: The class that handles Slack API calls
// SLACK_URL_REGEX: The regex pattern for matching Slack URLs

import {InlineDecorationManager, MessageFetcher} from "./inlineDecorationManager"
// InlineDecorationManager: Handles showing messages inline in the editor
// MessageFetcher: An interface (contract) that defines how to fetch messages

// ============================================================================
// MESSAGE CACHE
// ============================================================================
// Simple in-memory cache that stores Slack messages
// Like: @message_cache = {} in Ruby, but with type safety
//
// Map<string, string> is a generic type that means:
// - Keys must be strings (the Slack URL)
// - Values must be strings (the message content)
//
// WHY USE Map INSTEAD OF {}?
// - Map has better performance for frequent additions/deletions
// - Map preserves insertion order
// - Map has built-in size property
// - Map is designed for this use case (key-value storage)
const messageCache = new Map<string, string>()

// ============================================================================
// CACHEDMESSAGEFETCHER CLASS
// ============================================================================
// This class wraps SlackApi and adds caching functionality
// Think: A Rails decorator or concern that adds caching to a service object
//
// KEY TYPESCRIPT CONCEPTS:
// - export: Makes this class available to other files (like public in Ruby)
// - implements MessageFetcher: This class must follow the MessageFetcher contract
// - private: Instance variable only accessible within this class (like Ruby's private)
// - async: This method returns a Promise (like a future value)
// ============================================================================
export class CachedMessageFetcher implements MessageFetcher {
  // CONSTRUCTOR: Called when creating new instance
  // Ruby equivalent: def initialize(slack_api)
  //
  // private slackApi: SlackApi means:
  // - Create a private instance variable called slackApi
  // - It must be of type SlackApi
  // - It's automatically assigned from the constructor parameter
  //
  // This is TypeScript shorthand for:
  //   private slackApi: SlackApi
  //   constructor(slackApi: SlackApi) {
  //     this.slackApi = slackApi
  //   }
  constructor(private slackApi: SlackApi) {}

  // ASYNC METHOD: Fetches message content with caching
  // async = this method returns a Promise<string>
  // Promise<string> = "I promise to give you a string eventually"
  //
  // Ruby equivalent:
  //   def get_message_content(url)
  //     # Returns a string
  //   end
  //
  // KEY DIFFERENCE: JavaScript is single-threaded, so async operations
  // (like API calls) need Promises to avoid blocking the UI
  async getMessageContent(url: string): Promise<string> {
    // Try to get cached message first
    // .get(url) returns string | undefined (might not exist)
    let messageContent = messageCache.get(url)

    // If not in cache, fetch from API
    if (!messageContent) {
      // await = wait for the Promise to resolve before continuing
      // Like: message_content = SlackApi.get_message_content(url)
      // But with await, we're explicitly saying "pause here until we get the result"
      messageContent = await this.slackApi.getMessageContent(url)

      // Store in cache for next time
      // Like: @message_cache[url] = message_content
      messageCache.set(url, messageContent)
    }

    // Return the message (either from cache or freshly fetched)
    return messageContent
  }
}

// ============================================================================
// CLEAR MESSAGE CACHE FUNCTION
// ============================================================================
// Exported for testing purposes
// Ruby equivalent: def clear_message_cache
//
// void = this function doesn't return anything (like Ruby method with no return)
export function clearMessageCache(): void {
  messageCache.clear() // Empty the cache
}

// ============================================================================
// ACTIVATE FUNCTION - EXTENSION ENTRY POINT
// ============================================================================
// This is THE most important function in a VS Code extension
// It's called when VS Code loads your extension
//
// Think: Rails initializer or config/application.rb startup
//
// vscode.ExtensionContext = object that contains extension metadata
// Like Rails' config object that has info about the app
//
// WHEN IS THIS CALLED?
// - When VS Code starts (if activationEvents includes "onStartupFinished")
// - When user runs a command from this extension
// - See package.json "activationEvents" for full list
// ============================================================================
export function activate(context: vscode.ExtensionContext) {
  // Log that extension is active (appears in Debug Console)
  // Like: Rails.logger.info "Extension activated"
  console.log("Slackoscope is now active!")

  // CREATE SLACK API INSTANCE
  // Ruby equivalent: slack_api = SlackApi.new
  const slackApi = new SlackApi()

  // CREATE MESSAGE FETCHER WITH CACHING
  // This wraps SlackApi with caching functionality
  // Ruby equivalent: message_fetcher = CachedMessageFetcher.new(slack_api)
  const messageFetcher = new CachedMessageFetcher(slackApi)

  // CREATE INLINE DECORATION MANAGER
  // This handles showing messages inline in the editor
  // Ruby equivalent: inline_decoration_manager = InlineDecorationManager.new(message_fetcher)
  const inlineDecorationManager = new InlineDecorationManager(messageFetcher)

  // REGISTER FOR CLEANUP
  // context.subscriptions is an array of "disposables" (resources to clean up)
  // Think: Rails' ensure block or around_action callback
  //
  // When the extension is deactivated, VS Code will call .dispose()
  // on everything in this array
  context.subscriptions.push(inlineDecorationManager)

  // ============================================================================
  // REGISTER HOVER PROVIDER
  // ============================================================================
  // A hover provider shows information when you hover over code
  // Like: Rails helper that shows tooltips
  //
  // vscode.languages.registerHoverProvider does:
  // - Register a handler for hover events
  // - "*" = apply to all file types (could be "javascript", "ruby", etc.)
  // - Returns a disposable (for cleanup)
  //
  // We push it to context.subscriptions so VS Code cleans it up properly
  // ============================================================================
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("*", {
      // PROVIDE HOVER METHOD
      // This is called whenever the user hovers over text
      //
      // Parameters:
      // - document: The file being edited (like a Rails model representing the file)
      // - position: Where the cursor is (line and character number)
      //
      // Returns: A Hover object (what to show) or undefined (show nothing)
      //
      // async: This method returns a Promise (might take time to fetch message)
      async provideHover(document, position) {
        // GET WORD AT POSITION
        // Check if the cursor is over a Slack URL
        //
        // getWordRangeAtPosition(position, regex) does:
        // - Look at the position (cursor location)
        // - Try to match the regex pattern
        // - Return the range (start and end positions) if it matches
        // - Return undefined if no match
        //
        // Like: document.text[position].match(SLACK_URL_REGEX)
        const range = document.getWordRangeAtPosition(position, SLACK_URL_REGEX)

        // If not hovering over a Slack URL, do nothing
        // Ruby equivalent: return unless range
        if (!range) {
          return // Return undefined (show no hover)
        }

        // GET THE SLACK URL TEXT
        // Extract the actual URL string from the document
        // Like: slack_url = document.text[range]
        const slackUrl = document.getText(range)

        // FETCH MESSAGE CONTENT
        // This is an async call, so we use await
        // The messageFetcher will check cache first, then fetch from API
        //
        // await = wait for the Promise to resolve
        // Like: message_content = message_fetcher.get_message_content(slack_url)
        const messageContent = await messageFetcher.getMessageContent(slackUrl)

        // CREATE HOVER MESSAGE
        // MarkdownString = formatted text (like Markdown in README files)
        // We can use **bold**, `code`, [links](url), etc.
        //
        // Ruby equivalent: hover_message = "**Slack Message:** #{message_content}"
        const hoverMessage = new vscode.MarkdownString(`**Slack Message:** ${messageContent}`)

        // isTrusted = allow command links in the markdown
        // Security feature: only trusted content can execute commands
        hoverMessage.isTrusted = true

        // CREATE COMMAND LINK
        // We want to add a clickable link that inserts the message as a comment
        //
        // COMMAND URI FORMAT: command:commandName?argumentsAsJson
        // This is a special VS Code URI scheme for executing commands
        //
        // JSON.stringify = convert object to JSON string
        // Like: {url: slack_url, line_number: position.line}.to_json
        const jsonParams = JSON.stringify({url: slackUrl, lineNumber: position.line})

        // encodeURIComponent = escape special characters for URL
        // Like: CGI.escape(json_params)
        const insertCommandUrl = `command:slackoscope.insertCommentedMessage?${encodeURIComponent(jsonParams)}`

        // ADD LINK TO HOVER
        // \n\n = two newlines (blank line in Markdown)
        // [text](url) = Markdown link syntax
        hoverMessage.appendMarkdown(`\n\n[Insert Commented Message](${insertCommandUrl})`)

        // RETURN HOVER OBJECT
        // This is what VS Code will display in the hover popup
        // Ruby equivalent: Hover.new(hover_message)
        return new vscode.Hover(hoverMessage)
      }
    })
  )

  // ============================================================================
  // REGISTER TOGGLE INLINE MESSAGE COMMAND
  // ============================================================================
  // Commands are user-facing features that appear in the Command Palette
  // Like: Rails routes that map to controller actions
  //
  // vscode.commands.registerCommand does:
  // - Create a command with a unique ID
  // - Associate it with a handler function
  // - Return a disposable (for cleanup)
  //
  // COMMAND ID: "slackoscope.toggleInlineMessage"
  // - Must match package.json "contributes.commands"
  // - Users can run this via Ctrl+Shift+P (Command Palette)
  //
  // Ruby equivalent:
  //   post '/slackoscope/toggle_inline_message', to: 'slackoscope#toggle_inline_message'
  // ============================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand("slackoscope.toggleInlineMessage", async () => {
      // GET ACTIVE EDITOR
      // vscode.window.activeTextEditor = the currently focused editor
      // Can be undefined if no editor is open
      // Like: current_editor = Editor.find_by(active: true)
      const editor = vscode.window.activeTextEditor

      // TOGGLE INLINE MESSAGES
      // This shows/hides Slack messages next to their URLs in the file
      // await = wait for the operation to complete
      await inlineDecorationManager.toggle(editor)
    })
  )

  // ============================================================================
  // CREATE COMMENTED SNIPPET FUNCTION
  // ============================================================================
  // Helper function that wraps message text in comment syntax
  //
  // SNIPPETS IN VS CODE:
  // - Snippets are templates with variables that VS Code resolves
  // - $LINE_COMMENT is a special variable that becomes the language's comment syntax
  // - JavaScript: // | Python: # | Ruby: # | SQL: --
  //
  // This is MAGIC! VS Code automatically knows the comment syntax for each language
  //
  // Ruby equivalent: Would need a case statement for each language
  //   case language
  //   when 'javascript' then '//'
  //   when 'python' then '#'
  //   when 'ruby' then '#'
  //   end
  // ============================================================================
  const createCommentedSnippet = (message: string): vscode.SnippetString => {
    // SPLIT MESSAGE BY NEWLINES
    // message.split("\n") = array of lines
    // Like: message.split("\n")
    //
    // .map(line => ...) = transform each line
    // Like: message.split("\n").map { |line| ... }
    //
    // `$LINE_COMMENT ${line}` = "// line" or "# line" depending on language
    // This is a template that VS Code will resolve
    //
    // .join("\n") = combine back into single string with newlines
    // Like: .join("\n")
    return new vscode.SnippetString(
      message
        .split("\n") // Split into array of lines
        .map(line => `$LINE_COMMENT ${line}`) // Wrap each line with comment syntax
        .join("\n") // Join back together
    )
  }

  // ============================================================================
  // INSERT COMMENTED MESSAGE HANDLER
  // ============================================================================
  // This function is called when user clicks "Insert Commented Message" in hover
  //
  // PARAMETERS:
  // - {url, lineNumber}: Object destructuring (like Ruby's keyword arguments)
  //   Ruby equivalent: def insert_commented_message(url:, line_number:)
  //
  // TYPE ANNOTATION: {url: string; lineNumber: number}
  // - url must be a string
  // - lineNumber must be a number
  // - ; separates properties (could also use ,)
  // ============================================================================
  const insertCommentedMessageHandler = async ({url, lineNumber}: {url: string; lineNumber: number}) => {
    // GET ACTIVE EDITOR
    // Like: editor = Editor.find_by(active: true)
    const editor = vscode.window.activeTextEditor

    // ONLY PROCEED IF EDITOR EXISTS
    // Ruby equivalent: if editor
    if (editor) {
      // GET DOCUMENT
      // The document represents the file content
      // Like: document = editor.document
      const document = editor.document

      // FETCH MESSAGE CONTENT
      // await = wait for the API call to complete
      // The messageFetcher checks cache first
      const messageContent = await messageFetcher.getMessageContent(url)

      // CREATE COMMENTED SNIPPET
      // This wraps the message in comment syntax
      const commentSnippet = createCommentedSnippet(messageContent)

      // CHECK IF WE NEED TO INSERT A NEWLINE
      // We want to insert the comment on a new line
      //
      // CONDITIONS:
      // - lineNumber + 1 === document.lineCount: We're at the last line
      // - !document.lineAt(lineNumber + 1).isEmptyOrWhitespace: Next line is not empty
      //
      // If either condition is true, we need to add a newline first
      if (lineNumber + 1 === document.lineCount || !document.lineAt(lineNumber + 1).isEmptyOrWhitespace) {
        // CREATE EDIT
        // WorkspaceEdit = a collection of changes to apply to files
        // Like: Rails transaction that groups multiple database changes
        const edit = new vscode.WorkspaceEdit()

        // INSERT NEWLINE
        // document.uri = unique identifier for the file
        // document.lineAt(lineNumber).range.end = end of the current line
        // "\n" = newline character
        //
        // Ruby equivalent:
        //   file.insert_at(current_line.end, "\n")
        edit.insert(document.uri, document.lineAt(lineNumber).range.end, "\n")

        // APPLY EDIT
        // await = wait for the edit to be applied
        // Like: ActiveRecord transaction.commit
        await vscode.workspace.applyEdit(edit)
      }

      // INSERT SNIPPET
      // Position(line, character) = location in the file
      // lineNumber + 1 = next line (insert below the Slack URL)
      // 0 = character 0 (start of line)
      //
      // Ruby equivalent:
      //   editor.insert_at(line: line_number + 1, char: 0, text: comment_snippet)
      editor.insertSnippet(commentSnippet, new vscode.Position(lineNumber + 1, 0))
    }
  }

  // ============================================================================
  // REGISTER INSERT COMMENTED MESSAGE COMMAND
  // ============================================================================
  // This command is triggered by the link in the hover popup
  // It's not visible in the Command Palette (see package.json "enablement": "false")
  //
  // Ruby equivalent:
  //   post '/slackoscope/insert_commented_message', to: 'slackoscope#insert_commented_message'
  // ============================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand("slackoscope.insertCommentedMessage", insertCommentedMessageHandler)
  )

  // ============================================================================
  // REGISTER CLEAR CACHE COMMAND
  // ============================================================================
  // Allows users to manually clear the message cache
  // Useful when Slack messages have been edited and cache is stale
  //
  // This is a simple command that just clears the cache and shows a notification
  // ============================================================================
  context.subscriptions.push(
    vscode.commands.registerCommand("slackoscope.clearCache", () => {
      // CLEAR CACHE
      messageCache.clear()

      // SHOW NOTIFICATION
      // vscode.window.showInformationMessage = show blue notification popup
      // Like: Rails flash[:notice] = "Cache cleared"
      vscode.window.showInformationMessage("Slackoscope: Message cache cleared")
    })
  )
}

// ============================================================================
// DEACTIVATE FUNCTION
// ============================================================================
// This is called when the extension is deactivated
// Like: Rails' at_exit or ensure block
//
// WHY IS IT EMPTY?
// - All cleanup is handled automatically via context.subscriptions
// - We pushed all disposables to context.subscriptions
// - VS Code will call .dispose() on them automatically
//
// IF WE HAD MANUAL CLEANUP:
//   export function deactivate() {
//     // Close database connections
//     // Cancel pending API requests
//     // Save state to disk
//   }
// ============================================================================
export function deactivate() {}
