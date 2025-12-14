import type {ILinearApi} from "../api/linearApi"
import type {ISlackApi} from "../api/slackApi"
import type {CacheManager} from "../cache/cacheManager"
import type {SlackMessage} from "../types/slack"

/**
 * Metadata about Linear issues associated with Slack URLs
 */
export type LinearUrlMetadata = {
  linearIssueId?: string // Linear's internal ID (e.g., "abc123...")
  linearIdentifier?: string // Human-readable identifier (e.g., "TST-123")
}

/**
 * Regular expressions for detecting Linear issues
 */
const LINEAR_ISSUE_REGEX = /\b([A-Z]{1,}-\d+)\b/g
const LINEAR_URL_REGEX = /linear\.app\/[^/]+\/issue\/([A-Z]{1,}-\d+)/

/**
 * Find all Linear issue identifiers in text
 */
export function findLinearIssues(text: string): string[] {
  const matches = text.matchAll(LINEAR_ISSUE_REGEX)
  const issues = new Set<string>()

  for (const match of matches) {
    issues.add(match[1])
  }

  return Array.from(issues)
}

/**
 * Extract Linear issue identifier from a Slack message
 * Handles both Linear Asks bot messages and regular text mentions
 */
export function extractLinearIssueFromMessage(message: {
  text: string
  bot_profile?: {name: string}
  attachments?: Array<{from_url?: string}>
}): string | null {
  // Check if this is a Linear Asks bot message
  if (message.bot_profile?.name === "Linear Asks") {
    if (message.attachments) {
      // Look for Linear URL in attachments
      for (const attachment of message.attachments) {
        if (attachment.from_url) {
          const match = attachment.from_url.match(LINEAR_URL_REGEX)
          if (match) {
            return match[1] // Return the issue identifier (e.g., "TST-10291")
          }
        }
      }
    }
  }

  // Fallback: check message text for Linear issue identifiers
  const issues = findLinearIssues(message.text)
  return issues.length > 0 ? issues[0] : null
}

/**
 * Detect Linear issues from already-fetched messages and cache the result.
 */
export async function cacheLinearMetadataFromMessages(
  url: string,
  messages: SlackMessage[],
  linearApi: ILinearApi | null,
  cacheManager: CacheManager
): Promise<void> {
  // Skip if already cached
  if (cacheManager.getUrlMetadata(url)) {
    return
  }

  // Detect Linear issue from messages
  let linearIdentifier: string | null = null
  for (const message of messages) {
    linearIdentifier = extractLinearIssueFromMessage(message)
    if (linearIdentifier) break
  }

  if (!linearIdentifier || !linearApi) {
    // No Linear issue found - cache that fact so we don't check again
    cacheManager.setUrlMetadata(url, {})
    return
  }

  // Fetch full Linear issue (with caching)
  let issue = cacheManager.getLinearIssue(linearIdentifier)
  if (!issue) {
    try {
      issue = await linearApi.getIssueByIdentifier(linearIdentifier)
      cacheManager.setLinearIssue(linearIdentifier, issue)
    } catch (error) {
      console.error("Failed to fetch Linear issue:", error)
      cacheManager.setUrlMetadata(url, {})
      return
    }
  }

  // Cache the URL → Linear association
  cacheManager.setUrlMetadata(url, {
    linearIssueId: issue.id,
    linearIdentifier: issue.identifier
  })
}

/**
 * Ensure URL metadata is cached, fetching messages if necessary.
 * Use this when you don't have the messages yet (e.g., in CodeActionProvider).
 *
 * This is the fallback path - will fetch messages from Slack if needed.
 */
export async function ensureUrlMetadataPopulated(
  url: string,
  slackApi: ISlackApi,
  linearApi: ILinearApi | null,
  cacheManager: CacheManager
): Promise<LinearUrlMetadata> {
  // Check cache first
  const cached = cacheManager.getUrlMetadata(url)
  if (cached !== undefined) {
    return cached
  }

  // Need to fetch messages
  const parsed = slackApi.parseSlackUrl(url)
  if (!parsed) {
    cacheManager.setUrlMetadata(url, {})
    return {}
  }

  // Fetch thread or message
  let messages: SlackMessage[]
  if (parsed.threadTs) {
    let thread = cacheManager.getThread(parsed.threadTs)
    if (!thread) {
      thread = await slackApi.getThread(parsed.channelId, parsed.threadTs)
      cacheManager.setThread(parsed.threadTs, thread)
    }
    messages = [thread.parent, ...thread.replies]
  } else {
    const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
    let message = cacheManager.getMessage(cacheKey)
    if (!message) {
      message = await slackApi.getMessage(parsed.channelId, parsed.messageTs)
      cacheManager.setMessage(cacheKey, message)
    }
    messages = [message]
  }

  await cacheLinearMetadataFromMessages(url, messages, linearApi, cacheManager)

  return cacheManager.getUrlMetadata(url) || {}
}
