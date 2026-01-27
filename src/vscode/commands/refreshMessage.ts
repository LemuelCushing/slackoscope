/**
 * refreshMessage command - Invalidate cache for a specific Slack URL.
 *
 * Removes the message and thread entries so the next hover fetches fresh data.
 */

import * as vscode from "vscode"
import {parseSlackUrl, SlackStore} from "../../slack"

export function refreshMessage(slackStore: SlackStore, args: {url: string}): void {
  const url = parseSlackUrl(args.url)
  if (!url) return

  const key = SlackStore.key(url.channelId, url.messageTs)
  slackStore.messages.remove(key)

  // Also invalidate thread cache (message may be a thread parent, or part of a thread)
  slackStore.threads.remove(key)
  if (url.threadTs) {
    slackStore.threads.remove(SlackStore.key(url.channelId, url.threadTs))
  }

  vscode.window.showInformationMessage("Slackoscope: Refreshed — hover again to see updated content")
}
