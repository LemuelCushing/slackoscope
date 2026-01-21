/**
 * DecorationRenderer - Creates VS Code decoration types and options.
 *
 * Responsible for the visual appearance of inline decorations.
 */

import * as vscode from "vscode"
import type {InlineSettings} from "../config"
import type {SlackMessage, SlackUser} from "../../slack"
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
 * Format: @Username: "message preview" • 1m ago
 *
 * NOTE: Channel name and absolute timestamp are shown via URL replacement decorations,
 * so we DON'T include them here to avoid duplication.
 */
export function buildInlineContent(
  message: SlackMessage,
  user: SlackUser | undefined,
  settings: InlineSettings
): DecorationContent {
  let text = ""

  // User name with colon
  if (settings.showUser && user) {
    text += `@${user.displayName}: `
  }

  // Message preview (quoted)
  const preview = truncate(collapseLine(message.text), MAX_INLINE_LENGTH)
  text += `"${preview}"`

  // Relative timestamp (only if enabled)
  if (settings.showTime) {
    const date = slackTsToDate(message.ts)
    const time = settings.useRelativeTime ? formatRelativeTime(date) : formatAbsoluteTime(date)
    text += ` • ${time}`
  }

  return {
    text,
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
