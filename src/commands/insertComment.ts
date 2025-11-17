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
  args: {url: string; lineNumber?: number; isThread?: boolean}
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

    // Handle thread vs regular message
    if (parsed.threadTs) {
      const thread = cacheManager.getThread(parsed.threadTs)
      if (thread) {
        // Format thread as multi-line comment
        const lines = [`Thread: ${thread.parent.text}`, '']
        thread.replies.forEach((reply, i) => {
          lines.push(`Reply ${i + 1}: ${reply.text}`)
        })
        messageContent = lines.join('\n')
      } else {
        // Fetch thread
        const fetchedThread = await slackApi.getThread(parsed.channelId, parsed.threadTs)
        cacheManager.setThread(parsed.threadTs, fetchedThread)
        const lines = [`Thread: ${fetchedThread.parent.text}`, '']
        fetchedThread.replies.forEach((reply, i) => {
          lines.push(`Reply ${i + 1}: ${reply.text}`)
        })
        messageContent = lines.join('\n')
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

    // If lineNumber is provided, insert at that line
    // Otherwise, insert at current cursor position
    if (args.lineNumber !== undefined) {
      const document = editor.document
      if (args.lineNumber + 1 === document.lineCount || !document.lineAt(args.lineNumber + 1).isEmptyOrWhitespace) {
        const edit = new vscode.WorkspaceEdit()
        edit.insert(document.uri, document.lineAt(args.lineNumber).range.end, '\n')
        await vscode.workspace.applyEdit(edit)
      }
      await editor.insertSnippet(commentSnippet, new vscode.Position(args.lineNumber + 1, 0))
    } else {
      await editor.insertSnippet(commentSnippet)
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to insert comment: ${error.message}`)
    }
  }
}
