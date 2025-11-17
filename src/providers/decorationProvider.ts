import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {CacheManager} from '../cache/cacheManager'
import type {SettingsManager} from '../ui/settingsManager'
import {DecorationManager, type DecorationData} from '../ui/decorationManager'
import {formatMessagePreview, formatTimestamp, getMessageAge} from '../ui/formatting'
import type {SlackMessage, SlackUser, SlackChannel} from '../types/slack'

export class DecorationProvider {
  private decorationManager = new DecorationManager()
  private isEnabled = true
  private updateTimeout: NodeJS.Timeout | null = null
  private refreshInterval: NodeJS.Timeout | null = null

  constructor(
    private slackApi: SlackApi,
    private cacheManager: CacheManager,
    private settingsManager: SettingsManager
  ) {
    // Initial update for all visible editors
    vscode.window.visibleTextEditors.forEach(editor => {
      this.updateDecorations(editor)
    })

    // Watch for document/editor changes
    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
      const editor = vscode.window.activeTextEditor
      if (editor && e.document === editor.document) {
        this.scheduleUpdate(editor)
      }
    })

    vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
      if (editor) {
        this.updateDecorations(editor)
      }
    })

    // Watch for settings changes
    settingsManager.onDidChange(() => {
      this.decorationManager.dispose()
      this.decorationManager = new DecorationManager()

      // Restart auto-refresh if needed
      if (this.settingsManager.inline.useRelativeTime) {
        this.startAutoRefresh()
      } else {
        this.stopAutoRefresh()
      }

      vscode.window.visibleTextEditors.forEach((editor: vscode.TextEditor) => {
        this.updateDecorations(editor)
      })
    })

    // Auto-refresh relative times if enabled
    if (this.settingsManager.inline.useRelativeTime) {
      this.startAutoRefresh()
    }
  }

  updateApi(api: SlackApi): void {
    this.slackApi = api
  }

  toggle(): void {
    this.isEnabled = !this.isEnabled

    if (this.isEnabled) {
      vscode.window.visibleTextEditors.forEach(editor => {
        this.updateDecorations(editor)
      })
    } else {
      vscode.window.visibleTextEditors.forEach(editor => {
        this.decorationManager.clearInlineDecorations(editor)
        this.decorationManager.clearHighlightDecorations(editor)
        this.decorationManager.clearChannelNameDecorations(editor)
      })
    }
  }

  private scheduleUpdate(editor: vscode.TextEditor): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    this.updateTimeout = setTimeout(() => {
      this.updateDecorations(editor)
    }, 500)
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh()
    this.refreshInterval = setInterval(() => {
      vscode.window.visibleTextEditors.forEach((editor: vscode.TextEditor) => {
        this.updateDecorations(editor)
      })
    }, 60000) // Every minute
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    if (!this.isEnabled) {
      this.decorationManager.clearInlineDecorations(editor)
      this.decorationManager.clearHighlightDecorations(editor)
      return
    }

    const document = editor.document
    const text = document.getText()
    const slackUrls = [...text.matchAll(this.slackApi.SLACK_URL_REGEX)]

    if (slackUrls.length === 0) {
      this.decorationManager.clearInlineDecorations(editor)
      this.decorationManager.clearHighlightDecorations(editor)
      return
    }

    // Fetch all messages concurrently
    const decorationPromises = slackUrls.map(async match => {
      try {
        const parsed = this.slackApi.parseSlackUrl(match[0])
        if (!parsed) return null

        let message: SlackMessage
        let replyCount = 0

        // Check if thread URL
        if (parsed.threadTs) {
          const thread = this.cacheManager.getThread(parsed.threadTs)
          if (thread) {
            message = thread.parent
            replyCount = thread.replies.length
          } else {
            // Fetch thread
            const fetchedThread = await this.slackApi.getThread(parsed.channelId, parsed.threadTs)
            this.cacheManager.setThread(parsed.threadTs, fetchedThread)
            message = fetchedThread.parent
            replyCount = fetchedThread.replies.length
          }
        } else {
          // Regular message
          const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
          const cachedMessage = this.cacheManager.getMessage(cacheKey)
          if (cachedMessage) {
            message = cachedMessage
          } else {
            message = await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
            this.cacheManager.setMessage(cacheKey, message)
          }
        }

        // Build inline text
        let inlineText = ''

        // Add user name if enabled
        if (this.settingsManager.inline.showUser) {
          const user = await this.fetchUser(message.user)
          inlineText += `@${user.displayName}: `
        }

        // Add message preview
        const preview = formatMessagePreview(message.text)
        inlineText += preview

        // Add timestamp if enabled
        if (this.settingsManager.inline.showTime) {
          const timestamp = formatTimestamp(message.ts, this.settingsManager.inline.useRelativeTime)
          inlineText += ` • ${timestamp}`
        }

        // Add thread indicator if thread
        if (replyCount > 0) {
          inlineText += ` 🧵 ${replyCount}`
        }

        const startPos = document.positionAt(match.index!)
        const endPos = document.positionAt(match.index! + match[0].length)
        const range = new vscode.Range(startPos, endPos)

        return {range, text: inlineText, message, age: getMessageAge(message.ts)}
      } catch (error) {
        console.error('Failed to fetch message for decoration:', error)
        return null
      }
    })

    const results = (await Promise.all(decorationPromises)).filter((r): r is NonNullable<typeof r> => r !== null)

    // Apply inline decorations
    if (this.settingsManager.inline.enabled) {
      const inlineDecorations = results.map(({range, text}) => ({range, text}))
      this.decorationManager.applyInlineDecorations(editor, inlineDecorations, this.settingsManager.inline)
    } else {
      this.decorationManager.clearInlineDecorations(editor)
    }

    // Apply highlight decorations
    await this.updateHighlightDecorations(editor, results)

    // Apply channel name decorations
    await this.updateChannelNameDecorations(editor, slackUrls)
  }

  private async updateHighlightDecorations(
    editor: vscode.TextEditor,
    results: Array<{range: vscode.Range; text: string; message: SlackMessage; age: 'today' | 'recent' | 'old'}>
  ): Promise<void> {
    if (!this.settingsManager.highlighting.enabled) {
      this.decorationManager.clearHighlightDecorations(editor)
      return
    }

    const highlightDecorations = new Map<string, DecorationData[]>()
    highlightDecorations.set('today', [])
    highlightDecorations.set('old', [])

    const settings = this.settingsManager.highlighting

    for (const {range, message, age} of results) {
      if (age === 'today') {
        highlightDecorations.get('today')!.push({range, text: ''})
      } else if (age === 'old') {
        // Check if older than threshold
        const timestamp = parseFloat(message.ts) * 1000
        const date = new Date(timestamp)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

        if (diffDays >= settings.oldDays) {
          highlightDecorations.get('old')!.push({range, text: ''})
        }
      }
    }

    this.decorationManager.applyHighlightDecorations(editor, highlightDecorations, settings)
  }

  private async updateChannelNameDecorations(
    editor: vscode.TextEditor,
    slackUrls: RegExpMatchArray[]
  ): Promise<void> {
    const document = editor.document

    const decorations = await Promise.all(
      slackUrls.map(async match => {
        try {
          const parsed = this.slackApi.parseSlackUrl(match[0])
          if (!parsed) return null

          const channel = await this.fetchChannel(parsed.channelId)

          // Find channel ID position in URL
          const urlStart = match.index!
          const channelIdStart = match[0].indexOf(parsed.channelId)
          const startPos = document.positionAt(urlStart + channelIdStart)
          const endPos = document.positionAt(urlStart + channelIdStart + parsed.channelId.length)

          return {
            channelIdRange: new vscode.Range(startPos, endPos),
            channelName: channel.name
          }
        } catch (error) {
          console.error('Failed to fetch channel for decoration:', error)
          return null
        }
      })
    )

    const validDecorations = decorations.filter((d): d is NonNullable<typeof d> => d !== null)
    if (validDecorations.length > 0) {
      this.decorationManager.applyChannelNameDecorations(editor, validDecorations)
    }
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

  dispose(): void {
    this.decorationManager.dispose()
    this.stopAutoRefresh()
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
  }
}
