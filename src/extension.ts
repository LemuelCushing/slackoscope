import * as vscode from "vscode"
import {SlackApi, SLACK_URL_REGEX} from "./slackApi"

// Simple in-memory cache that clears on extension reload
const messageCache = new Map<string, string>()

export function activate(context: vscode.ExtensionContext) {
  console.log("Slackoscope is now active!")

  const slackApi = new SlackApi()

  // Register the hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("*", {
      async provideHover(document, position) {
        const range = document.getWordRangeAtPosition(position, SLACK_URL_REGEX)
        if (!range) {
          return
        }

        const slackUrl = document.getText(range)
        let messageContent = messageCache.get(slackUrl)
        if (!messageContent) {
          messageContent = await slackApi.getMessageContent(slackUrl)
          messageCache.set(slackUrl, messageContent)
        }

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
  const inlineMessageDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      margin: "0 0 0 1em",
      textDecoration: "none; opacity: 0.7;"
    }
  })

  const toggleInlineMessageDisposable = vscode.commands.registerCommand("slackoscope.toggleInlineMessage", async () => {
    const editor = vscode.window.activeTextEditor
    if (editor) {
      const document = editor.document
      const decorations: vscode.DecorationOptions[] = []

      const text = document.getText()
      let match
      while ((match = SLACK_URL_REGEX.exec(text))) {
        const startPos = document.positionAt(match.index)
        const endPos = document.positionAt(match.index + match[0].length)
        const range = new vscode.Range(startPos, endPos)

        const slackUrl = match[0]
        let messageContent = messageCache.get(slackUrl)
        if (!messageContent) {
          messageContent = await slackApi.getMessageContent(slackUrl)
          messageCache.set(slackUrl, messageContent)
        }

        decorations.push({
          range,
          renderOptions: {
            after: {
              contentText: `  |  ${messageContent}`
            }
          }
        })
      }

      editor.setDecorations(inlineMessageDecorationType, decorations)
    }
  })

  context.subscriptions.push(toggleInlineMessageDisposable)

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
      let messageContent = messageCache.get(url)
      if (!messageContent) {
        messageContent = await slackApi.getMessageContent(url)
        messageCache.set(url, messageContent)
      }

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
