/**
 * postToLinear command - Post current file as a Linear comment.
 */

import * as vscode from "vscode"
import type {ILinearClient} from "../../linear"

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

  const commentBody = `
\`\`\`${language}
${fileContent}
\`\`\`

_Posted from VS Code via [Slackoscope](https://marketplace.visualstudio.com/items?itemName=LemuelCushing.slackoscope)_
  `.trim()

  try {
    await linearClient.createComment(args.issueId, commentBody)
    vscode.window.showInformationMessage(`Slackoscope: Posted file to ${args.identifier}`)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to post to Linear: ${error.message}`)
    }
  }
}
