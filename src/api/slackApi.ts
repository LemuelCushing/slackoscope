import type {SlackMessage, SlackUser, SlackChannel, ParsedSlackUrl} from '../types/slack'

export const SLACK_URL_REGEX =
  /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?thread_ts=(\d+\.\d+))?/

export class SlackApi {
  private token: string
  public readonly SLACK_URL_REGEX = SLACK_URL_REGEX

  constructor(token: string) {
    if (!token) throw new Error('Slack token is required')
    this.token = token
  }

  parseSlackUrl(url: string): ParsedSlackUrl | null {
    const match = SLACK_URL_REGEX.exec(url)
    if (!match) return null

    const [fullUrl, channelId, rawTs, threadTs] = match
    const messageTs = `${rawTs.slice(0, -6)}.${rawTs.slice(-6)}`

    return {
      fullUrl,
      channelId,
      messageTs,
      threadTs
    }
  }

  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    const url = 'https://slack.com/api/conversations.history'
    const body = new URLSearchParams({
      channel: channelId,
      latest: ts,
      inclusive: 'true',
      limit: '1'
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${this.token}`
      },
      body: body.toString()
    })

    const data = (await response.json()) as {ok: boolean; error?: string; messages?: SlackMessage[]}
    if (!data.ok) throw new Error(data.error || 'Failed to fetch message')
    if (!data.messages?.[0]) throw new Error('Message not found')

    return data.messages[0]
  }

  async getThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
    const url = 'https://slack.com/api/conversations.replies'
    const params = new URLSearchParams({
      channel: channelId,
      ts: threadTs
    })

    const response = await fetch(`${url}?${params}`, {
      headers: {Authorization: `Bearer ${this.token}`}
    })

    const data = (await response.json()) as {ok: boolean; error?: string; messages?: SlackMessage[]}
    if (!data.ok) throw new Error(data.error || 'Failed to fetch thread')

    return data.messages || []
  }

  async getThread(channelId: string, threadTs: string): Promise<{parent: SlackMessage; replies: SlackMessage[]}> {
    const messages = await this.getThreadReplies(channelId, threadTs)

    if (messages.length === 0) {
      throw new Error('Thread not found')
    }

    const parent = messages[0]
    const replies = messages.slice(1)

    return {parent, replies}
  }

  async getUser(userId: string): Promise<SlackUser> {
    const url = `https://slack.com/api/users.info?user=${userId}`
    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${this.token}`}
    })

    const data = (await response.json()) as {ok: boolean; error?: string; user: {id: string; name: string; real_name: string; profile?: {display_name?: string; image_72?: string}}}
    if (!data.ok) throw new Error(data.error || 'Failed to fetch user')

    const user = data.user
    return {
      id: user.id,
      name: user.name,
      realName: user.real_name,
      displayName: user.profile?.display_name || user.real_name,
      avatarUrl: user.profile?.image_72
    }
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    const url = `https://slack.com/api/conversations.info?channel=${channelId}`
    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${this.token}`}
    })

    const data = (await response.json()) as {ok: boolean; error?: string; channel: {id: string; name: string; is_private?: boolean}}
    if (!data.ok) throw new Error(data.error || 'Failed to fetch channel')

    const channel = data.channel
    return {
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private || false
    }
  }
}
