/**
 * SlackStore - In-memory cache for Slack resources.
 *
 * Session-based caching. Clears on extension reload.
 * This is intentional - Slack messages can be edited, so we want fresh data on reload.
 */

import type {SlackMessage, SlackUser, SlackChannel, SlackThread} from "./types"
import type {SlackUrl} from "./url"
import type {ISlackClient} from "./client"

export class SlackStore {
  private messages = new Map<string, SlackMessage>()
  private threads = new Map<string, SlackThread>()
  private users = new Map<string, SlackUser>()
  private channels = new Map<string, SlackChannel>()

  // Cache keys
  private messageKey(channelId: string, ts: string): string {
    return `${channelId}:${ts}`
  }

  // Message operations
  getMessage(channelId: string, ts: string): SlackMessage | undefined {
    return this.messages.get(this.messageKey(channelId, ts))
  }

  setMessage(channelId: string, ts: string, message: SlackMessage): void {
    this.messages.set(this.messageKey(channelId, ts), message)
  }

  // Thread operations
  getThread(threadTs: string): SlackThread | undefined {
    return this.threads.get(threadTs)
  }

  setThread(threadTs: string, thread: SlackThread): void {
    this.threads.set(threadTs, thread)
  }

  // User operations
  getUser(userId: string): SlackUser | undefined {
    return this.users.get(userId)
  }

  setUser(userId: string, user: SlackUser): void {
    this.users.set(userId, user)
  }

  // Channel operations
  getChannel(channelId: string): SlackChannel | undefined {
    return this.channels.get(channelId)
  }

  setChannel(channelId: string, channel: SlackChannel): void {
    this.channels.set(channelId, channel)
  }

  // Clear all
  clear(): void {
    this.messages.clear()
    this.threads.clear()
    this.users.clear()
    this.channels.clear()
  }

  // Stats for debugging
  stats() {
    return {
      messages: this.messages.size,
      threads: this.threads.size,
      users: this.users.size,
      channels: this.channels.size,
    }
  }
}

/**
 * High-level fetch-or-cache operations.
 * These combine the store (cache) with the client (HTTP).
 */
export class SlackLoader {
  constructor(
    private readonly client: ISlackClient,
    private readonly store: SlackStore
  ) {}

  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    const cached = this.store.getMessage(channelId, ts)
    if (cached) return cached

    const message = await this.client.getMessage(channelId, ts)
    this.store.setMessage(channelId, ts, message)
    return message
  }

  async getThread(channelId: string, threadTs: string): Promise<SlackThread> {
    const cached = this.store.getThread(threadTs)
    if (cached) return cached

    const thread = await this.client.getThread(channelId, threadTs)
    this.store.setThread(threadTs, thread)
    return thread
  }

  async getUser(userId: string): Promise<SlackUser> {
    const cached = this.store.getUser(userId)
    if (cached) return cached

    const user = await this.client.getUser(userId)
    this.store.setUser(userId, user)
    return user
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    const cached = this.store.getChannel(channelId)
    if (cached) return cached

    const channel = await this.client.getChannel(channelId)
    this.store.setChannel(channelId, channel)
    return channel
  }

  /**
   * Get all messages for a URL (single message or thread).
   * For single message URLs, also tries to fetch thread replies
   * to catch Linear Asks bot messages.
   */
  async getMessagesForUrl(url: SlackUrl): Promise<{
    target: SlackMessage
    all: SlackMessage[]
    replyCount: number
  }> {
    if (url.threadTs) {
      const thread = await this.getThread(url.channelId, url.threadTs)
      const all = [thread.parent, ...thread.replies]
      const target = all.find(m => m.ts === url.messageTs) ?? thread.parent
      return {target, all, replyCount: thread.replies.length}
    }

    // Single message URL
    const target = await this.getMessage(url.channelId, url.messageTs)
    const all = [target]

    // Try to fetch thread replies (message might be a thread parent)
    try {
      const thread = await this.getThread(url.channelId, target.ts)
      if (thread.replies.length > 0) {
        all.push(...thread.replies)
        return {target, all, replyCount: thread.replies.length}
      }
    } catch {
      // Not a thread parent - that's fine
    }

    return {target, all, replyCount: 0}
  }
}
