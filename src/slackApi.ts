import * as vscode from "vscode"
import {URLSearchParams} from "url"

export const SLACK_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)/

export class SlackApi {
  private readonly token: string

  constructor() {
    this.token = vscode.workspace.getConfiguration("slackoscope").get<string>("token") ?? ""
  }

  async getMessageContent(url: string): Promise<string> {
    try {
      if (!this.token) {
        return "Slack API token not configured. Please set it in the extension settings."
      }
      const {channel, ts} = this.parseSlackUrl(url)
      const params = new URLSearchParams({channel, latest: ts, inclusive: "true", limit: "1"})

      const res = await fetch("https://slack.com/api/conversations.history", {
        method: "POST",
        headers: {Authorization: `Bearer ${this.token}`},
        body: params
      })

      const {ok, error, messages} = (await res.json()) as {ok: boolean; error?: string; messages?: {text?: string}[]}
      if (!ok) {
        console.error("Slack API error:", error)
        return "Error fetching Slack message."
      }

      const text = messages?.[0]?.text
      if (text) return text
      return messages?.length ? "No message content found." : "No message found."
    } catch (err) {
      console.error("Network or parsing error:", err)
      return "Error fetching Slack message."
    }
  }

  private parseSlackUrl(url: string) {
    const match = url.match(SLACK_URL_REGEX)
    if (!match) throw new Error("Invalid Slack URL")
    const [, channel, tsRaw] = match
    return {channel, ts: (parseInt(tsRaw, 10) / 1e6).toString()}
  }
}
