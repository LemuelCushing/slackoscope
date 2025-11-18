import * as vscode from 'vscode'
import type {LinearApi} from '../api/linearApi'

export async function postToLinearCommand(
  linearApi: LinearApi | null,
  args: {issueId: string; identifier: string}
): Promise<void> {
  if (!linearApi) {
    vscode.window.showErrorMessage('Slackoscope: Linear integration not configured. Set slackoscope.linearToken.')
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('Slackoscope: No active editor')
    return
  }

  const document = editor.document
  const fileName = document.fileName.split('/').pop() || 'Untitled'
  const fileContent = document.getText()
  const language = document.languageId

  const commentBody = `
## ${fileName}

\`\`\`${language}
${fileContent}
\`\`\`

_Posted from VS Code via Slackoscope_
  `.trim()

  try {
    await linearApi.createComment(args.issueId, commentBody)
    vscode.window.showInformationMessage(`Slackoscope: Posted file to ${args.identifier}`)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to post to Linear: ${error.message}`)
    }
  }
}
