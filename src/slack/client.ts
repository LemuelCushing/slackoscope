/**
 * SlackClient - HTTP client for Slack API.
 *
 * Pure HTTP operations. No caching, no VS Code dependencies.
 * Caching is handled by the store layer.
 */

import type {SlackMessage, SlackUser, SlackChannel, SlackThread} from "./types"

export interface ISlackClient {
  getMessage(channelId: string, ts: string): Promise<SlackMessage>
  getThread(channelId: string, threadTs: string): Promise<SlackThread>
  getUser(userId: string): Promise<SlackUser>
  getChannel(channelId: string): Promise<SlackChannel>
}

export class SlackClient implements ISlackClient {
  constructor(private readonly token: string) {}

  private ensureToken(): void {
    if (!this.token) {
      throw new Error("Slack token not configured. Please set slackoscope.token in your VS Code settings.")
    }
  }

  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    this.ensureToken()

    const body = new URLSearchParams({
      channel: channelId,
      latest: ts,
      inclusive: "true",
      limit: "1",
    })

    const response = await fetch("https://slack.com/api/conversations.history", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${this.token}`,
      },
      body: body.toString(),
    })

    const data = (await response.json()) as {ok: boolean; error?: string; messages?: SlackMessage[]}
    if (!data.ok) throw new Error(data.error || "Failed to fetch message")
    if (!data.messages?.[0]) throw new Error("Message not found")

    return data.messages[0]
  }

  async getThread(channelId: string, threadTs: string): Promise<SlackThread> {
    this.ensureToken()

    const params = new URLSearchParams({
      channel: channelId,
      ts: threadTs,
    })

    const response = await fetch(`https://slack.com/api/conversations.replies?${params}`, {
      headers: {Authorization: `Bearer ${this.token}`},
    })

    const data = (await response.json()) as {ok: boolean; error?: string; messages?: SlackMessage[]}
    if (!data.ok) throw new Error(data.error || "Failed to fetch thread")
    if (!data.messages?.length) throw new Error("Thread not found")

    const [parent, ...replies] = data.messages
    return {parent, replies}
  }

  async getUser(userId: string): Promise<SlackUser> {
    this.ensureToken()

    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {Authorization: `Bearer ${this.token}`},
    })

    const data = (await response.json()) as {
      ok: boolean
      error?: string
      user: {
        id: string
        name: string
        real_name: string
        profile?: {display_name?: string; image_72?: string}
      }
    }
    if (!data.ok) throw new Error(data.error || "Failed to fetch user")

    const {user} = data
    return {
      id: user.id,
      name: user.name,
      realName: user.real_name,
      displayName: user.profile?.display_name || user.real_name,
      avatarUrl: user.profile?.image_72,
    }
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    this.ensureToken()

    const response = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      headers: {Authorization: `Bearer ${this.token}`},
    })

    const data = (await response.json()) as {
      ok: boolean
      error?: string
      channel: {id: string; name: string; is_private?: boolean}
    }
    if (!data.ok) throw new Error(data.error || "Failed to fetch channel")

    const {channel} = data
    return {
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private || false,
    }
  }
}
