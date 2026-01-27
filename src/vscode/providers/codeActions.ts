/**
 * CodeActionProvider - Quick actions (Cmd+.) for Slack URLs.
 */

import * as vscode from "vscode"
import type {SlackLoader} from "../../slack"
import type {LinearLoader} from "../../linear"
import {SlackUrlOccurrence} from "../editor"

/** Code action definition */
interface ActionDef {
  title: string
  command: string
  args: Record<string, unknown>
}

/** Create a VS Code CodeAction from a definition */
const toCodeAction = ({title, command, args}: ActionDef): vscode.CodeAction => {
  const action = new vscode.CodeAction(title, vscode.CodeActionKind.RefactorInline)
  action.command = {title, command, arguments: [args]}
  return action
}

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

    const {url} = occurrence
    const actions: ActionDef[] = [
      {title: "Slack: Insert as Comment", command: "slackoscope.insertCommentedMessage", args: {url: url.raw}},
    ]

    // Check for Linear issue
    try {
      const {all} = await this.slackLoader.getMessagesForUrl(url)
      const metadata = await this.linearLoader.getMetadataForUrl(url, all)

      if (metadata) {
        const issue = await this.linearLoader.getIssue(metadata.identifier)
        if (issue) {
          const {id: issueId, identifier} = issue
          actions.push(
            {title: `Linear: Post to ${identifier}`, command: "slackoscope.postToLinear", args: {issueId, identifier}},
            {title: `Linear: Assign ${identifier} to Me`, command: "slackoscope.assignToMe", args: {issueId, identifier}},
            {title: `Linear: Set ${identifier} Status`, command: "slackoscope.setStatus", args: {issueId, identifier}},
            {title: `Linear: Claim & Close ${identifier}`, command: "slackoscope.claimAndClose", args: {issueId, identifier}}
          )
        }
      }
    } catch {
      // Ignore errors - just don't show Linear actions
    }

    return actions.map(toCodeAction)
  }
}
