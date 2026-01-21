import * as vscode from "vscode"
import type {ISlackApi} from "../api/slackApi"
import type {ILinearApi} from "../api/linearApi"
import type {CacheManager} from "../cache/cacheManager"
import type {SettingsManager} from "../ui/settingsManager"
import {DecorationManager, type HighlightDecorations} from "../ui/decorationManager"
import {formatMessagePreview, formatTimestamp} from "../ui/formatting"
import {cacheLinearMetadataFromMessages} from "../services/linearMetadata"
import type {SlackMessage} from "../types/slack"
import {getOrFetchChannel, getOrFetchMessagesForUrl, getOrFetchUser} from "../services/slackData"
import {SlackUrlMatch} from "../lib/slackUrl"

export class DecorationProvider {
  private decorationManager = new DecorationManager()
  private isEnabled = true
  private updateTimeout: NodeJS.Timeout | null = null
  private refreshInterval: NodeJS.Timeout | null = null
  private readonly disposables: vscode.Disposable[] = []

  constructor(
    private slackApi: ISlackApi,
    private cacheManager: CacheManager,
    private settingsManager: SettingsManager,
    private linearApi: ILinearApi | null = null
  ) {
    // Initial update for all visible editors
    vscode.window.visibleTextEditors.forEach(editor => {
      this.updateDecorations(editor)
    })

    // Watch for document/editor changes
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        const editor = vscode.window.activeTextEditor
        if (editor && e.document === editor.document) {
          this.scheduleUpdate(editor)
        }
      }),

      vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor | undefined) => {
        if (editor) {
          this.updateDecorations(editor)
        }
      }),

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
    )

    // Auto-refresh relative times if enabled
    if (this.settingsManager.inline.useRelativeTime) {
      this.startAutoRefresh()
    }
  }

  updateApi(api: ISlackApi): void {
    this.slackApi = api
  }

  updateLinearApi(api: ILinearApi | null): void {
    this.linearApi = api
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
        // Note: Don't clear channel name and timestamp decorations - they're independent
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
    const document = editor.document
    const slackUrls = SlackUrlMatch.allInDocument(this.slackApi, document)

    if (slackUrls.length === 0) {
      this.decorationManager.clearInlineDecorations(editor)
      this.decorationManager.clearHighlightDecorations(editor)
      this.decorationManager.clearChannelNameDecorations(editor)
      this.decorationManager.clearTimestampDecorations(editor)
      return
    }

    // Always update channel name and timestamp decorations (independent of inline messages)
    if (this.settingsManager.inline.showChannelName) {
      await this.updateChannelNameAndTimestampDecorations(editor, slackUrls)
    } else {
      this.decorationManager.clearChannelNameDecorations(editor)
      this.decorationManager.clearTimestampDecorations(editor)
    }

    // Only fetch messages and apply inline/highlight decorations if enabled
    if (!this.isEnabled) {
      this.decorationManager.clearInlineDecorations(editor)
      this.decorationManager.clearHighlightDecorations(editor)
      return
    }

    // Fetch all messages concurrently
    const decorationPromises = slackUrls.map(async slackUrl => {
      try {
        const parsed = slackUrl.parsed
        const {targetMessage: message, messages, replyCount} = await getOrFetchMessagesForUrl(
          this.slackApi,
          this.cacheManager,
          parsed
        )

        // Cache Linear metadata for this URL (we already have the messages)
        await cacheLinearMetadataFromMessages(parsed, messages, this.linearApi, this.cacheManager)

        // Build inline text
        let inlineText = ''

        // Add user name if enabled
        if (this.settingsManager.inline.showUser) {
          const user = await getOrFetchUser(this.slackApi, this.cacheManager, message.user)
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

        return {range: slackUrl.range, text: inlineText, message}
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
  }

  private async updateHighlightDecorations(
    editor: vscode.TextEditor,
    results: Array<{range: vscode.Range; text: string; message: SlackMessage}>
  ): Promise<void> {
    if (!this.settingsManager.highlighting.enabled) {
      this.decorationManager.clearHighlightDecorations(editor)
      return
    }

    const highlightRanges: HighlightDecorations = {today: [], old: []}

    const settings = this.settingsManager.highlighting

    for (const {range, message} of results) {
      const timestamp = parseFloat(message.ts) * 1000
      const date = new Date(timestamp)
      const now = new Date()

      if (date.toDateString() === now.toDateString()) {
        highlightRanges.today.push(range)
        continue
      }

      const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
      if (diffDays >= settings.oldDays) {
        highlightRanges.old.push(range)
      }
    }

    this.decorationManager.applyHighlightDecorations(editor, highlightRanges, settings)
  }

  private async updateChannelNameAndTimestampDecorations(
    editor: vscode.TextEditor,
    slackUrls: SlackUrlMatch[]
  ): Promise<void> {
    const decorations = await Promise.all(
      slackUrls.map(async slackUrl => {
        try {
          const channel = await getOrFetchChannel(this.slackApi, this.cacheManager, slackUrl.channelId)
          const channelIdRange = slackUrl.channelIdRange()
          const timestampRange = slackUrl.timestampRange()
          if (!channelIdRange || !timestampRange) return null

          // Format the timestamp for display
          const formattedTimestamp = formatTimestamp(slackUrl.messageTs, false)

          return {
            channelIdRange,
            channelName: channel.name,
            timestampRange,
            formattedTimestamp
          }
        } catch (error) {
          console.error('Failed to fetch channel for decoration:', error)
          return null
        }
      })
    )

    const validDecorations = decorations.filter((d): d is NonNullable<typeof d> => d !== null)
    if (validDecorations.length > 0) {
      this.decorationManager.applyChannelNameAndTimestampDecorations(editor, validDecorations)
    }
  }

  dispose(): void {
    this.disposables.splice(0).forEach(d => d.dispose())
    this.decorationManager.dispose()
    this.stopAutoRefresh()
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
  }
}
