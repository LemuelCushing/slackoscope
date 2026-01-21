/**
 * HoverContentBuilder - Fluent builder for hover tooltip content.
 *
 * Separates presentation logic from the hover provider.
 */

import * as vscode from "vscode"
import type {SlackChannel, SlackUser, SlackMessage, SlackFile} from "../../slack"
import type {LinearIssue} from "../../linear"
import {formatRelativeTime, slackTsToDate} from "./formatting"

export class HoverContentBuilder {
  private sections: string[] = []

  /**
   * Add channel name header.
   */
  channel(channel: SlackChannel, isThread = false): this {
    const icon = channel.isPrivate ? "🔒" : "📧"
    const prefix = isThread ? "🧵 " : ""
    this.sections.push(`${prefix}${icon} **#${channel.name}**`)
    return this
  }

  /**
   * Add author line with timestamp.
   */
  author(user: SlackUser, message: SlackMessage, context?: string): this {
    const time = formatRelativeTime(slackTsToDate(message.ts))
    const label = context ? `${context} by` : ""
    this.sections.push(`**${label} @${user.displayName}** (${time}):`.replace("  ", " "))
    return this
  }

  /**
   * Add message text as blockquote.
   */
  message(text: string): this {
    this.sections.push(`> ${text}`)
    return this
  }

  /**
   * Add thread context (reply count).
   */
  threadContext(replyCount: number): this {
    if (replyCount > 0) {
      const word = replyCount === 1 ? "reply" : "replies"
      this.sections.push(`_Part of thread with ${replyCount} ${word}_`)
    }
    return this
  }

  /**
   * Add file attachments section.
   */
  files(files: SlackFile[], showInfo = true): this {
    if (!files.length) return this

    this.sections.push("📎 **Files**:")

    for (const file of files) {
      // Image preview
      if (file.mimetype.startsWith("image/") && file.thumb) {
        this.sections.push(`![${file.name}](${file.thumb})`)
      }

      // File link
      const icon = file.mimetype.startsWith("image/") ? "🖼️" : "📄"
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
   * Add Linear issue info.
   */
  linearIssue(issue: LinearIssue): this {
    this.sections.push(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"`)
    this.sections.push(`Status: ${issue.state.name}`)
    return this
  }

  /**
   * Add a command action link.
   */
  action(label: string, command: string, args: object): this {
    const encoded = encodeURIComponent(JSON.stringify(args))
    this.sections.push(`[${label}](command:${command}?${encoded})`)
    return this
  }

  /**
   * Add multiple actions on one line.
   */
  actions(...actions: Array<{label: string; command: string; args: object}>): this {
    const links = actions.map(({label, command, args}) => {
      const encoded = encodeURIComponent(JSON.stringify(args))
      return `[${label}](command:${command}?${encoded})`
    })
    this.sections.push(links.join(" | "))
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
