import type {SlackMessage, SlackUser, SlackChannel} from '../types/slack'
import type {LinearIssue} from '../types/linear'
import type {Cache} from './cacheTypes'

class SimpleCache<T> implements Cache<T> {
  private map = new Map<string, T>()

  get(key: string): T | undefined {
    return this.map.get(key)
  }

  set(key: string, value: T): void {
    this.map.set(key, value)
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

export class CacheManager {
  private messageCache = new SimpleCache<SlackMessage>()
  private userCache = new SimpleCache<SlackUser>()
  private channelCache = new SimpleCache<SlackChannel>()
  private threadCache = new SimpleCache<{parent: SlackMessage; replies: SlackMessage[]}>()
  private linearIssueCache = new SimpleCache<LinearIssue>()

  // Message cache
  getMessage(key: string): SlackMessage | undefined {
    return this.messageCache.get(key)
  }

  setMessage(key: string, message: SlackMessage): void {
    this.messageCache.set(key, message)
  }

  // User cache
  getUser(userId: string): SlackUser | undefined {
    return this.userCache.get(userId)
  }

  setUser(userId: string, user: SlackUser): void {
    this.userCache.set(userId, user)
  }

  // Channel cache
  getChannel(channelId: string): SlackChannel | undefined {
    return this.channelCache.get(channelId)
  }

  setChannel(channelId: string, channel: SlackChannel): void {
    this.channelCache.set(channelId, channel)
  }

  // Thread cache
  getThread(threadTs: string): {parent: SlackMessage; replies: SlackMessage[]} | undefined {
    return this.threadCache.get(threadTs)
  }

  setThread(threadTs: string, thread: {parent: SlackMessage; replies: SlackMessage[]}): void {
    this.threadCache.set(threadTs, thread)
  }

  // Linear issue cache
  getLinearIssue(identifier: string): LinearIssue | undefined {
    return this.linearIssueCache.get(identifier)
  }

  setLinearIssue(identifier: string, issue: LinearIssue): void {
    this.linearIssueCache.set(identifier, issue)
  }

  // Global operations
  clearAll(): void {
    this.messageCache.clear()
    this.userCache.clear()
    this.channelCache.clear()
    this.threadCache.clear()
    this.linearIssueCache.clear()
  }

  getStats(): {messages: number; users: number; channels: number; threads: number; linearIssues: number} {
    return {
      messages: this.messageCache.size,
      users: this.userCache.size,
      channels: this.channelCache.size,
      threads: this.threadCache.size,
      linearIssues: this.linearIssueCache.size
    }
  }
}
