/**
 * DecorationController - Orchestrates inline message decorations.
 *
 * This is a CONTROLLER, not a VS Code provider. It:
 * - Subscribes to editor events
 * - Manages decoration lifecycle
 * - Coordinates between store and renderer
 */

import * as vscode from "vscode"
import type {SlackLoader} from "../../slack"
import type {LinearLoader} from "../../linear"
import type {Settings} from "../config"
import {SlackUrlOccurrence} from "../editor"
import {createInlineDecorationType, buildInlineContent, createDecorationOptions} from "../renderers"

export class DecorationController implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType | null = null
  private isActive = false
  private disposables: vscode.Disposable[] = []

  constructor(
    private slackLoader: SlackLoader,
    private linearLoader: LinearLoader,
    private settings: Settings
  ) {
    // Subscribe to editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.refreshIfActive()),
      vscode.workspace.onDidChangeTextDocument(e => {
        if (vscode.window.activeTextEditor?.document === e.document) {
          this.refreshIfActive()
        }
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
   * Toggle inline decorations on/off.
   */
  async toggle(): Promise<void> {
    if (this.isActive) {
      this.clear()
    } else {
      await this.activate()
    }
  }

  /**
   * Refresh decorations if currently active.
   */
  async refresh(): Promise<void> {
    if (this.isActive) {
      await this.applyDecorations()
    }
  }

  private async activate(): Promise<void> {
    this.isActive = true
    this.decorationType = createInlineDecorationType(this.settings.inline)
    await this.applyDecorations()
  }

  private clear(): void {
    this.isActive = false
    this.decorationType?.dispose()
    this.decorationType = null
  }

  private async refreshIfActive(): Promise<void> {
    if (this.isActive) {
      await this.applyDecorations()
    }
  }

  private async applyDecorations(): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor || !this.decorationType) return

    const occurrences = SlackUrlOccurrence.scanDocument(editor.document)
    if (occurrences.length === 0) {
      editor.setDecorations(this.decorationType, [])
      return
    }

    // Fetch all messages in parallel
    const decorationOptions = await Promise.all(
      occurrences.map(async occ => {
        try {
          const {target} = await this.slackLoader.getMessagesForUrl(occ.url)

          // Fetch user and channel for display
          const [user, channel] = await Promise.all([
            this.settings.inline.showUser ? this.slackLoader.getUser(target.user) : undefined,
            this.settings.inline.showChannelName ? this.slackLoader.getChannel(occ.url.channelId) : undefined,
          ])

          const content = buildInlineContent(target, user, channel, this.settings.inline)
          return createDecorationOptions(occ.range, content)
        } catch (error) {
          console.error("Decoration error:", error)
          return createDecorationOptions(occ.range, {text: "⚠️ Error loading"})
        }
      })
    )

    editor.setDecorations(this.decorationType, decorationOptions)
  }

  dispose(): void {
    this.clear()
    this.disposables.forEach(d => d.dispose())
  }
}
