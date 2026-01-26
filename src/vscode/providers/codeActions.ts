/**
 * CodeActionProvider - Quick actions (Cmd+.) for Slack URLs.
 */

import * as vscode from "vscode"
import type {SlackLoader} from "../../slack"
import type {LinearLoader} from "../../linear"
import {SlackUrlOccurrence} from "../editor"

export class CodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.RefactorInline]

  constructor(
    private slackLoader: SlackLoader,
    private linearLoader: LinearLoader
  ) {}

  updateSlackLoader(loader: SlackLoader): void {
    this.slackLoader = loader
  }

  updateLinearLoader(loader: LinearLoader): void {
    this.linearLoader = loader
  }

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): Promise<vscode.CodeAction[]> {
    const occurrence = SlackUrlOccurrence.at(document, range.start)
    if (!occurrence) return []

    const actions: vscode.CodeAction[] = []
    const {url} = occurrence

    // Always show insert comment action
    actions.push(this.createInsertCommentAction(url.raw))

    // Check for Linear issue
    try {
      const {all} = await this.slackLoader.getMessagesForUrl(url)
      const metadata = await this.linearLoader.getMetadataForUrl(url, all)

      if (metadata) {
        const issue = await this.linearLoader.getIssue(metadata.identifier)
        if (issue) {
          actions.push(
            this.createPostToLinearAction(issue.identifier, issue.id),
            this.createAssignToMeAction(issue.identifier, issue.id),
            this.createSetStatusAction(issue.identifier, issue.id),
            this.createClaimAndCloseAction(issue.identifier, issue.id)
          )
        }
      }
    } catch {
      // Ignore errors - just don't show Linear actions
    }

    return actions
  }

  private createInsertCommentAction(url: string): vscode.CodeAction {
    const action = new vscode.CodeAction("Slack: Insert as Comment", vscode.CodeActionKind.RefactorInline)
    action.command = {
      title: "Insert Slack Message as Comment",
      command: "slackoscope.insertCommentedMessage",
      arguments: [{url}],
    }
    return action
  }

  private createPostToLinearAction(identifier: string, issueId: string): vscode.CodeAction {
    const action = new vscode.CodeAction(`Linear: Post to ${identifier}`, vscode.CodeActionKind.RefactorInline)
    action.command = {
      title: `Post to ${identifier}`,
      command: "slackoscope.postToLinear",
      arguments: [{issueId, identifier}],
    }
    return action
  }

  private createAssignToMeAction(identifier: string, issueId: string): vscode.CodeAction {
    const action = new vscode.CodeAction(`Linear: Assign ${identifier} to Me`, vscode.CodeActionKind.RefactorInline)
    action.command = {
      title: `Assign ${identifier} to Me`,
      command: "slackoscope.assignToMe",
      arguments: [{issueId, identifier}],
    }
    return action
  }

  private createSetStatusAction(identifier: string, issueId: string): vscode.CodeAction {
    const action = new vscode.CodeAction(`Linear: Set ${identifier} Status`, vscode.CodeActionKind.RefactorInline)
    action.command = {
      title: `Set ${identifier} Status`,
      command: "slackoscope.setStatus",
      arguments: [{issueId, identifier}],
    }
    return action
  }

  private createClaimAndCloseAction(identifier: string, issueId: string): vscode.CodeAction {
    const action = new vscode.CodeAction(`Linear: Claim & Close ${identifier}`, vscode.CodeActionKind.RefactorInline)
    action.command = {
      title: `Claim & Close ${identifier}`,
      command: "slackoscope.claimAndClose",
      arguments: [{issueId, identifier}],
    }
    return action
  }
}
