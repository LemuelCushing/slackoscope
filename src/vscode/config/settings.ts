/**
 * Settings - VS Code configuration adapter.
 *
 * Reads slackoscope.* settings and provides typed access.
 * Emits change events so consumers can react to config updates.
 */

import * as vscode from "vscode"

export interface InlineSettings {
  enabled: boolean
  showTime: boolean
  useRelativeTime: boolean
  showUser: boolean
  showChannelName: boolean
  fontSize: number
  color: string
  fontStyle: "normal" | "italic"
}

export interface HoverSettings {
  showChannel: boolean
  showFiles: boolean
  showFileInfo: boolean
}

export interface HighlightingSettings {
  enabled: boolean
  todayColor: string
  oldDays: number
  oldColor: string
}

export interface SettingsChangeEvent {
  tokensChanged: boolean
  displayChanged: boolean
}

export class Settings implements vscode.Disposable {
  private config: vscode.WorkspaceConfiguration
  private previousTokens: {slack: string; linear: string | undefined}
  private disposable: vscode.Disposable | null = null

  constructor() {
    this.config = vscode.workspace.getConfiguration("slackoscope")
    this.previousTokens = {
      slack: this.slackToken,
      linear: this.linearToken,
    }
  }

  /**
   * Refresh configuration from VS Code settings.
   * Public for test use (programmatic config changes need manual refresh).
   */
  refresh(): void {
    this.config = vscode.workspace.getConfiguration("slackoscope")
  }

  // Tokens

  get slackToken(): string {
    return this.config.get<string>("token") || ""
  }

  get linearToken(): string | undefined {
    return this.config.get<string>("linearToken")
  }

  // Inline settings

  get inline(): InlineSettings {
    const fontSize = this.config.get("inline.fontSize", 12)
    const validatedFontSize = Math.max(10, Math.min(24, fontSize))

    return {
      enabled: this.config.get("inline.enabled", true),
      showTime: this.config.get("inline.showTime", true),
      useRelativeTime: this.config.get("inline.useRelativeTime", false),
      showUser: this.config.get("inline.showUser", false),
      showChannelName: this.config.get("inline.showChannelName", true),
      fontSize: validatedFontSize,
      color: this.config.get("inline.color", "rgba(128, 128, 128, 0.6)"),
      fontStyle: this.config.get("inline.fontStyle", "italic"),
    }
  }

  // Hover settings

  get hover(): HoverSettings {
    return {
      showChannel: this.config.get("hover.showChannel", true),
      showFiles: this.config.get("hover.showFiles", true),
      showFileInfo: this.config.get("hover.showFileInfo", true),
    }
  }

  // Highlighting settings

  get highlighting(): HighlightingSettings {
    return {
      enabled: this.config.get("highlighting.enabled", false),
      todayColor: this.config.get("highlighting.todayColor", "rgba(100, 200, 100, 0.1)"),
      oldDays: this.config.get("highlighting.oldDays", 7),
      oldColor: this.config.get("highlighting.oldColor", "rgba(200, 100, 100, 0.1)"),
    }
  }

  /**
   * Subscribe to settings changes.
   */
  onDidChange(callback: (event: SettingsChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration("slackoscope")) {
        // Defer refresh - VS Code fires event before update() resolves
        setTimeout(() => {
          const oldTokens = this.previousTokens
          this.refresh()

          const tokensChanged = oldTokens.slack !== this.slackToken || oldTokens.linear !== this.linearToken

          const displayChanged =
            e.affectsConfiguration("slackoscope.inline") ||
            e.affectsConfiguration("slackoscope.hover") ||
            e.affectsConfiguration("slackoscope.highlighting")

          this.previousTokens = {
            slack: this.slackToken,
            linear: this.linearToken,
          }

          callback({tokensChanged, displayChanged})
        }, 0)
      }
    })
  }

  dispose(): void {
    this.disposable?.dispose()
  }
}
