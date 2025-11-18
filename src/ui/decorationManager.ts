import * as vscode from 'vscode'
import type {InlineSettings, HighlightingSettings} from '../types/settings'

export interface DecorationData {
  range: vscode.Range
  text: string
}

export class DecorationManager {
  private inlineDecorationType: vscode.TextEditorDecorationType | null = null
  private highlightDecorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map()
  private channelNameDecorationTypes: {dim: vscode.TextEditorDecorationType; name: vscode.TextEditorDecorationType} | null = null

  createInlineDecorationType(settings: InlineSettings): vscode.TextEditorDecorationType {
    // Dispose existing
    this.inlineDecorationType?.dispose()

    let renderOptions: vscode.DecorationRenderOptions
    if (settings.position === 'above') {
      renderOptions = {
        before: {
          color: settings.color,
          fontStyle: settings.fontStyle,
          contentText: '' // Will be set per-decoration
        },
        isWholeLine: false
      }
    } else if (settings.position === 'below') {
      renderOptions = {
        after: {
          color: settings.color,
          fontStyle: settings.fontStyle,
          contentText: '',
          margin: '0 0 0 0'
        },
        isWholeLine: true
      }
    } else {
      // Default: right
      renderOptions = {
        after: {
          color: settings.color,
          fontStyle: settings.fontStyle,
          contentText: '',
          margin: '0 0 0 1em'
        }
      }
    }

    this.inlineDecorationType = vscode.window.createTextEditorDecorationType(renderOptions)
    return this.inlineDecorationType
  }

  applyInlineDecorations(
    editor: vscode.TextEditor,
    decorations: DecorationData[],
    settings: InlineSettings
  ): void {
    if (!this.inlineDecorationType) {
      this.createInlineDecorationType(settings)
    }

    const decorationOptions = decorations.map(({range, text}) => {
      const renderOptions: vscode.DecorationInstanceRenderOptions =
        settings.position === 'above' ? {before: {contentText: text}} : {after: {contentText: text}}

      return {range, renderOptions}
    })

    editor.setDecorations(this.inlineDecorationType!, decorationOptions)
  }

  clearInlineDecorations(editor: vscode.TextEditor): void {
    if (this.inlineDecorationType) {
      editor.setDecorations(this.inlineDecorationType, [])
    }
  }

  createHighlightDecorationType(color: string): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      backgroundColor: color,
      isWholeLine: false
    })
  }

  applyHighlightDecorations(
    editor: vscode.TextEditor,
    decorations: Map<string, DecorationData[]>,
    settings: HighlightingSettings
  ): void {
    if (!settings.enabled) return

    // Clear existing highlight decorations
    this.highlightDecorationTypes.forEach(type => type.dispose())
    this.highlightDecorationTypes.clear()

    // Create decoration types for each category
    const todayType = this.createHighlightDecorationType(settings.todayColor)
    const oldType = this.createHighlightDecorationType(settings.oldColor)

    this.highlightDecorationTypes.set('today', todayType)
    this.highlightDecorationTypes.set('old', oldType)

    // Apply decorations
    const todayDecorations = decorations.get('today') || []
    const oldDecorations = decorations.get('old') || []

    editor.setDecorations(todayType, todayDecorations.map(d => d.range))
    editor.setDecorations(oldType, oldDecorations.map(d => d.range))
  }

  clearHighlightDecorations(editor: vscode.TextEditor): void {
    this.highlightDecorationTypes.forEach(type => {
      editor.setDecorations(type, [])
    })
  }

  applyChannelNameDecorations(
    editor: vscode.TextEditor,
    decorations: Array<{channelIdRange: vscode.Range; channelName: string}>
  ): void {
    // Dispose existing
    if (this.channelNameDecorationTypes) {
      this.channelNameDecorationTypes.dim.dispose()
      this.channelNameDecorationTypes.name.dispose()
    }

    const dimType = vscode.window.createTextEditorDecorationType({
      opacity: '0.3'
    })

    const nameType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '',
        color: 'inherit',
        fontWeight: 'bold'
      }
    })

    this.channelNameDecorationTypes = {dim: dimType, name: nameType}

    const dimRanges = decorations.map(d => d.channelIdRange)
    const nameDecorations = decorations.map(d => ({
      range: d.channelIdRange,
      renderOptions: {
        after: {
          contentText: `#${d.channelName}`
        }
      }
    }))

    editor.setDecorations(dimType, dimRanges)
    editor.setDecorations(nameType, nameDecorations)
  }

  clearChannelNameDecorations(editor: vscode.TextEditor): void {
    if (this.channelNameDecorationTypes) {
      editor.setDecorations(this.channelNameDecorationTypes.dim, [])
      editor.setDecorations(this.channelNameDecorationTypes.name, [])
    }
  }

  dispose(): void {
    this.inlineDecorationType?.dispose()
    this.highlightDecorationTypes.forEach(type => type.dispose())
    if (this.channelNameDecorationTypes) {
      this.channelNameDecorationTypes.dim.dispose()
      this.channelNameDecorationTypes.name.dispose()
    }
  }
}
