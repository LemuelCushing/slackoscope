import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {LinearApi} from '../api/linearApi'
import type {CacheManager} from '../cache/cacheManager'
import type {SettingsManager} from '../ui/settingsManager'
import {formatRelativeTime, findLinearIssues} from '../ui/formatting'
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
        // Image preview
        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        // File info
        const sizeKb = Math.round(file.size / 1024)
        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        markdown.appendMarkdown(`${icon} **${file.name}** (${sizeKb} KB)\n`)
        markdown.appendMarkdown(`[View](${file.url})\n\n`)
      }
    }

    // Command links
    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl}))})`
    )
  }

  private async buildThreadHover(markdown: vscode.MarkdownString, parsed: ParsedSlackUrl): Promise<void> {
    const cacheKey = parsed.threadTs!
    let thread = this.cacheManager.getThread(cacheKey)

    if (!thread) {
      thread = await this.slackApi.getThread(parsed.channelId, parsed.threadTs!)
      this.cacheManager.setThread(cacheKey, thread)
    }

    const {parent, replies} = thread

    // Channel name
    if (this.settingsManager.hover.showChannel) {
      const channel = await this.fetchChannel(parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(
        `🧵 ${channelIcon} **#${channel.name}** - Thread (${replies.length} ${replies.length === 1 ? 'reply' : 'replies'})\n\n`
      )
    } else {
      markdown.appendMarkdown(`🧵 **Thread** (${replies.length} ${replies.length === 1 ? 'reply' : 'replies'})\n\n`)
    }

    // Check for Linear issues
    const allMessages = [parent, ...replies]
    const allText = allMessages.map(m => m.text).join(' ')
    const linearIssues = findLinearIssues(allText)

    if (linearIssues.length > 0 && this.linearApi) {
      // Fetch first Linear issue
      const issueId = linearIssues[0]
      let issue = this.cacheManager.getLinearIssue(issueId)

      if (!issue) {
        try {
          issue = await this.linearApi.getIssueByIdentifier(issueId)
          this.cacheManager.setLinearIssue(issueId, issue)
        } catch (error) {
          console.error('Failed to fetch Linear issue:', error)
        }
      }

      if (issue) {
        markdown.appendMarkdown(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"\n`)
        markdown.appendMarkdown(`Status: ${issue.state.name}\n\n`)
      }
    }

    // Original message
    const parentUser = await this.fetchUser(parent.user)
    markdown.appendMarkdown(`**Original** by **@${parentUser.displayName}**:\n\n`)
    markdown.appendMarkdown(`> ${parent.text}\n\n`)

    // Latest reply
    if (replies.length > 0) {
      const latestReply = replies[replies.length - 1]
      const replyUser = await this.fetchUser(latestReply.user)
      const replyTime = formatRelativeTime(new Date(parseFloat(latestReply.ts) * 1000))

      markdown.appendMarkdown(`**Latest reply** by **@${replyUser.displayName}** (${replyTime}):\n\n`)
      markdown.appendMarkdown(`> ${latestReply.text}\n\n`)
    }

    // Files from parent message
    if (this.settingsManager.hover.showFiles && parent.files && parent.files.length > 0) {
      markdown.appendMarkdown(`\n📎 **Files** (from original message):\n\n`)

      for (const file of parent.files) {
        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        const sizeKb = Math.round(file.size / 1024)
        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        markdown.appendMarkdown(`${icon} **${file.name}** (${sizeKb} KB)\n`)
        markdown.appendMarkdown(`[View](${file.url})\n\n`)
      }
    }

    // Command links
    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl, isThread: true}))})`
    )

    // Add Linear command if issue found
    if (linearIssues.length > 0 && this.linearApi) {
      const issue = this.cacheManager.getLinearIssue(linearIssues[0])
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
