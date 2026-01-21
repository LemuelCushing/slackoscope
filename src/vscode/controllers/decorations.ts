/**
 * DecorationController - Orchestrates all URL decorations.
 *
 * Three decoration systems:
 * 1. URL Replacement (controlled by showChannelName setting) - replaces channel ID and timestamp
 * 2. Inline Preview (on by default, toggle turns off) - shows message content after the URL
 * 3. Highlight (controlled by highlighting.enabled setting) - background color based on message age
 */

import * as vscode from "vscode"
import type {SlackLoader, SlackMessage} from "../../slack"
import type {LinearLoader} from "../../linear"
import type {Settings} from "../config"
import {SlackUrlOccurrence} from "../editor"
import {createInlineDecorationType, buildInlineContent, createDecorationOptions} from "../renderers"
import {formatAbsoluteTime, slackTsToDate} from "../renderers/formatting"

interface FetchResult {
  occurrence: SlackUrlOccurrence
  message: SlackMessage
}

export class DecorationController implements vscode.Disposable {
  // URL replacement decorations
  private channelNameDecorationType: vscode.TextEditorDecorationType | null = null
  private timestampDecorationType: vscode.TextEditorDecorationType | null = null

  // Inline preview decorations (on by default)
  private inlineDecorationType: vscode.TextEditorDecorationType | null = null
  private isInlineActive = true

  // Highlight decorations (message age)
  private todayHighlightType: vscode.TextEditorDecorationType | null = null
  private oldHighlightType: vscode.TextEditorDecorationType | null = null

  private disposables: vscode.Disposable[] = []
  private updateTimeout: NodeJS.Timeout | null = null

