import type {ILinearApi} from "../api/linearApi"
import type {ISlackApi} from "../api/slackApi"
import type {CacheManager} from "../cache/cacheManager"
import type {ParsedSlackUrl, SlackMessage} from "../types/slack"
import {getOrFetchMessagesForUrl} from "./slackData"

/**
 * Metadata about Linear issues associated with Slack URLs
 */
export type LinearUrlMetadata = {
  linearIssueId?: string // Linear's internal ID (e.g., "abc123...")
  linearIdentifier?: string // Human-readable identifier (e.g., "TST-123")
}

/**
 * Regular expressions for detecting Linear issues
 * Linear issue identifiers require at least 2 uppercase letters (e.g., AB-123, TST-456)
 */
const LINEAR_ISSUE_REGEX = /\b([A-Z]{2,}-\d+)\b/g
const LINEAR_URL_REGEX = /linear\.app\/[^/]+\/issue\/([A-Z]{2,}-\d+)/

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
  slack: ParsedSlackUrl,
  messages: SlackMessage[],
  linearApi: ILinearApi | null,
  cacheManager: CacheManager
): Promise<void> {
  const key = linearMetadataKeyFor(slack)

  // Skip if already cached
  if (cacheManager.getLinearMetadata(key) !== undefined) {
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
    cacheManager.setLinearMetadata(key, null)
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
      cacheManager.setLinearMetadata(key, null)
      return
    }
  }

  // Cache the Slack message/thread → Linear association
  cacheManager.setLinearMetadata(key, {
    linearIssueId: issue.id,
    linearIdentifier: issue.identifier
  })
}

function linearMetadataKeyFor(slack: ParsedSlackUrl): string {
  const id = slack.threadTs ?? slack.messageTs
  return `${slack.channelId}:${id}`
}

/**
 * Get URL metadata from cache, fetching messages if needed.
 * Use this when you don't have the messages yet (e.g., in CodeActionProvider).
 *
 * This is the fallback path - will fetch messages from Slack if needed.
 */
export async function getOrFetchLinearMetadata(
  slack: ParsedSlackUrl,
  slackApi: ISlackApi,
  linearApi: ILinearApi | null,
  cacheManager: CacheManager
): Promise<LinearUrlMetadata | null> {
  const key = linearMetadataKeyFor(slack)

  // Check cache first
  const cached = cacheManager.getLinearMetadata(key)
  if (cached !== undefined) {
    return cached
  }

  const {messages} = await getOrFetchMessagesForUrl(slackApi, cacheManager, slack)

  await cacheLinearMetadataFromMessages(slack, messages, linearApi, cacheManager)

  return cacheManager.getLinearMetadata(key) ?? null
}
