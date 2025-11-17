import * as vscode from "vscode"
import {SlackApi, SLACK_URL_REGEX} from "./slackApi"
import {InlineDecorationManager, MessageFetcher} from "./inlineDecorationManager"

// Simple in-memory cache that clears on extension reload
const messageCache = new Map<string, string>()

// Message fetcher that integrates with the cache
class CachedMessageFetcher implements MessageFetcher {
  constructor(private slackApi: SlackApi) {}

  async getMessageContent(url: string): Promise<string> {
    let messageContent = messageCache.get(url)
    if (!messageContent) {
      messageContent = await this.slackApi.getMessageContent(url)
      messageCache.set(url, messageContent)
    }
    return messageContent
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Slackoscope is now active!")

  const slackApi = new SlackApi()
  const messageFetcher = new CachedMessageFetcher(slackApi)

  // Create inline decoration manager
  const inlineDecorationManager = new InlineDecorationManager(messageFetcher)
  context.subscriptions.push(inlineDecorationManager)

  // Register the hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("*", {
      async provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, SLACK_URL_REGEX)
        if (!range) {
          return
        }

        const slackUrl = document.getText(range)
        const messageContent = await messageFetcher.getMessageContent(slackUrl)

        const hoverMessage = new vscode.MarkdownString(`**Slack Message:** ${messageContent}`)
        hoverMessage.isTrusted = true
        const jsonParams = JSON.stringify({url: slackUrl, lineNumber: position.line})
        const insertCommandUrl = `command:slackoscope.insertCommentedMessage?${encodeURIComponent(jsonParams)}`
        hoverMessage.appendMarkdown(`\n\n[Insert Commented Message](${insertCommandUrl})`)

        return new vscode.Hover(hoverMessage)
      }
    })
  )

  // Register a command to toggle inline message display
  context.subscriptions.push(
    vscode.commands.registerCommand("slackoscope.toggleInlineMessage", async () => {
      const editor = vscode.window.activeTextEditor
      await inlineDecorationManager.toggle(editor)
    })
  )

  // Since getLnanguageConfiguration is not available in the API, we can lean into on
  // snippet insertion to handle comments. For now, we will always use multiple line comments
  const createCommentedSnippet = (message: string): vscode.SnippetString => {
    return new vscode.SnippetString(
      message
        .split("\n")
        .map(line => `$LINE_COMMENT ${line}`)
        .join("\n")
    )
  }

  const insertCommentedMessageHandler = async ({url, lineNumber}: {url: string; lineNumber: number}) => {
    const editor = vscode.window.activeTextEditor
    if (editor) {
      const document = editor.document
      const messageContent = await messageFetcher.getMessageContent(url)

      const commentSnippet = createCommentedSnippet(messageContent)

      if (lineNumber + 1 === document.lineCount || !document.lineAt(lineNumber + 1).isEmptyOrWhitespace) {
        const edit = new vscode.WorkspaceEdit()
        edit.insert(document.uri, document.lineAt(lineNumber).range.end, "\n")
        await vscode.workspace.applyEdit(edit)
      }
      editor.insertSnippet(commentSnippet, new vscode.Position(lineNumber + 1, 0))
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("slackoscope.insertCommentedMessage", insertCommentedMessageHandler)
  )

  // Register command to clear cache
  context.subscriptions.push(
    vscode.commands.registerCommand("slackoscope.clearCache", () => {
      messageCache.clear()
      vscode.window.showInformationMessage("Slackoscope: Message cache cleared")
    })
  )
}

export function deactivate() {}
