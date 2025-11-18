import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {LinearApi} from '../api/linearApi'
import type {CacheManager} from '../cache/cacheManager'
import type {SettingsManager} from '../ui/settingsManager'
import {formatRelativeTime, extractLinearIssueFromMessage} from '../ui/formatting'
import type {SlackUser, SlackChannel, ParsedSlackUrl} from '../types/slack'

export class HoverProvider implements vscode.HoverProvider {
  constructor(
    private slackApi: SlackApi,
    private cacheManager: CacheManager,
    private settingsManager: SettingsManager,
    private linearApi: LinearApi | null = null
  ) {}

  updateApi(api: SlackApi): void {
    this.slackApi = api
  }

  updateLinearApi(api: LinearApi | null): void {
    this.linearApi = api
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const parsed = this.findSlackUrlAtPosition(document, position)
    if (!parsed) return null

    console.log('=== HOVER TRIGGERED ===')
    console.log('URL:', parsed.fullUrl)
    console.log('Is thread:', !!parsed.threadTs)

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

      console.log('=== FINAL MARKDOWN ===')
      console.log(markdown.value)

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
    const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
    let message = this.cacheManager.getMessage(cacheKey)

    if (!message) {
      message = await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
      this.cacheManager.setMessage(cacheKey, message)
    }

    // Channel name
    if (this.settingsManager.hover.showChannel) {
      const channel = await this.fetchChannel(parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(`${channelIcon} **#${channel.name}**\n\n`)
    }

    // User name + timestamp
    const user = await this.fetchUser(message.user)
    const relativeTime = formatRelativeTime(new Date(parseFloat(message.ts) * 1000))
    markdown.appendMarkdown(`**@${user.displayName}** (${relativeTime}):\n\n`)

    // Message text
    markdown.appendMarkdown(`> ${message.text}\n\n`)

    // Files
    if (this.settingsManager.hover.showFiles && message.files && message.files.length > 0) {
      markdown.appendMarkdown(`\n📎 **Files**:\n\n`)

      for (const file of message.files) {
        console.log('Rendering file - FULL OBJECT:', file)
        console.log('Rendering file:', {name: file.name, url: file.url, mimetype: file.mimetype, size: file.size})

        // Image preview
        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        // File info
        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        if (this.settingsManager.hover.showFileInfo) {
          const sizeKb = Math.round(file.size / 1024)
          const linkMarkdown = `${icon} [**${file.name}**](${file.url}) (${sizeKb} KB)\n\n`
          console.log('File link markdown:', linkMarkdown)
          markdown.appendMarkdown(linkMarkdown)
        } else {
          const linkMarkdown = `${icon} [**${file.name}**](${file.url})\n\n`
          console.log('File link markdown (no info):', linkMarkdown)
          markdown.appendMarkdown(linkMarkdown)
        }
      }
    }

    // Check for Linear issues (including from bot messages)
    const linearIssueId = extractLinearIssueFromMessage(message)
    console.log('Linear issue ID extracted:', linearIssueId, 'Linear API available:', !!this.linearApi)
    if (linearIssueId && this.linearApi) {
      let issue = this.cacheManager.getLinearIssue(linearIssueId)

      if (!issue) {
        try {
          console.log('Fetching Linear issue:', linearIssueId)
          issue = await this.linearApi.getIssueByIdentifier(linearIssueId)
          this.cacheManager.setLinearIssue(linearIssueId, issue)
          console.log('Linear issue fetched:', issue)
        } catch (error) {
          console.error('Failed to fetch Linear issue:', error)
        }
      }

      if (issue) {
        markdown.appendMarkdown(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"\n`)
        markdown.appendMarkdown(`Status: ${issue.state.name}\n\n`)
      }
    } else if (linearIssueId && !this.linearApi) {
      console.warn('Linear issue found but Linear API not initialized')
    }

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
    const cacheKey = parsed.threadTs!
    let thread = this.cacheManager.getThread(cacheKey)

    if (!thread) {
      thread = await this.slackApi.getThread(parsed.channelId, parsed.threadTs!)
      this.cacheManager.setThread(cacheKey, thread)
    }

    const {parent, replies} = thread

    // Find the specific message the URL points to
    const allMessages = [parent, ...replies]
    const targetMessage = allMessages.find(m => m.ts === parsed.messageTs) || parent

    // Channel name
    if (this.settingsManager.hover.showChannel) {
      const channel = await this.fetchChannel(parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(`🧵 ${channelIcon} **#${channel.name}**\n\n`)
    }

    // User name + timestamp for the specific message
    const user = await this.fetchUser(targetMessage.user)
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
        console.log('[Thread] Rendering file - FULL OBJECT:', file)
        console.log('[Thread] Rendering file:', {name: file.name, url: file.url, mimetype: file.mimetype, size: file.size})

        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        if (this.settingsManager.hover.showFileInfo) {
          const sizeKb = Math.round(file.size / 1024)
          const linkMarkdown = `${icon} [**${file.name}**](${file.url}) (${sizeKb} KB)\n\n`
          console.log('[Thread] File link markdown:', linkMarkdown)
          markdown.appendMarkdown(linkMarkdown)
        } else {
          const linkMarkdown = `${icon} [**${file.name}**](${file.url})\n\n`
          console.log('[Thread] File link markdown (no info):', linkMarkdown)
          markdown.appendMarkdown(linkMarkdown)
        }
      }
    }

    // Check for Linear issues (including from bot messages)
    const linearIssueId = extractLinearIssueFromMessage(targetMessage)
    console.log('[Thread] Linear issue ID extracted:', linearIssueId, 'Linear API available:', !!this.linearApi)
    if (linearIssueId && this.linearApi) {
      let issue = this.cacheManager.getLinearIssue(linearIssueId)

      if (!issue) {
        try {
          console.log('[Thread] Fetching Linear issue:', linearIssueId)
          issue = await this.linearApi.getIssueByIdentifier(linearIssueId)
          this.cacheManager.setLinearIssue(linearIssueId, issue)
          console.log('[Thread] Linear issue fetched:', issue)
        } catch (error) {
          console.error('[Thread] Failed to fetch Linear issue:', error)
        }
      }

      if (issue) {
        markdown.appendMarkdown(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"\n`)
        markdown.appendMarkdown(`Status: ${issue.state.name}\n\n`)
      }
    } else if (linearIssueId && !this.linearApi) {
      console.warn('[Thread] Linear issue found but Linear API not initialized')
    }

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
    const globalRegex = new RegExp(this.slackApi.SLACK_URL_REGEX.source, 'g')
    const matches = line.text.matchAll(globalRegex)

    for (const match of matches) {
      const startPos = line.range.start.translate(0, match.index!)
      const endPos = startPos.translate(0, match[0].length)
      const range = new vscode.Range(startPos, endPos)

      if (range.contains(position)) {
        return this.slackApi.parseSlackUrl(match[0])
      }
    }

    return null
  }

  private async fetchUser(userId: string): Promise<SlackUser> {
    let user = this.cacheManager.getUser(userId)
    if (!user) {
      user = await this.slackApi.getUser(userId)
      this.cacheManager.setUser(userId, user)
    }
    return user
  }

  private async fetchChannel(channelId: string): Promise<SlackChannel> {
    let channel = this.cacheManager.getChannel(channelId)
    if (!channel) {
      channel = await this.slackApi.getChannel(channelId)
      this.cacheManager.setChannel(channelId, channel)
    }
    return channel
  }
}
