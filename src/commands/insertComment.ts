import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {CacheManager} from '../cache/cacheManager'

const createCommentedSnippet = (message: string): vscode.SnippetString => {
  return new vscode.SnippetString(
    message
      .split('\n')
      .map(line => `$LINE_COMMENT ${line}`)
      .join('\n')
  )
}

export async function insertCommentCommand(
  slackApi: SlackApi,
  cacheManager: CacheManager,
  args: {url: string}
): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('Slackoscope: No active editor')
    return
  }

  try {
    const parsed = slackApi.parseSlackUrl(args.url)
    if (!parsed) {
      vscode.window.showErrorMessage('Slackoscope: Invalid Slack URL')
      return
    }

    let messageContent: string

    // Handle thread reply vs regular message
    // For thread URLs, show only the specific message, not the whole thread
    if (parsed.threadTs) {
      // Fetch the thread
      let thread = cacheManager.getThread(parsed.threadTs)
      if (!thread) {
        thread = await slackApi.getThread(parsed.channelId, parsed.threadTs)
        cacheManager.setThread(parsed.threadTs, thread)
      }

      // Find the specific message in the thread
      const allMessages = [thread.parent, ...thread.replies]
      const targetMessage = allMessages.find(m => m.ts === parsed.messageTs)

      if (targetMessage) {
        messageContent = targetMessage.text
      } else {
        // Fallback to parent if we can't find the specific message
        messageContent = thread.parent.text
      }
    } else {
      // Regular message
      const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
      let message = cacheManager.getMessage(cacheKey)
      if (!message) {
        message = await slackApi.getMessage(parsed.channelId, parsed.messageTs)
        cacheManager.setMessage(cacheKey, message)
      }
      messageContent = message.text
    }

    const commentSnippet = createCommentedSnippet(messageContent)

    // Find the line containing the URL
    const document = editor.document
    let urlLineNumber: number | null = null

    for (let i = 0; i < document.lineCount; i++) {
      if (document.lineAt(i).text.includes(args.url)) {
        urlLineNumber = i
        break
      }
    }

    // Insert after the URL line
    if (urlLineNumber !== null) {
      // Ensure there's a blank line after the URL if needed
      if (urlLineNumber + 1 === document.lineCount || !document.lineAt(urlLineNumber + 1).isEmptyOrWhitespace) {
        const edit = new vscode.WorkspaceEdit()
        edit.insert(document.uri, document.lineAt(urlLineNumber).range.end, '\n')
        await vscode.workspace.applyEdit(edit)
      }
      await editor.insertSnippet(commentSnippet, new vscode.Position(urlLineNumber + 1, 0))
    } else {
      // Fallback: insert at cursor if URL not found
      await editor.insertSnippet(commentSnippet)
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to insert comment: ${error.message}`)
    }
  }
}
