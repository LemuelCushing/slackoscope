import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {LinearApi} from '../api/linearApi'
import type {CacheManager} from '../cache/cacheManager'
import type {SettingsManager} from '../ui/settingsManager'
import type {DecorationProvider} from '../providers/decorationProvider'
import {toggleInlineCommand} from './toggleInline'
import {insertCommentCommand} from './insertComment'
import {clearCacheCommand} from './clearCache'
import {postToLinearCommand} from './postToLinear'

export interface CommandContext {
  slackApi: SlackApi
  linearApi: LinearApi | null
  cacheManager: CacheManager
  settingsManager: SettingsManager
  decorationProvider: DecorationProvider
}

export function registerCommands(context: vscode.ExtensionContext, ctx: CommandContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('slackoscope.toggleInlineMessage', () =>
      toggleInlineCommand(ctx.decorationProvider)
    ),
    vscode.commands.registerCommand('slackoscope.insertCommentedMessage', (args: {url: string; lineNumber?: number; isThread?: boolean}) =>
      insertCommentCommand(ctx.slackApi, ctx.cacheManager, args)
    ),
    vscode.commands.registerCommand('slackoscope.clearCache', () => clearCacheCommand(ctx.cacheManager)),
    vscode.commands.registerCommand('slackoscope.postToLinear', (args: {issueId: string; identifier: string}) => postToLinearCommand(ctx.linearApi, args))
  )
}
