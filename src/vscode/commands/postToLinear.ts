/**
 * postToLinear command - Post current file as a Linear comment.
 */

import * as vscode from "vscode"
import type {ILinearClient, LinearComment} from "../../linear"

const SLACKOSCOPE_SIGNATURE = "_Posted from VS Code via [Slackoscope]"

interface PostToLinearArgs {
  issueId: string
  identifier: string
}

export async function postToLinear(linearClient: ILinearClient | null, args: PostToLinearArgs): Promise<void> {
  if (!linearClient) {
    vscode.window.showErrorMessage("Slackoscope: Linear integration not configured. Set slackoscope.linearToken.")
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage("Slackoscope: No active editor")
    return
  }

  const document = editor.document
  const fileContent = document.getText()
  const language = document.languageId
  const commentBody = buildCommentBody(fileContent, language)

  try {
    const existingComment = await findExistingSlackoscopeComment(linearClient, args.issueId)

    if (existingComment) {
      const action = await promptForExistingComment(existingComment, fileContent)
      if (!action) return

      if (action === "update") {
        await linearClient.updateComment(existingComment.id, commentBody)
        vscode.window.showInformationMessage(`Slackoscope: Updated comment on ${args.identifier}`)
      } else {
        await linearClient.createComment(args.issueId, commentBody)
        vscode.window.showInformationMessage(`Slackoscope: Added new comment to ${args.identifier}`)
      }
    } else {
      await linearClient.createComment(args.issueId, commentBody)
      vscode.window.showInformationMessage(`Slackoscope: Posted file to ${args.identifier}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to post to Linear: ${error.message}`)
    }
  }
}

function buildCommentBody(fileContent: string, language: string): string {
  return `\`\`\`${language}
${fileContent}
\`\`\`

_Posted from VS Code via [Slackoscope](https://marketplace.visualstudio.com/items?itemName=LemuelCushing.slackoscope)_`
}

async function findExistingSlackoscopeComment(
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

async function promptForExistingComment(
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

function extractCodeFromComment(body: string): string {
  const match = body.match(/```\w*\n([\s\S]*?)```/)
  return match?.[1] ?? ""
}
