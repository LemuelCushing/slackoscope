/**
 * HoverContentBuilder - Fluent builder for hover tooltip content.
 *
 * Separates presentation logic from the hover provider.
 * Glyphs drawn from alchemical and ancient unicode blocks.
 */

import * as vscode from "vscode"
import type {SlackChannel, SlackUser, SlackMessage, SlackFile} from "../../slack"
import type {LinearIssue} from "../../linear"
import {formatRelativeTime, slackTsToDate, truncate} from "./formatting"

/** Action link definition */
export interface ActionDef {
  label: string
  command: string
  args: object
}

/** Decorative flourishes — ancient scripts and alchemical glyphs, sprinkled sparingly */
const FLOURISHES = [
  "𖡹", "ᘒ", "ↀ", "𖡄", "𐘃", "𐀉", "𐀳", "𐀒", "𐜩", "𐛺",
  "𐛌", "𐚃", "𐘘", "𖠲", "𖠢", "𖠦", "𖣘", "𖤍", "𜸉",
]
/** Pick a flourish deterministically from accumulated content (looks random across messages) */
const flourish = (sections: string[]) => {
  const seed = sections.reduce((n, s) => n + s.length, 0)
  return FLOURISHES[seed % FLOURISHES.length]
}

/** Horizontal rule from box-drawing light horizontal */
const RULE = "─".repeat(7)

/** Padded separator for action rows — double em-space + glyph + double em-space */
const ACTION_SEP_PRIMARY = `\u2003\u2003𐄁\u2003\u2003`
const ACTION_SEP_SECONDARY = `\u2003\u2003𜸅\u2003\u2003`

/** Format an action as a VS Code command link (HTML <a> for use inside centered divs) */
const actionLink = ({label, command, args}: ActionDef, html: boolean): string => {
  const encoded = encodeURIComponent(JSON.stringify(args))
  if (html) return `<a href="command:${command}?${encoded}">${label}</a>`
  return `[${label}](command:${command}?${encoded})`
}

export class HoverContentBuilder {
  private sections: string[] = []

  /**
   * Add channel name header.
   */
  channel(channel: SlackChannel, isThread = false): this {
    const icon = channel.isPrivate ? "🔒" : "𐀶"
    const prefix = isThread ? "𐛑 " : ""
    this.sections.push(`${prefix}${icon} **#${channel.name}**`)
    return this
  }

  /**
   * Add author line with timestamp.
   */
  author(user: SlackUser, message: SlackMessage, context?: string): this {
    const time = formatRelativeTime(slackTsToDate(message.ts))
    const byline = context ? `${context} by @${user.displayName}` : `@${user.displayName}`
    this.sections.push(`**${byline}** (${time}):`)
    return this
  }

  /**
   * Add message text as blockquote.
   */
  message(text: string): this {
    const quoted = text
      .split("\n")
      .map(line => `> ${line}`)
      .join("\n")
    this.sections.push(quoted)
    return this
  }

  /**
   * Add reply count as a subtle continuation below the message.
   */
  replies(count: number | undefined): this {
    if (!count || count <= 0) return this
    const f = flourish(this.sections)
    const word = count === 1 ? "reply" : "replies"
    this.sections.push(`\u2003\u2003${f} _${count} ${word}_`)
    return this
  }

  /**
   * Add compact Linear issue metadata line.
   */
  linearInfo(issue: LinearIssue | undefined): this {
    if (!issue) return this
    const {identifier, url, title, state} = issue
    const shortTitle = truncate(title, 50)
    const stateIcon = state.type === "completed" ? "✓" : state.type === "canceled" ? "✗" : "◉"
    this.sections.push(`🜃 [${identifier}](${url}) — "${shortTitle}" · ${stateIcon} ${state.name}`)
    return this
  }

  /**
   * Add file attachments section.
   */
  files(files: SlackFile[], showInfo = true): this {
    if (!files.length) return this

    this.sections.push("𜱃 **Files**:")

    for (const file of files) {
      if (file.mimetype.startsWith("image/") && file.thumb) {
        this.sections.push(`![${file.name}](${file.thumb})`)
      }

      const icon = file.mimetype.startsWith("image/") ? "▣" : "☰"
      const url = file.url_private_download || file.url_private || file.permalink || file.url

      if (showInfo) {
        const sizeKb = Math.round(file.size / 1024)
        this.sections.push(`${icon} [**${file.name}**](${url}) (${sizeKb} KB)`)
      } else {
        this.sections.push(`${icon} [**${file.name}**](${url})`)
      }
    }

    return this
  }

  /**
   * Add a decorated horizontal rule separator.
   */
  separator(): this {
    const f = flourish(this.sections)
    this.sections.push(`<div align="center">${f}\u2003${RULE}\u2003${f}</div>`)
    return this
  }

  /**
   * Add action rows with padded separators.
   * Primary row uses 𐄁, secondary rows use 𜸅.
   */
  actionRows(...rows: ActionDef[][]): this {
    rows.forEach((row, i) => {
      if (row.length > 0) {
        const sep = i === 0 ? ACTION_SEP_PRIMARY : ACTION_SEP_SECONDARY
        const links = row.map(a => actionLink(a, true)).join(sep)
        this.sections.push(`<div align="center">${links}</div>`)
      }
    })
    return this
  }

  /**
   * Build the final MarkdownString.
   */
  build(): vscode.MarkdownString {
    const md = new vscode.MarkdownString(this.sections.join("\n\n"))
    md.isTrusted = true
    md.supportHtml = true
    return md
  }
}
