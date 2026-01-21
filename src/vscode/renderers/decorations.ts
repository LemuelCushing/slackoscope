/**
 * DecorationRenderer - Creates VS Code decoration types and options.
 *
 * Responsible for the visual appearance of inline decorations.
 */

import * as vscode from "vscode"
import type {InlineSettings} from "../config"
import type {SlackMessage, SlackUser, SlackChannel} from "../../slack"
import {formatRelativeTime, formatAbsoluteTime, slackTsToDate, truncate, collapseLine} from "./formatting"

const MAX_INLINE_LENGTH = 80

export interface DecorationContent {
  text: string
  hoverMessage?: string
}

/**
 * Create a decoration type for inline message display.
 */
export function createInlineDecorationType(settings: InlineSettings): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    after: {
      margin: "0 0 0 1em",
      fontStyle: settings.fontStyle,
      color: settings.color,
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  })
}

/**
 * Build the inline decoration content for a message.
 */
export function buildInlineContent(
  message: SlackMessage,
  user: SlackUser | undefined,
  channel: SlackChannel | undefined,
  settings: InlineSettings
): DecorationContent {
  const parts: string[] = []

  // Channel name
  if (settings.showChannelName && channel) {
    parts.push(`#${channel.name}`)
  }

  // User name
  if (settings.showUser && user) {
    parts.push(`@${user.displayName}`)
  }

  // Timestamp
  if (settings.showTime) {
    const date = slackTsToDate(message.ts)
    const time = settings.useRelativeTime ? formatRelativeTime(date) : formatAbsoluteTime(date)
    parts.push(time)
  }

  // Message preview
  const preview = truncate(collapseLine(message.text), MAX_INLINE_LENGTH)
  parts.push(`"${preview}"`)

  return {
    text: parts.join(" · "),
    hoverMessage: message.text,
  }
}

/**
 * Create decoration options for a range with content.
 */
export function createDecorationOptions(
  range: vscode.Range,
  content: DecorationContent
): vscode.DecorationOptions {
  return {
    range,
    renderOptions: {
      after: {
        contentText: content.text,
      },
    },
    hoverMessage: content.hoverMessage,
  }
}
