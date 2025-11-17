import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {CacheManager} from '../cache/cacheManager'

export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(
    private slackApi: SlackApi,
    private cacheManager: CacheManager
  ) {}

  updateApi(api: SlackApi): void {
    this.slackApi = api
  }

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = []

    // Check if cursor is on a Slack URL
    const position = range.start
    const line = document.lineAt(position.line)
    const matches = line.text.matchAll(this.slackApi.SLACK_URL_REGEX)

    for (const match of matches) {
      const startPos = line.range.start.translate(0, match.index!)
      const endPos = startPos.translate(0, match[0].length)
      const urlRange = new vscode.Range(startPos, endPos)

      if (urlRange.contains(position)) {
        const action = new vscode.CodeAction('Slackoscope: Insert as Comment', vscode.CodeActionKind.RefactorInline)

        action.command = {
          title: 'Insert Slack Message as Comment',
          command: 'slackoscope.insertCommentedMessage',
          arguments: [{url: match[0]}]
        }

        actions.push(action)
        break
      }
    }

    return actions
  }
}
