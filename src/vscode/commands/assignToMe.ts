/**
 * assignToMe command - Assign a Linear issue to the current user.
 */

import * as vscode from "vscode"
import type {ILinearClient, LinearIssue} from "../../linear"

interface AssignToMeArgs {
  issueId: string
  identifier: string
}

export async function assignToMe(linearClient: ILinearClient | null, args: AssignToMeArgs): Promise<void> {
  if (!linearClient) {
    vscode.window.showErrorMessage("Slackoscope: Linear token not configured")
    return
  }

  try {
    // Get current user
    const viewer = await linearClient.getViewer()

    // Assign the issue to the current user
    const updatedIssue: LinearIssue = await linearClient.assignIssue(args.issueId, viewer.id)

    vscode.window.showInformationMessage(`Slackoscope: Assigned ${updatedIssue.identifier} to ${viewer.name}`)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
    }
  }
}