  constructor(
    private slackLoader: SlackLoader,
    private linearLoader: LinearLoader,
    private settings: Settings
  ) {
    // Create decoration types
    this.createUrlReplacementTypes()
    this.createHighlightTypes()
    this.inlineDecorationType = createInlineDecorationType(this.settings.inline)

    // Initial update for visible editors
    vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor))

    // Subscribe to editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) this.updateDecorations(editor)
      }),
      vscode.workspace.onDidChangeTextDocument(e => {
        const editor = vscode.window.activeTextEditor
        if (editor && e.document === editor.document) {
          this.scheduleUpdate(editor)
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors(editors => {
        editors.forEach(editor => this.updateDecorations(editor))
      })
    )
  }

  updateSlackLoader(loader: SlackLoader): void {
    this.slackLoader = loader
  }

  updateLinearLoader(loader: LinearLoader): void {
    this.linearLoader = loader
  }

  /**
   * Toggle inline message preview on/off.
   */
  async toggle(): Promise<void> {
    this.isInlineActive = !this.isInlineActive

    if (this.isInlineActive) {
      this.inlineDecorationType = createInlineDecorationType(this.settings.inline)
      vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor))
    } else {
      this.clearInlineDecorations()
    }
  }

  private createUrlReplacementTypes(): void {
    // Hide original text and show replacement via 'before'
    this.channelNameDecorationType = vscode.window.createTextEditorDecorationType({
      color: "transparent",
      letterSpacing: "-10em",
      before: {contentText: "", color: "inherit", fontWeight: "normal"},
    })

    this.timestampDecorationType = vscode.window.createTextEditorDecorationType({
      color: "transparent",
      letterSpacing: "-10em",
      before: {contentText: "", color: "inherit", fontWeight: "normal"},
    })
  }

  private createHighlightTypes(): void {
    const hl = this.settings.highlighting
    this.todayHighlightType = vscode.window.createTextEditorDecorationType({
      backgroundColor: hl.todayColor,
      isWholeLine: false,
    })
    this.oldHighlightType = vscode.window.createTextEditorDecorationType({
      backgroundColor: hl.oldColor,
      isWholeLine: false,
    })
  }

  private scheduleUpdate(editor: vscode.TextEditor): void {
    if (this.updateTimeout) clearTimeout(this.updateTimeout)
    this.updateTimeout = setTimeout(() => this.updateDecorations(editor), 300)
  }

  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    const occurrences = SlackUrlOccurrence.scanDocument(editor.document)

    if (occurrences.length === 0) {
      this.clearEditorDecorations(editor)
      return
    }

    // Fetch all messages first (needed for inline + highlight)
    const results = await this.fetchMessages(occurrences)

    // URL replacements (channel name + timestamp)
    if (this.settings.inline.showChannelName) {
      await this.applyUrlReplacements(editor, occurrences)
    } else {
      this.clearUrlReplacements(editor)
    }

    // Inline previews
    if (this.isInlineActive && this.inlineDecorationType) {
      await this.applyInlinePreviews(editor, results)
    }

    // Highlight decorations
    if (this.settings.highlighting.enabled) {
      this.applyHighlights(editor, results)
    } else {
      this.clearHighlights(editor)
    }
  }

  private async fetchMessages(occurrences: SlackUrlOccurrence[]): Promise<FetchResult[]> {
    const results = await Promise.all(
      occurrences.map(async occ => {
        try {
          const {target} = await this.slackLoader.getMessagesForUrl(occ.url)
          return {occurrence: occ, message: target}
        } catch {
          return null
        }
      })
    )
    return results.filter((r): r is FetchResult => r !== null)
  }

  private async applyUrlReplacements(
    editor: vscode.TextEditor,
    occurrences: SlackUrlOccurrence[]
  ): Promise<void> {
    if (!this.channelNameDecorationType || !this.timestampDecorationType) return

    const channelDecorations: vscode.DecorationOptions[] = []
    const timestampDecorations: vscode.DecorationOptions[] = []

    await Promise.all(
      occurrences.map(async occ => {
        try {
          const channelIdRange = occ.channelIdRange()
          const timestampRange = occ.timestampRange()
          if (!channelIdRange || !timestampRange) return

          const channel = await this.slackLoader.getChannel(occ.url.channelId)
          const formattedTime = formatAbsoluteTime(slackTsToDate(occ.url.messageTs))

          channelDecorations.push({
            range: channelIdRange,
            renderOptions: {before: {contentText: `#${channel.name}`}},
          })

          timestampDecorations.push({
            range: timestampRange,
            renderOptions: {before: {contentText: formattedTime}},
          })
        } catch (error) {
          console.error("URL replacement error:", error)
        }
      })
    )

    editor.setDecorations(this.channelNameDecorationType, channelDecorations)
    editor.setDecorations(this.timestampDecorationType, timestampDecorations)
  }

  private async applyInlinePreviews(editor: vscode.TextEditor, results: FetchResult[]): Promise<void> {
    if (!this.inlineDecorationType) return

    const decorationOptions = await Promise.all(
      results.map(async ({occurrence, message}) => {
        try {
          const user = this.settings.inline.showUser
            ? await this.slackLoader.getUser(message.user)
            : undefined

          const content = buildInlineContent(message, user, this.settings.inline)
          return createDecorationOptions(occurrence.range, content)
        } catch (error) {
          console.error("Inline preview error:", error)
          return createDecorationOptions(occurrence.range, {text: "⚠️ Error loading"})
        }
      })
    )

    editor.setDecorations(this.inlineDecorationType, decorationOptions)
  }

  private applyHighlights(editor: vscode.TextEditor, results: FetchResult[]): void {
    if (!this.todayHighlightType || !this.oldHighlightType) return

    const todayRanges: vscode.Range[] = []
    const oldRanges: vscode.Range[] = []
    const now = new Date()
    const oldDays = this.settings.highlighting.oldDays

    for (const {occurrence, message} of results) {
      const date = slackTsToDate(message.ts)

      if (date.toDateString() === now.toDateString()) {
        todayRanges.push(occurrence.range)
      } else {
        const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
        if (diffDays >= oldDays) {
          oldRanges.push(occurrence.range)
        }
      }
    }

    editor.setDecorations(this.todayHighlightType, todayRanges)
    editor.setDecorations(this.oldHighlightType, oldRanges)
  }

  private clearEditorDecorations(editor: vscode.TextEditor): void {
    this.clearUrlReplacements(editor)
    this.clearHighlights(editor)
    if (this.inlineDecorationType) {
      editor.setDecorations(this.inlineDecorationType, [])
    }
  }

  private clearUrlReplacements(editor: vscode.TextEditor): void {
    if (this.channelNameDecorationType) editor.setDecorations(this.channelNameDecorationType, [])
    if (this.timestampDecorationType) editor.setDecorations(this.timestampDecorationType, [])
  }

  private clearHighlights(editor: vscode.TextEditor): void {
    if (this.todayHighlightType) editor.setDecorations(this.todayHighlightType, [])
    if (this.oldHighlightType) editor.setDecorations(this.oldHighlightType, [])
  }

  private clearInlineDecorations(): void {
    this.isInlineActive = false
    vscode.window.visibleTextEditors.forEach(editor => {
      if (this.inlineDecorationType) editor.setDecorations(this.inlineDecorationType, [])
    })
    this.inlineDecorationType?.dispose()
    this.inlineDecorationType = null
  }

  dispose(): void {
    if (this.updateTimeout) clearTimeout(this.updateTimeout)
    this.channelNameDecorationType?.dispose()
    this.timestampDecorationType?.dispose()
    this.inlineDecorationType?.dispose()
    this.todayHighlightType?.dispose()
    this.oldHighlightType?.dispose()
    this.disposables.forEach(d => d.dispose())
  }
}
