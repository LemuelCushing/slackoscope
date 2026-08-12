/**
 * claimAndClose command - Post content, assign to self, and set to done in one action.
 */

import * as vscode from "vscode"
import type {ILinearClient, LinearWorkflowState} from "../../linear"
import type {Settings} from "../config"
import {
  LINEAR_NOT_CONFIGURED,
  buildCommentBody,
  findExistingSlackoscopeComment,
  promptForExistingComment,
  resolvePostContent,
} from "./linearPostingHelpers"

interface ClaimAndCloseArgs {
  issueId: string
  identifier: string
  fromLine?: number
}

export async function claimAndClose(
  linearClient: ILinearClient | null,
  settings: Settings,
  args: ClaimAndCloseArgs
): Promise<void> {
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
    // Step 1: Post comment (with duplicate detection)
    const existingComment = await findExistingSlackoscopeComment(linearClient, args.issueId)

    if (existingComment) {
      const action = await promptForExistingComment(existingComment, content)
      if (!action) return

      if (action === "update") {
        await linearClient.updateComment(existingComment.id, commentBody)
      } else {
        await linearClient.createComment(args.issueId, commentBody)
      }
    } else {
      await linearClient.createComment(args.issueId, commentBody)
    }

    // Step 2: Assign to current user
    const viewer = await linearClient.getViewer()
    await linearClient.assignIssue(args.issueId, viewer.id)

    // Step 3: Set to done status
    const doneStateId = await resolveDoneStateId(linearClient, settings, args.issueId)
    if (!doneStateId) return // User cancelled

    await linearClient.updateIssueState(args.issueId, doneStateId)

    vscode.window.showInformationMessage(`Slackoscope: ${args.identifier} claimed and closed`)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to claim & close: ${error.message}`)
    }
  }
}

async function resolveDoneStateId(
  client: ILinearClient,
  settings: Settings,
  issueId: string
): Promise<string | null> {
  const states = await client.getWorkflowStates(issueId)
  const doneStateTypes = settings.linear.doneStateTypes

  // Find first state matching configured done types
  const doneState = states.find(s => doneStateTypes.includes(s.type))

  if (doneState) {
    return doneState.id
  }

  // No matching state found - show picker
  return promptForStatus(states, "No 'Done' status found. Select status:")
}

async function promptForStatus(
  states: LinearWorkflowState[],
  placeholder: string
): Promise<string | null> {
  // Sort states by type order
  const typeOrder: Record<string, number> = {
    backlog: 0,
    unstarted: 1,
    started: 2,
    completed: 3,
    canceled: 4,
  }
  states.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99))

  const items: vscode.QuickPickItem[] = states.map(state => ({
    label: state.name,
    description: state.type,
    detail: state.id,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: placeholder,
    title: "Set Issue Status",
  })

  return selected?.detail ?? null
}
