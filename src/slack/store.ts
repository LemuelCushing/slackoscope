/**
 * SlackStore - In-memory cache for Slack resources.
 *
 * Session-based caching. Clears on extension reload.
 * This is intentional - Slack messages can be edited, so we want fresh data on reload.
 *
 * Also caches errors (like "not_in_channel") to avoid repeated API calls and console spam.
 */

import type {SlackMessage, SlackUser, SlackChannel, SlackThread} from "./types"
import type {SlackUrl} from "./url"
import type {ISlackClient} from "./client"

/** Wrapper for cached values that may be errors */
type CacheEntry<T> = {ok: true; value: T} | {ok: false; error: string}

export class SlackStore {
  private messages = new Map<string, CacheEntry<SlackMessage>>()
  private threads = new Map<string, CacheEntry<SlackThread>>()
  private users = new Map<string, CacheEntry<SlackUser>>()
  private channels = new Map<string, CacheEntry<SlackChannel>>()

  // Cache keys
  private messageKey(channelId: string, ts: string): string {
    return `${channelId}:${ts}`
  }

  // Message operations
  getMessage(channelId: string, ts: string): CacheEntry<SlackMessage> | undefined {
    return this.messages.get(this.messageKey(channelId, ts))
  }

  setMessage(channelId: string, ts: string, message: SlackMessage): void {
    this.messages.set(this.messageKey(channelId, ts), {ok: true, value: message})
  }

  setMessageError(channelId: string, ts: string, error: string): void {
    this.messages.set(this.messageKey(channelId, ts), {ok: false, error})
  }

  // Thread operations
  getThread(threadTs: string): CacheEntry<SlackThread> | undefined {
    return this.threads.get(threadTs)
  }

  setThread(threadTs: string, thread: SlackThread): void {
    this.threads.set(threadTs, {ok: true, value: thread})
  }

  setThreadError(threadTs: string, error: string): void {
    this.threads.set(threadTs, {ok: false, error})
  }

  // User operations
  getUser(userId: string): CacheEntry<SlackUser> | undefined {
    return this.users.get(userId)
  }

  setUser(userId: string, user: SlackUser): void {
    this.users.set(userId, {ok: true, value: user})
  }

  setUserError(userId: string, error: string): void {
    this.users.set(userId, {ok: false, error})
  }

  // Channel operations
  getChannel(channelId: string): CacheEntry<SlackChannel> | undefined {
    return this.channels.get(channelId)
  }

  setChannel(channelId: string, channel: SlackChannel): void {
    this.channels.set(channelId, {ok: true, value: channel})
  }

  setChannelError(channelId: string, error: string): void {
    this.channels.set(channelId, {ok: false, error})
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
 *
 * Errors are cached to avoid repeated API calls and console spam.
 * The cache is session-based, so errors clear on extension reload.
 */
export class SlackLoader {
  constructor(
    private readonly client: ISlackClient,
    private readonly store: SlackStore
  ) {}

  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    const cached = this.store.getMessage(channelId, ts)
    if (cached) {
      if (!cached.ok) throw new Error(cached.error)
      return cached.value
    }

    try {
      const message = await this.client.getMessage(channelId, ts)
      this.store.setMessage(channelId, ts, message)
      return message
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      this.store.setMessageError(channelId, ts, errorMessage)
      throw error
    }
  }

  async getThread(channelId: string, threadTs: string): Promise<SlackThread> {
    const cached = this.store.getThread(threadTs)
    if (cached) {
      if (!cached.ok) throw new Error(cached.error)
      return cached.value
    }

    try {
      const thread = await this.client.getThread(channelId, threadTs)
      this.store.setThread(threadTs, thread)
      return thread
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      this.store.setThreadError(threadTs, errorMessage)
      throw error
    }
  }

  async getUser(userId: string): Promise<SlackUser> {
    const cached = this.store.getUser(userId)
    if (cached) {
      if (!cached.ok) throw new Error(cached.error)
      return cached.value
    }

    try {
      const user = await this.client.getUser(userId)
      this.store.setUser(userId, user)
      return user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      this.store.setUserError(userId, errorMessage)
      throw error
    }
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    const cached = this.store.getChannel(channelId)
    if (cached) {
      if (!cached.ok) throw new Error(cached.error)
      return cached.value
    }

    try {
      const channel = await this.client.getChannel(channelId)
      this.store.setChannel(channelId, channel)
      return channel
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      this.store.setChannelError(channelId, errorMessage)
      throw error
    }
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
