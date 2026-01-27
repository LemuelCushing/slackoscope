/**
 * SlackStore - In-memory cache for Slack resources.
 *
 * Session-based caching. Clears on extension reload.
 * Also caches errors to avoid repeated API calls and console spam.
 */

import type {SlackMessage, SlackUser, SlackChannel, SlackThread} from "./types"
import type {SlackUrl} from "./url"
import type {ISlackClient} from "./client"

/** Cached result: either success or error */
type CacheEntry<T> = {ok: true; value: T} | {ok: false; error: string}

/**
 * Generic cache with error support.
 * Stores both successful results and errors to avoid repeated fetches.
 */
class Cache<T> {
  private entries = new Map<string, CacheEntry<T>>()

  get(key: string): CacheEntry<T> | undefined {
    return this.entries.get(key)
  }

  set(key: string, value: T): void {
    this.entries.set(key, {ok: true, value})
  }

  setError(key: string, error: string): void {
    this.entries.set(key, {ok: false, error})
  }

  clear(): void {
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }

  /**
   * Fetch-or-cache with error caching.
   * Returns cached value/error, or fetches and caches the result.
   */
  async fetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get(key)
    if (cached) {
      if (!cached.ok) throw new Error(cached.error)
      return cached.value
    }

    try {
      const value = await fetcher()
      this.set(key, value)
      return value
    } catch (error) {
      this.setError(key, error instanceof Error ? error.message : "Unknown error")
      throw error
    }
  }
}

export class SlackStore {
  readonly messages = new Cache<SlackMessage>()
  readonly threads = new Cache<SlackThread>()
  readonly users = new Cache<SlackUser>()
  readonly channels = new Cache<SlackChannel>()

  /** Cache key for channel-scoped resources (messages, threads) */
  static key(channelId: string, ts: string): string {
    return `${channelId}:${ts}`
  }

  clear(): void {
    this.messages.clear()
    this.threads.clear()
    this.users.clear()
    this.channels.clear()
  }

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
 * Combines the store (cache) with the client (HTTP).
 */
export class SlackLoader {
  constructor(
    private readonly client: ISlackClient,
    private readonly store: SlackStore
  ) {}

  getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    return this.store.messages.fetch(SlackStore.key(channelId, ts), () =>
      this.client.getMessage(channelId, ts)
    )
  }

  getThread(channelId: string, threadTs: string): Promise<SlackThread> {
    return this.store.threads.fetch(SlackStore.key(channelId, threadTs), () =>
      this.client.getThread(channelId, threadTs)
    )
  }

  getUser(userId: string): Promise<SlackUser> {
    return this.store.users.fetch(userId, () => this.client.getUser(userId))
  }

  getChannel(channelId: string): Promise<SlackChannel> {
    return this.store.channels.fetch(channelId, () => this.client.getChannel(channelId))
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
