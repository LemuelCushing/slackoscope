/**
 * insertComment command - Insert Slack message as a code comment.
 */

import * as vscode from "vscode"
import {parseSlackUrl, type SlackLoader} from "../../slack"
import type {LinearLoader} from "../../linear"

interface InsertCommentArgs {
  url: string
  lineNumber?: number
  linearIdentifier?: string
}

interface InsertCommentDeps {
  slackLoader: SlackLoader
  linearLoader: LinearLoader
}

/**
 * Languages with no line-comment token, where `${LINE_COMMENT}` would silently
 * fall back to `//` and write something the document cannot mean. These are
 * prose/unidentified formats, so the message goes in as plain text instead.
 *
 * `plaintext` is also what VS Code reports for files it cannot identify.
 */
const PLAIN_TEXT_LANGUAGES = new Set(["plaintext", "markdown", "log"])

export async function insertComment(deps: InsertCommentDeps, args: InsertCommentArgs): Promise<void> {
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
    const {target, all} = await deps.slackLoader.getMessagesForUrl(url)

    // Get the message to insert
    const user = await deps.slackLoader.getUser(target.user)
    const lines = target.text.split("\n")

    // Check for Linear issue if not already provided
    let linearIdentifier = args.linearIdentifier
    if (!linearIdentifier) {
      const linearMetadata = await deps.linearLoader.getMetadataForUrl(url, all)
      if (linearMetadata) {
        linearIdentifier = linearMetadata.identifier
      }
    }

    // Build the comment content with Linear ticket ID if available
    const linearPrefix = linearIdentifier ? `[${linearIdentifier}] ` : ""
    const header = `${linearPrefix}@${user.displayName}:`
    const commentLines = [header, ...lines]

    const document = editor.document
    const asPlainText = PLAIN_TEXT_LANGUAGES.has(document.languageId)

    // Insert on the line after the URL (or the cursor, if the caller gave no line).
    // At the end of the document there is no following line to target, so append
    // to the last line and lead with a newline instead.
    const anchorLine = args.lineNumber ?? editor.selection.active.line
    const lastLine = document.lineCount - 1
    const atEndOfDocument = anchorLine >= lastLine
    const position = atEndOfDocument ? document.lineAt(lastLine).range.end : new vscode.Position(anchorLine + 1, 0)

    // Use VS Code snippets for language-agnostic comments
    const snippet = new vscode.SnippetString()
    if (atEndOfDocument) snippet.appendText("\n")
    commentLines.forEach((text, i) => {
      if (i > 0) snippet.appendText("\n")
      if (asPlainText) {
        snippet.appendText(text)
      } else {
        snippet.appendVariable("LINE_COMMENT", "//")
        snippet.appendText(` ${text}`)
      }
    })
    if (!atEndOfDocument) snippet.appendText("\n")

    await editor.insertSnippet(snippet, position)

    if (asPlainText) {
      vscode.window.setStatusBarMessage(
        `Slackoscope: '${document.languageId}' has no comment syntax — inserted as plain text`,
        5000
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
    }
  }
}
