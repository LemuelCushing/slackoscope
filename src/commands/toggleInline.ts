import * as vscode from 'vscode'
import type {DecorationProvider} from '../providers/decorationProvider'

export function toggleInlineCommand(decorationProvider: DecorationProvider): void {
  decorationProvider.toggle()
  vscode.window.showInformationMessage('Slackoscope: Inline messages toggled')
}
