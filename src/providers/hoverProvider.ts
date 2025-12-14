import * as vscode from "vscode"
import type {ISlackApi} from "../api/slackApi"
import type {ILinearApi} from "../api/linearApi"
import type {CacheManager} from "../cache/cacheManager"
import type {SettingsManager} from "../ui/settingsManager"
import {formatRelativeTime} from "../ui/formatting"
import {extractLinearIssueFromMessage, cacheLinearMetadataFromMessages} from "../services/linearMetadata"
import type {ParsedSlackUrl} from "../types/slack"
import {getOrFetchChannel, getOrFetchMessage, getOrFetchThread, getOrFetchUser} from "../services/slackData"
import {pickSlackUrlMatchForLine} from "../lib/slackUrl"

export class HoverProvider implements vscode.HoverProvider {
  constructor(
    private slackApi: ISlackApi,
    private cacheManager: CacheManager,
    private settingsManager: SettingsManager,
    private linearApi: ILinearApi | null = null
  ) {}

  updateApi(api: ISlackApi): void {
    this.slackApi = api
  }

  updateLinearApi(api: ILinearApi | null): void {
    this.linearApi = api
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const parsed = this.findSlackUrlAtPosition(document, position)
    if (!parsed) return null

    try {
      const markdown = new vscode.MarkdownString()
      markdown.isTrusted = true
      markdown.supportHtml = true

      // Handle thread URLs
      if (parsed.threadTs) {
        await this.buildThreadHover(markdown, parsed)
      } else {
        await this.buildMessageHover(markdown, parsed)
      }

      return new vscode.Hover(markdown)
    } catch (error) {
      console.error('Hover error:', error)
      if (error instanceof Error) {
        const errorMarkdown = new vscode.MarkdownString()
        errorMarkdown.appendMarkdown(`⚠️ **Error**: ${error.message}`)
        return new vscode.Hover(errorMarkdown)
      }
      return null
    }
  }

