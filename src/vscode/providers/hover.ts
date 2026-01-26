/**
 * HoverProvider - Shows message preview when hovering over Slack URLs.
 */

import * as vscode from "vscode"
import type {SlackLoader} from "../../slack"
import type {LinearLoader, LinearIssue} from "../../linear"
import type {Settings} from "../config"
import {SlackUrlOccurrence} from "../editor"
import {HoverContentBuilder} from "../renderers"

export class HoverProvider implements vscode.HoverProvider {
  constructor(
    private slackLoader: SlackLoader,
    private linearLoader: LinearLoader,
    private settings: Settings
  ) {}

  updateSlackLoader(loader: SlackLoader): void {
    this.slackLoader = loader
  }

  updateLinearLoader(loader: LinearLoader): void {
    this.linearLoader = loader
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null> {
    const occurrence = SlackUrlOccurrence.at(document, position)
    if (!occurrence) return null

    try {
      const {url} = occurrence

      // Fetch messages
      const {target, all, replyCount} = await this.slackLoader.getMessagesForUrl(url)

      // Build hover content
      const builder = new HoverContentBuilder()

      // Channel
      if (this.settings.hover.showChannel) {
        const channel = await this.slackLoader.getChannel(url.channelId)
        builder.channel(channel, !!url.threadTs)
      }

      // Author
      const user = await this.slackLoader.getUser(target.user)
      const context = url.threadTs ? (target.ts === url.threadTs ? "Thread started" : "Thread reply") : undefined
      builder.author(user, target, context)

      // Message
      builder.message(target.text)

      // Thread context
      if (replyCount > 0) {
        builder.threadContext(replyCount)
      }

      // Files
      if (this.settings.hover.showFiles && target.files?.length) {
        builder.files(target.files, this.settings.hover.showFileInfo)
      }

      // Linear issue
      const linearMetadata = await this.linearLoader.getMetadataForUrl(url, all)
      let linearIssue: LinearIssue | null = null

      if (linearMetadata) {
        linearIssue = await this.linearLoader.getIssue(linearMetadata.identifier)
        if (linearIssue) {
          builder.linearIssue(linearIssue)
        }
      }

      // Actions
      const actions: Array<{label: string; command: string; args: object}> = [
        {
          label: "Insert as Comment",
          command: "slackoscope.insertCommentedMessage",
          args: {url: url.raw, linearIdentifier: linearIssue?.identifier},
        },
      ]

      if (linearIssue) {
        actions.push(
          {
            label: `Post to ${linearIssue.identifier}`,
            command: "slackoscope.postToLinear",
            args: {issueId: linearIssue.id, identifier: linearIssue.identifier},
          },
          {
            label: "Assign to Me",
            command: "slackoscope.assignToMe",
            args: {issueId: linearIssue.id, identifier: linearIssue.identifier},
          },
          {
            label: "Set Status",
            command: "slackoscope.setStatus",
            args: {issueId: linearIssue.id, identifier: linearIssue.identifier},
          }
        )
      }

      builder.actions(...actions)

      return new vscode.Hover(builder.build())
    } catch (error) {
      console.error("Hover error:", error)
      if (error instanceof Error) {
        const md = new vscode.MarkdownString(`⚠️ **Error**: ${error.message}`)
        return new vscode.Hover(md)
      }
      return null
    }
  }
}
