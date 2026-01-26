/**
 * claimAndClose command - Post file, assign to self, and set to done in one action.
 */

import * as vscode from "vscode"
import type {ILinearClient, LinearComment, LinearWorkflowState} from "../../linear"
import type {Settings} from "../config"

const SLACKOSCOPE_SIGNATURE = "_Posted from VS Code via [Slackoscope]"

interface ClaimAndCloseArgs {
  issueId: string
  identifier: string
}

export async function claimAndClose(
  linearClient: ILinearClient | null,
  settings: Settings,
  args: ClaimAndCloseArgs
): Promise<void> {
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
    // Step 1: Post comment (with duplicate detection)
    const existingComment = await findExistingSlackoscopeComment(linearClient, args.issueId)

    if (existingComment) {
      const action = await promptForExistingComment(existingComment, fileContent)
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
