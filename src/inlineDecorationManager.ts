import * as vscode from "vscode"
import {SLACK_URL_REGEX} from "./slackApi"

export interface MessageFetcher {
  getMessageContent(url: string): Promise<string>
}

export class InlineDecorationManager {
  private isActive = false
  private decorationType: vscode.TextEditorDecorationType | null = null
  private statusBarItem: vscode.StatusBarItem
  private readonly messageFetcher: MessageFetcher

  constructor(messageFetcher: MessageFetcher) {
    this.messageFetcher = messageFetcher
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
    this.statusBarItem.command = "slackoscope.toggleInlineMessage"
    this.statusBarItem.tooltip = "Toggle Slack inline messages"
    this.updateStatusBar()
  }

  /**
   * Toggle inline message decorations on/off
   * Returns true if decorations are now active, false if they were disabled
   */
  async toggle(editor: vscode.TextEditor | undefined): Promise<boolean> {
    if (!editor) {
      vscode.window.showWarningMessage("No active editor")
      return this.isActive
    }

    if (this.isActive) {
      this.disable(editor)
      return false
    } else {
      await this.enable(editor)
      return true
    }
  }

  /**
   * Enable inline decorations for the given editor
   */
  private async enable(editor: vscode.TextEditor): Promise<void> {
    // Clean up any existing decorations first
    this.clearDecorations(editor)

    // Create new decoration type
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: "0 0 0 1em",
        textDecoration: "none; opacity: 0.7;",
        color: new vscode.ThemeColor("editorCodeLens.foreground")
      }
    })

    const decorations = await this.findSlackUrlDecorations(editor.document)
    editor.setDecorations(this.decorationType, decorations)

    this.isActive = true
    this.updateStatusBar()
  }

  /**
   * Disable inline decorations for the given editor
   */
  private disable(editor: vscode.TextEditor): void {
    this.clearDecorations(editor)
    this.isActive = false
    this.updateStatusBar()
  }

  /**
   * Clear all decorations and dispose of the decoration type
   */
  private clearDecorations(editor: vscode.TextEditor): void {
    if (this.decorationType) {
      editor.setDecorations(this.decorationType, [])
      this.decorationType.dispose()
      this.decorationType = null
    }
  }

  /**
   * Find all Slack URLs in the document and create decoration options
   */
  private async findSlackUrlDecorations(document: vscode.TextDocument): Promise<vscode.DecorationOptions[]> {
    const decorations: vscode.DecorationOptions[] = []
    const text = document.getText()
    const globalRegex = new RegExp(SLACK_URL_REGEX.source, "g")
    const matches = text.matchAll(globalRegex)

    const urlPromises: Promise<{range: vscode.Range; url: string; content: string}>[] = []

    for (const match of matches) {
      const startPos = document.positionAt(match.index!)
      const endPos = document.positionAt(match.index! + match[0].length)
      const range = new vscode.Range(startPos, endPos)
      const slackUrl = match[0]

      // Fetch message content (will use cache if available)
      urlPromises.push(
        this.messageFetcher.getMessageContent(slackUrl).then(content => ({
          range,
          url: slackUrl,
          content
        }))
      )
    }

    // Wait for all messages to be fetched
    const results = await Promise.all(urlPromises)

    // Create decorations from results
    for (const {range, content} of results) {
      // Truncate long messages for inline display
      const truncatedContent = this.truncateMessage(content)

      decorations.push({
        range,
        renderOptions: {
          after: {
            contentText: `  |  ${truncatedContent}`
          }
        }
      })
    }

    return decorations
  }

  /**
   * Truncate long messages for inline display
   */
  private truncateMessage(message: string, maxLength = 100): string {
    // Replace newlines with spaces
    const singleLine = message.replace(/\n/g, " ")

    // Truncate if too long
    if (singleLine.length > maxLength) {
      return singleLine.substring(0, maxLength) + "..."
    }

    return singleLine
  }

  /**
   * Update the status bar item based on active state
   */
  private updateStatusBar(): void {
    if (this.isActive) {
      this.statusBarItem.text = "$(eye) Slack"
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground")
      this.statusBarItem.show()
    } else {
      this.statusBarItem.text = "$(eye-closed) Slack"
      this.statusBarItem.backgroundColor = undefined
      this.statusBarItem.show()
    }
  }

  /**
   * Get the current active state
   */
  getIsActive(): boolean {
    return this.isActive
  }

  /**
   * Refresh decorations if currently active
   */
  async refresh(editor: vscode.TextEditor | undefined): Promise<void> {
    if (this.isActive && editor) {
      await this.enable(editor)
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    if (this.decorationType) {
      this.decorationType.dispose()
      this.decorationType = null
    }
    this.statusBarItem.dispose()
    this.isActive = false
  }
}