  private async buildMessageHover(markdown: vscode.MarkdownString, parsed: ParsedSlackUrl): Promise<void> {
    const message = await getOrFetchMessage(this.slackApi, this.cacheManager, parsed.channelId, parsed.messageTs)

    // Channel name
    if (this.settingsManager.hover.showChannel) {
      const channel = await getOrFetchChannel(this.slackApi, this.cacheManager, parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(`${channelIcon} **#${channel.name}**\n\n`)
    }

    // User name + timestamp
    const user = await getOrFetchUser(this.slackApi, this.cacheManager, message.user)
    const relativeTime = formatRelativeTime(new Date(parseFloat(message.ts) * 1000))
    markdown.appendMarkdown(`**@${user.displayName}** (${relativeTime}):\n\n`)

    // Message text
    markdown.appendMarkdown(`> ${message.text}\n\n`)

    // Files
    if (this.settingsManager.hover.showFiles && message.files && message.files.length > 0) {
      markdown.appendMarkdown(`\n📎 **Files**:\n\n`)

      for (const file of message.files) {
        // Image preview
        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        // File info
        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        // Slack uses different URL fields - prefer url_private_download > url_private > permalink > url
        const fileUrl = file.url_private_download || file.url_private || file.permalink || file.url

        if (this.settingsManager.hover.showFileInfo) {
          const sizeKb = Math.round(file.size / 1024)
          markdown.appendMarkdown(`${icon} [**${file.name}**](${fileUrl}) (${sizeKb} KB)\n\n`)
        } else {
          markdown.appendMarkdown(`${icon} [**${file.name}**](${fileUrl})\n\n`)
        }
      }
    }

    // Check for Linear issues (including from bot messages)
    // Collect all messages to check (message + thread replies if available)
    const allMessages = [message]

    // First check the message itself
    let linearIssueId = extractLinearIssueFromMessage(message)

    // Check if this message might have a thread by attempting to fetch replies
    // (Messages that are thread parents have replies even if accessed without ?thread_ts parameter)
    if (!linearIssueId) {
      try {
        const thread = await getOrFetchThread(this.slackApi, this.cacheManager, parsed.channelId, message.ts)
        if (thread.replies.length > 0) {
          allMessages.push(...thread.replies)
          // Check each reply for Linear Asks bot
          for (const reply of thread.replies) {
            const replyLinearId = extractLinearIssueFromMessage(reply)
            if (replyLinearId) {
              linearIssueId = replyLinearId
              break
            }
          }
        }
      } catch {
        // Not a thread parent or error fetching - that's okay
      }
    }

    if (linearIssueId && this.linearApi) {
      let issue = this.cacheManager.getLinearIssue(linearIssueId)

      if (!issue) {
        try {
          issue = await this.linearApi.getIssueByIdentifier(linearIssueId)
          this.cacheManager.setLinearIssue(linearIssueId, issue)
        } catch (error) {
          console.error("Failed to fetch Linear issue:", error)
        }
      }

      if (issue) {
        markdown.appendMarkdown(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"\n`)
        markdown.appendMarkdown(`Status: ${issue.state.name}\n\n`)
      }
    }

    // Cache URL metadata for code actions (we already have the messages)
    await cacheLinearMetadataFromMessages(parsed.fullUrl, allMessages, this.linearApi, this.cacheManager)

    // Command links
    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl}))})`
    )

    // Add Linear command if issue found
    if (linearIssueId && this.linearApi) {
      const issue = this.cacheManager.getLinearIssue(linearIssueId)
      if (issue) {
        markdown.appendMarkdown(
          ` | [Post Current File to ${issue.identifier}](command:slackoscope.postToLinear?${encodeURIComponent(JSON.stringify({issueId: issue.id, identifier: issue.identifier}))})`
        )
      }
    }
  }

  private async buildThreadHover(markdown: vscode.MarkdownString, parsed: ParsedSlackUrl): Promise<void> {
    const thread = await getOrFetchThread(this.slackApi, this.cacheManager, parsed.channelId, parsed.threadTs!)

    const {parent, replies} = thread

    // Find the specific message the URL points to
    const allMessages = [parent, ...replies]
    const targetMessage = allMessages.find(m => m.ts === parsed.messageTs) || parent

    // Channel name
    if (this.settingsManager.hover.showChannel) {
      const channel = await getOrFetchChannel(this.slackApi, this.cacheManager, parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(`🧵 ${channelIcon} **#${channel.name}**\n\n`)
    }

    // User name + timestamp for the specific message
    const user = await getOrFetchUser(this.slackApi, this.cacheManager, targetMessage.user)
    const relativeTime = formatRelativeTime(new Date(parseFloat(targetMessage.ts) * 1000))
    const isReply = targetMessage.ts !== parent.ts
    const label = isReply ? `Thread reply by` : `Thread started by`
    markdown.appendMarkdown(`**${label} @${user.displayName}** (${relativeTime}):\n\n`)

    // Message text
    markdown.appendMarkdown(`> ${targetMessage.text}\n\n`)

    // Thread context
    if (replies.length > 0) {
      markdown.appendMarkdown(`_Part of thread with ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}_\n\n`)
    }

    // Files from this specific message
    if (this.settingsManager.hover.showFiles && targetMessage.files && targetMessage.files.length > 0) {
      markdown.appendMarkdown(`\n📎 **Files**:\n\n`)

      for (const file of targetMessage.files) {
        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        // Slack uses different URL fields - prefer url_private_download > url_private > permalink > url
        const fileUrl = file.url_private_download || file.url_private || file.permalink || file.url

        if (this.settingsManager.hover.showFileInfo) {
          const sizeKb = Math.round(file.size / 1024)
          markdown.appendMarkdown(`${icon} [**${file.name}**](${fileUrl}) (${sizeKb} KB)\n\n`)
        } else {
          markdown.appendMarkdown(`${icon} [**${file.name}**](${fileUrl})\n\n`)
        }
      }
    }

    // Check for Linear issues (including from bot messages)
    // First check the target message
    let linearIssueId = extractLinearIssueFromMessage(targetMessage)

    // If not found in target message, search through all messages in the thread
    if (!linearIssueId) {
      for (const message of allMessages) {
        const messageLinearId = extractLinearIssueFromMessage(message)
        if (messageLinearId) {
          linearIssueId = messageLinearId
          break
        }
      }
    }

    if (linearIssueId && this.linearApi) {
      let issue = this.cacheManager.getLinearIssue(linearIssueId)

      if (!issue) {
        try {
          issue = await this.linearApi.getIssueByIdentifier(linearIssueId)
          this.cacheManager.setLinearIssue(linearIssueId, issue)
        } catch (error) {
          console.error("Failed to fetch Linear issue:", error)
        }
      }

      if (issue) {
        markdown.appendMarkdown(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"\n`)
        markdown.appendMarkdown(`Status: ${issue.state.name}\n\n`)
      }
    }

    // Cache URL metadata for code actions (we already have the messages)
    await cacheLinearMetadataFromMessages(parsed.fullUrl, allMessages, this.linearApi, this.cacheManager)

    // Command links - pass the specific message, not the whole thread
    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl}))})`
    )

    // Add Linear command if issue found
    if (linearIssueId && this.linearApi) {
      const issue = this.cacheManager.getLinearIssue(linearIssueId)
      if (issue) {
        markdown.appendMarkdown(
          ` | [Post Current File to ${issue.identifier}](command:slackoscope.postToLinear?${encodeURIComponent(JSON.stringify({issueId: issue.id, identifier: issue.identifier}))})`
        )
      }
    }
  }

  private findSlackUrlAtPosition(document: vscode.TextDocument, position: vscode.Position): ParsedSlackUrl | null {
    const line = document.lineAt(position.line)
    return pickSlackUrlMatchForLine(this.slackApi, line, position)?.parsed ?? null
  }
}
