/**
 * postToLinear command - Post content as a Linear comment.
 */

import * as vscode from "vscode"
import type {ILinearClient} from "../../linear"
import type {Settings} from "../config"
import {
  LINEAR_NOT_CONFIGURED,
  buildCommentBody,
  findExistingSlackoscopeComment,
  promptForExistingComment,
  resolvePostContent,
} from "./linearPostingHelpers"

interface PostToLinearArgs {
  issueId: string
  identifier: string
  fromLine?: number
}

export async function postToLinear(linearClient: ILinearClient | null, settings: Settings, args: PostToLinearArgs): Promise<void> {
  if (!linearClient) {
    vscode.window.showErrorMessage(`Slackoscope: ${LINEAR_NOT_CONFIGURED}`)
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage("Slackoscope: No active editor")
    return
  }

  const content = await resolvePostContent(editor, args.fromLine, settings.linear.postFromUrlLine)
  if (!content) return // User cancelled

  const language = editor.document.languageId
  const commentBody = buildCommentBody(content, language)

  try {
    const existingComment = await findExistingSlackoscopeComment(linearClient, args.issueId)

    if (existingComment) {
      const action = await promptForExistingComment(existingComment, content)
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
      vscode.window.showInformationMessage(`Slackoscope: Posted to ${args.identifier}`)
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to post to Linear: ${error.message}`)
    }
  }
}
