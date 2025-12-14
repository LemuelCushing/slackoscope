import * as vscode from "vscode"
import type {ISlackApi} from "../api/slackApi"
import type {ILinearApi} from "../api/linearApi"
import type {CacheManager} from "../cache/cacheManager"
import {ensureUrlMetadataPopulated, type LinearUrlMetadata} from "../services/linearMetadata"

export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(
    private slackApi: ISlackApi,
    private cacheManager: CacheManager,
    private linearApi: ILinearApi | null = null
  ) {}

  updateApi(api: ISlackApi): void {
    this.slackApi = api
  }

  updateLinearApi(api: ILinearApi | null): void {
    this.linearApi = api
  }

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = []

    // Check if cursor is on a Slack URL
    const position = range.start
    const line = document.lineAt(position.line)
    const globalRegex = new RegExp(this.slackApi.SLACK_URL_REGEX.source, "g")
    const matches = line.text.matchAll(globalRegex)

    for (const match of matches) {
      const startPos = line.range.start.translate(0, match.index!)
      const endPos = startPos.translate(0, match[0].length)
      const urlRange = new vscode.Range(startPos, endPos)

      if (urlRange.contains(position)) {
        const url = match[0]

        // Always show insert comment action
        actions.push(this.createInsertCommentAction(url))

        // Ensure URL metadata is cached (will use cache if already populated)
        const metadata = await ensureUrlMetadataPopulated(url, this.slackApi, this.linearApi, this.cacheManager)

        // Conditionally show Linear action if issue found
        if (metadata?.linearIssueId && metadata?.linearIdentifier) {
          actions.push(this.createPostToLinearAction(url, metadata))
        }

        break
      }
    }

    return actions
  }

  private createInsertCommentAction(url: string) {
    const action = new vscode.CodeAction("Slackoscope: Insert as Comment", vscode.CodeActionKind.RefactorInline)

    action.command = {
      title: "Insert Slack Message as Comment",
      command: "slackoscope.insertCommentedMessage",
      arguments: [{url}]
    }
    return action
  }

  private createPostToLinearAction(url: string, metadata: LinearUrlMetadata) {
    // Show specific issue identifier in the action label
    const action = new vscode.CodeAction(
      `Slackoscope: Post to ${metadata.linearIdentifier}`,
      vscode.CodeActionKind.RefactorInline
    )

    action.command = {
      title: `Post to ${metadata.linearIdentifier}`,
      command: "slackoscope.postToLinear",
      arguments: [{url, issueId: metadata.linearIssueId, identifier: metadata.linearIdentifier}]
    }
    return action
  }
}
