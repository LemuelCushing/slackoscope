/**
 * Command Registry - The "routes.rb" of Slackoscope.
 *
 * This file is the single source of truth for all commands.
 * To add a command:
 * 1. Implement the handler in a separate file
 * 2. Add it to COMMANDS below
 * 3. Update package.json contributes.commands
 */

import * as vscode from "vscode"
import type {SlackStore, SlackLoader, ISlackClient} from "../../slack"
import type {LinearStore, LinearLoader, ILinearClient} from "../../linear"
import type {DecorationController} from "../controllers"
import {toggleInline} from "./toggleInline"
import {insertComment} from "./insertComment"
import {clearCache} from "./clearCache"
import {postToLinear} from "./postToLinear"

/**
 * Dependencies available to commands.
 */
export interface CommandDependencies {
  slackClient: ISlackClient
  slackStore: SlackStore
  slackLoader: SlackLoader
  linearClient: ILinearClient | null
  linearStore: LinearStore
  linearLoader: LinearLoader
  decorationController: DecorationController
}

/**
 * Command definitions.
 * The key is the command suffix (after "slackoscope.").
 */
const COMMANDS = {
  toggleInlineMessage: (deps: CommandDependencies) => () => toggleInline(deps.decorationController),

  insertCommentedMessage: (deps: CommandDependencies) => (args: {url: string; lineNumber?: number}) =>
    insertComment(deps.slackLoader, args),

  clearCache: (deps: CommandDependencies) => () => clearCache(deps.slackStore, deps.linearStore),

  postToLinear: (deps: CommandDependencies) => (args: {issueId: string; identifier: string}) =>
    postToLinear(deps.linearClient, args),
} as const

export type CommandId = keyof typeof COMMANDS
export type FullCommandId = `slackoscope.${CommandId}`

/**
 * Register all commands with VS Code.
 */
export function registerCommands(context: vscode.ExtensionContext, deps: CommandDependencies): void {
  for (const [name, factory] of Object.entries(COMMANDS)) {
    const handler = factory(deps)
    context.subscriptions.push(vscode.commands.registerCommand(`slackoscope.${name}`, handler))
  }
}

/**
 * List of all command IDs (useful for package.json generation).
 */
export const ALL_COMMAND_IDS: FullCommandId[] = Object.keys(COMMANDS).map(
  name => `slackoscope.${name}` as FullCommandId
)
