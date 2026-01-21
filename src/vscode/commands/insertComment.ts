/**
 * insertComment command - Insert Slack message as a code comment.
 */

import * as vscode from "vscode"
import {parseSlackUrl, type SlackLoader} from "../../slack"

interface InsertCommentArgs {
  url: string
  lineNumber?: number
}

export async function insertComment(slackLoader: SlackLoader, args: InsertCommentArgs): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage("Slackoscope: No active editor")
    return
  }

  const url = parseSlackUrl(args.url)
  if (!url) {
    vscode.window.showErrorMessage("Slackoscope: Invalid Slack URL")
    return
  }

  try {
    const {target} = await slackLoader.getMessagesForUrl(url)

    // Get the message to insert
    const user = await slackLoader.getUser(target.user)
    const lines = target.text.split("\n")

    // Build the comment content
    const header = `@${user.displayName}:`
    const commentLines = [header, ...lines]

    // Use VS Code snippets for language-agnostic comments
    const snippet = new vscode.SnippetString()
    commentLines.forEach(line => {
      snippet.appendVariable("LINE_COMMENT", "//")
      snippet.appendText(" ")
      snippet.appendText(line)
      snippet.appendText("\n")
    })

    // Insert at the line after the URL (or specified line)
    const line = args.lineNumber ?? editor.selection.active.line
    const position = new vscode.Position(line + 1, 0)

    await editor.insertSnippet(snippet, position)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
    }
  }
}
