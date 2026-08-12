/**
 * setStatus command - Set the status of a Linear issue.
 */

import * as vscode from "vscode"
import type {ILinearClient, LinearWorkflowState, LinearIssue} from "../../linear"
import {LINEAR_NOT_CONFIGURED} from "./linearPostingHelpers"

interface SetStatusArgs {
  issueId: string
  identifier: string
}

export async function setStatus(linearClient: ILinearClient | null, args: SetStatusArgs): Promise<void> {
  if (!linearClient) {
    vscode.window.showErrorMessage(`Slackoscope: ${LINEAR_NOT_CONFIGURED}`)
    return
  }

  try {
    // Get available workflow states for this issue's team
    const states: LinearWorkflowState[] = await linearClient.getWorkflowStates(args.issueId)

    // Sort states by type for a logical order (backlog, unstarted, started, completed, canceled)
    const typeOrder: Record<string, number> = {
      backlog: 0,
      unstarted: 1,
      started: 2,
      completed: 3,
      canceled: 4,
    }
    states.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99))

    // Show quick pick
    const items: vscode.QuickPickItem[] = states.map(state => ({
      label: state.name,
      description: state.type,
      detail: state.id,
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Select status for ${args.identifier}`,
      title: "Set Linear Issue Status",
    })

    if (!selected) return

    // Update the issue state
    const stateId = selected.detail!
    const updatedIssue: LinearIssue = await linearClient.updateIssueState(args.issueId, stateId)

    vscode.window.showInformationMessage(
      `Slackoscope: Updated ${updatedIssue.identifier} status to ${updatedIssue.state.name}`
    )
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
    }
  }
}
