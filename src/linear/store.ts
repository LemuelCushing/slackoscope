/**
 * LinearStore - In-memory cache for Linear resources and URL associations.
 */

import type {LinearIssue, LinearUrlMetadata} from "./types"
import type {SlackUrl} from "../slack/url"
import type {SlackMessage} from "../slack/types"
import type {ILinearClient} from "./client"
import {findLinearIssueInMessages} from "./detector"

export class LinearStore {
  /** Cached Linear issues by identifier (e.g., 'TST-123') */
  private issues = new Map<string, LinearIssue>()

  /** Cached URL-to-Linear associations. Key is `channelId:ts` */
  private urlMetadata = new Map<string, LinearUrlMetadata>()

  // Issue operations
  getIssue(identifier: string): LinearIssue | undefined {
    return this.issues.get(identifier)
  }

  setIssue(identifier: string, issue: LinearIssue): void {
    this.issues.set(identifier, issue)
  }

  // URL metadata operations
  private metadataKey(url: SlackUrl): string {
    const ts = url.threadTs ?? url.messageTs
    return `${url.channelId}:${ts}`
  }

  /**
   * Get cached URL metadata.
   * Returns `undefined` if not checked yet, `null` if checked and none found.
   */
  getUrlMetadata(url: SlackUrl): LinearUrlMetadata | undefined {
    return this.urlMetadata.get(this.metadataKey(url))
  }

  setUrlMetadata(url: SlackUrl, metadata: LinearUrlMetadata): void {
    this.urlMetadata.set(this.metadataKey(url), metadata)
  }

  // Clear all
  clear(): void {
    this.issues.clear()
    this.urlMetadata.clear()
  }

  stats() {
    return {
      issues: this.issues.size,
      urlMetadata: this.urlMetadata.size,
    }
  }
}

/**
 * LinearLoader - fetch-or-cache operations for Linear.
 */
export class LinearLoader {
  constructor(
    private readonly client: ILinearClient | null,
    private readonly store: LinearStore
  ) {}

  /**
   * Get Linear issue, fetching from API if not cached.
   * Returns null if no Linear client configured.
   */
  async getIssue(identifier: string): Promise<LinearIssue | null> {
    if (!this.client) return null

    const cached = this.store.getIssue(identifier)
    if (cached) return cached

    try {
      const issue = await this.client.getIssueByIdentifier(identifier)
      this.store.setIssue(identifier, issue)
      return issue
    } catch (error) {
      console.error("Failed to fetch Linear issue:", error)
      return null
    }
  }

  /**
   * Detect and cache Linear metadata from Slack messages.
   * Call this after fetching messages to pre-populate the cache.
   */
  async cacheMetadataFromMessages(url: SlackUrl, messages: SlackMessage[]): Promise<void> {
    // Already cached?
    if (this.store.getUrlMetadata(url) !== undefined) return

    // Find Linear issue in messages
    const identifier = findLinearIssueInMessages(messages)

    if (!identifier || !this.client) {
      this.store.setUrlMetadata(url, null)
      return
    }

    // Fetch full issue
    const issue = await this.getIssue(identifier)
    if (!issue) {
      this.store.setUrlMetadata(url, null)
      return
    }

    this.store.setUrlMetadata(url, {
      issueId: issue.id,
      identifier: issue.identifier,
    })
  }

  /**
   * Get Linear metadata for a URL, returning cached value or fetching if needed.
   * `messages` should be the Slack messages for the URL.
   */
  async getMetadataForUrl(url: SlackUrl, messages: SlackMessage[]): Promise<LinearUrlMetadata | undefined> {
    await this.cacheMetadataFromMessages(url, messages)
    return this.store.getUrlMetadata(url)
  }
}
