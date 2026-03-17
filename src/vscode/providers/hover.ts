/**
 * HoverProvider - Shows message preview when hovering over Slack URLs.
 */

import * as vscode from "vscode"
import type {LinearIssue} from "../../linear"
import type {Settings} from "../config"
import type {LoaderDependencies} from "../dependencies"
import {SlackUrlOccurrence} from "../editor"
import {HoverContentBuilder, type ActionDef} from "../renderers"

export class HoverProvider implements vscode.HoverProvider {
  constructor(
    private readonly deps: LoaderDependencies,
    private settings: Settings
  ) {}

  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null> {
    const occurrence = SlackUrlOccurrence.at(document, position)
    if (!occurrence) return null

    try {
      const {url} = occurrence

      // Fetch messages
      const {target, all, replyCount} = await this.deps.slackLoader.getMessagesForUrl(url)

      // Build hover content
      const builder = new HoverContentBuilder()

      // Channel
      if (this.settings.hover.showChannel) {
        const channel = await this.deps.slackLoader.getChannel(url.channelId)
        builder.channel(channel, !!url.threadTs)
      }

      // Author
      const user = await this.deps.slackLoader.getUser(target.user)
      const context = url.threadTs ? (target.ts === url.threadTs ? "Thread started" : "Thread reply") : undefined
      builder.author(user, target, context)

      // Message + reply count (tucked right below)
      builder.message(target.text)
      builder.replies(replyCount)

      // Files
      if (this.settings.hover.showFiles && target.files?.length) {
        builder.files(target.files, this.settings.hover.showFileInfo)
      }

      // Linear issue detection
      const linearMetadata = await this.deps.linearLoader.getMetadataForUrl(url, all)
      let linearIssue: LinearIssue | null = null
      if (linearMetadata) {
        linearIssue = await this.deps.linearLoader.getIssue(linearMetadata.identifier)
      }

      // Linear info
      builder.linearInfo(linearIssue ?? undefined)

      // Actions — separated from content
      builder.separator()

      const slackActions: ActionDef[] = [
        {label: "⨁ Insert comment", command: "slackoscope.insertCommentedMessage", args: {url: url.raw, linearIdentifier: linearIssue?.identifier}},
        {label: "↻ Refresh", command: "slackoscope.refreshMessage", args: {url: url.raw}},
      ]

      const linearActions: ActionDef[] = linearIssue
        ? [
            {label: `⏎ Post to ${linearIssue.identifier}`, command: "slackoscope.postToLinear", args: {issueId: linearIssue.id, identifier: linearIssue.identifier}},
            {label: `𖨆 Assign to me`, command: "slackoscope.assignToMe", args: {issueId: linearIssue.id, identifier: linearIssue.identifier}},
            {label: `𜳨 Set status`, command: "slackoscope.setStatus", args: {issueId: linearIssue.id, identifier: linearIssue.identifier}},
          ]
        : []

      builder.actionRows(slackActions, linearActions)

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
