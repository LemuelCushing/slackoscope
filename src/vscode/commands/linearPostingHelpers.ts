/**
 * Shared helpers for Linear posting commands (postToLinear, claimAndClose).
 */

import * as vscode from "vscode"
import type {ILinearClient, LinearComment} from "../../linear"

export const SLACKOSCOPE_SIGNATURE = "_Posted from VS Code via [Slackoscope]"

export const LINEAR_NOT_CONFIGURED =
  "Linear integration not configured. Set slackoscope.linearToken in VS Code Settings."

export function buildCommentBody(content: string, language: string): string {
  return `\`\`\`${language}
${content}
\`\`\`

_Posted from VS Code via [Slackoscope](https://marketplace.visualstudio.com/items?itemName=LemuelCushing.slackoscope)_`
}

export async function findExistingSlackoscopeComment(
  client: ILinearClient,
  issueId: string
): Promise<LinearComment | null> {
  const viewer = await client.getViewer()
  const comments = await client.getComments(issueId)

  return (
    comments.find(
      c => c.user?.id === viewer.id && c.body.includes(SLACKOSCOPE_SIGNATURE)
    ) ?? null
  )
}

export async function promptForExistingComment(
  existing: LinearComment,
  currentContent: string
): Promise<"update" | "add" | null> {
  const existingContent = extractCodeFromComment(existing.body)
  const isSameContent = existingContent === currentContent

  if (isSameContent) {
    const result = await vscode.window.showWarningMessage(
      "This file has already been posted to this issue with identical content.",
      "Post Anyway",
      "Cancel"
    )
    return result === "Post Anyway" ? "add" : null
  }

  const result = await vscode.window.showQuickPick(
    [
      {label: "Update existing comment", description: "Replace the previous Slackoscope comment", value: "update"},
      {label: "Add new comment", description: "Keep the old comment and add a new one", value: "add"},
      {label: "Cancel", value: "cancel"},
    ],
    {placeHolder: "A Slackoscope comment already exists on this issue"}
  )

  if (!result || result.value === "cancel") return null
  return result.value as "update" | "add"
}

export function extractCodeFromComment(body: string): string {
  const match = body.match(/```\w*\n([\s\S]*?)```/)
  return match?.[1] ?? ""
}

/**
 * Resolve content to post based on editor state and settings.
 *
 * - If text is selected, returns the selection.
 * - If `postFromUrlLine` is enabled and `fromLine` is provided, shows a quick pick.
 * - Otherwise, returns the entire file.
 */
export async function resolvePostContent(
  editor: vscode.TextEditor,
  fromLine?: number,
  postFromUrlLine?: boolean
): Promise<string | null> {
  const {document, selection} = editor

  // Selection takes priority — no picker
  if (!selection.isEmpty) {
    return document.getText(selection)
  }

  // Show picker when setting is enabled and we know which line the URL is on
  if (postFromUrlLine && fromLine !== undefined) {
    const fromLineToEnd = document.getText(
      new vscode.Range(fromLine, 0, document.lineCount, 0)
    )

    const picked = await vscode.window.showQuickPick(
      [
        {label: "From this line to end", description: `Lines ${fromLine + 1}–${document.lineCount}`, value: "fromLine"},
        {label: "Entire file", description: document.fileName.split("/").pop(), value: "entireFile"},
        {label: "Cancel", value: "cancel"},
      ],
      {placeHolder: "What content to post?"}
    )

    if (!picked || picked.value === "cancel") return null
    return picked.value === "fromLine" ? fromLineToEnd : document.getText()
  }

  // Fallback: entire file
  return document.getText()
}
