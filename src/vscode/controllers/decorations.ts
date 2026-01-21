/**
 * DecorationController - Orchestrates all URL decorations.
 *
 * Two decoration systems:
 * 1. URL Replacement (always on) - replaces channel ID and timestamp with human-readable text
 * 2. Inline Preview (toggled) - shows message content after the URL
 */

import * as vscode from "vscode"
import type {SlackLoader} from "../../slack"
import type {LinearLoader} from "../../linear"
import type {Settings} from "../config"
import {SlackUrlOccurrence} from "../editor"
import {createInlineDecorationType, buildInlineContent, createDecorationOptions} from "../renderers"
import {formatAbsoluteTime, slackTsToDate} from "../renderers/formatting"

export class DecorationController implements vscode.Disposable {
  // URL replacement decorations (always on)
  private channelNameDecorationType: vscode.TextEditorDecorationType | null = null
  private timestampDecorationType: vscode.TextEditorDecorationType | null = null

  // Inline preview decorations (on by default, toggle turns off)
  private inlineDecorationType: vscode.TextEditorDecorationType | null = null
  private isInlineActive = true

  private disposables: vscode.Disposable[] = []
  private updateTimeout: NodeJS.Timeout | null = null

  constructor(
    private slackLoader: SlackLoader,
    private linearLoader: LinearLoader,
    private settings: Settings
  ) {
    // Create decoration types
    this.createUrlReplacementTypes()
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
   * URL replacements are controlled by showChannelName setting.
   */
  async toggle(): Promise<void> {
    this.isInlineActive = !this.isInlineActive

    if (this.isInlineActive) {
      // Turning ON
      this.inlineDecorationType = createInlineDecorationType(this.settings.inline)
      vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor))
    } else {
      // Turning OFF
      this.clearInlineDecorations()
    }
  }

  private createUrlReplacementTypes(): void {
    // These decoration types hide original text and show replacement via 'before'
    // Using transparent color + negative letter-spacing hides the original text
    this.channelNameDecorationType = vscode.window.createTextEditorDecorationType({
      color: "transparent",
      letterSpacing: "-10em",
      before: {
        contentText: "",
        color: "inherit",
        fontWeight: "normal",
      },
    })

    this.timestampDecorationType = vscode.window.createTextEditorDecorationType({
      color: "transparent",
      letterSpacing: "-10em",
      before: {
        contentText: "",
        color: "inherit",
        fontWeight: "normal",
      },
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

    // Always update URL replacements (channel name + timestamp)
    if (this.settings.inline.showChannelName) {
      await this.applyUrlReplacements(editor, occurrences)
    } else {
      this.clearUrlReplacements(editor)
    }

    // Update inline previews only if active
    if (this.isInlineActive && this.inlineDecorationType) {
      await this.applyInlinePreviews(editor, occurrences)
    }
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

  private async applyInlinePreviews(
    editor: vscode.TextEditor,
    occurrences: SlackUrlOccurrence[]
  ): Promise<void> {
    if (!this.inlineDecorationType) return

    const decorationOptions = await Promise.all(
      occurrences.map(async occ => {
        try {
          const {target} = await this.slackLoader.getMessagesForUrl(occ.url)

          const [user, channel] = await Promise.all([
            this.settings.inline.showUser ? this.slackLoader.getUser(target.user) : undefined,
            this.settings.inline.showChannelName ? this.slackLoader.getChannel(occ.url.channelId) : undefined,
          ])

          const content = buildInlineContent(target, user, channel, this.settings.inline)
          return createDecorationOptions(occ.range, content)
        } catch (error) {
          console.error("Inline preview error:", error)
          return createDecorationOptions(occ.range, {text: "⚠️ Error loading"})
        }
      })
    )

    editor.setDecorations(this.inlineDecorationType, decorationOptions)
  }

  private clearEditorDecorations(editor: vscode.TextEditor): void {
    this.clearUrlReplacements(editor)
    if (this.inlineDecorationType) {
      editor.setDecorations(this.inlineDecorationType, [])
    }
  }

  private clearUrlReplacements(editor: vscode.TextEditor): void {
    if (this.channelNameDecorationType) {
      editor.setDecorations(this.channelNameDecorationType, [])
    }
    if (this.timestampDecorationType) {
      editor.setDecorations(this.timestampDecorationType, [])
    }
  }

  private clearInlineDecorations(): void {
    this.isInlineActive = false
    vscode.window.visibleTextEditors.forEach(editor => {
      if (this.inlineDecorationType) {
        editor.setDecorations(this.inlineDecorationType, [])
      }
    })
    this.inlineDecorationType?.dispose()
    this.inlineDecorationType = null
  }

  dispose(): void {
    if (this.updateTimeout) clearTimeout(this.updateTimeout)
    this.channelNameDecorationType?.dispose()
    this.timestampDecorationType?.dispose()
    this.inlineDecorationType?.dispose()
    this.disposables.forEach(d => d.dispose())
  }
}
