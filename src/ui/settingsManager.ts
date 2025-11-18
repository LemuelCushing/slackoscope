import * as vscode from "vscode"
import type {InlineSettings, HoverSettings, HighlightingSettings} from "../types/settings"

export class SettingsManager {
  private config: vscode.WorkspaceConfiguration

  constructor() {
    this.config = vscode.workspace.getConfiguration("slackoscope")
  }

  refresh(): void {
    this.config = vscode.workspace.getConfiguration("slackoscope")
  }

  get slackToken(): string {
    return this.config.get<string>("token") || ""
  }

  get linearToken(): string | undefined {
    return this.config.get<string>("linearToken")
  }

  get inline(): InlineSettings {
    const fontSize = this.config.get("inline.fontSize", 12)
    const validatedFontSize = Math.max(10, Math.min(24, fontSize)) // Clamp 10-24

    return {
      enabled: this.config.get("inline.enabled", true),
      position: "right", // Hardcoded to 'right' as the position setting is now hidden
      showTime: this.config.get("inline.showTime", true),
      useRelativeTime: this.config.get("inline.useRelativeTime", false),
      showUser: this.config.get("inline.showUser", false),
      fontSize: validatedFontSize,
      color: this.config.get("inline.color", "rgba(128, 128, 128, 0.6)"),
      fontStyle: this.config.get("inline.fontStyle", "italic"),
      showChannelName: this.config.get("inline.showChannelName", true)
    }
  }

  get hover(): HoverSettings {
    return {
      showChannel: this.config.get("hover.showChannel", true),
      showFiles: this.config.get("hover.showFiles", true),
      showFileInfo: this.config.get("hover.showFileInfo", true)
    }
  }

  get highlighting(): HighlightingSettings {
    return {
      enabled: this.config.get("highlighting.enabled", false),
      todayColor: this.config.get("highlighting.todayColor", "rgba(100, 200, 100, 0.1)"),
      oldDays: this.config.get("highlighting.oldDays", 7),
      oldColor: this.config.get("highlighting.oldColor", "rgba(200, 100, 100, 0.1)")
    }
  }

  onDidChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
      if (e.affectsConfiguration("slackoscope")) {
        this.refresh()
        callback()
      }
    })
  }
}
