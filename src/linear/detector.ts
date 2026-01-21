/**
 * Linear issue detection - pure functions for finding Linear issues in text.
 *
 * No HTTP calls, no VS Code dependencies.
 */

import type {SlackMessage} from "../slack/types"

/**
 * Minimal message shape for Linear detection.
 * Only the fields we actually inspect (loose for testing).
 */
interface MessageLike {
  text: string
  bot_profile?: {name: string}
  attachments?: Array<{from_url?: string}>
}

/**
 * Pattern for Linear issue identifiers (e.g., TST-123, ABC-456)
 * Requires at least 2 uppercase letters in the prefix.
 */
const LINEAR_ISSUE_REGEX = /\b([A-Z]{2,}-\d+)\b/g

/**
 * Pattern for Linear URLs containing issue identifiers.
 */
const LINEAR_URL_REGEX = /linear\.app\/[^/]+\/issue\/([A-Z]{2,}-\d+)/

/**
 * Find all Linear issue identifiers in text.
 *
 * @example
 * findLinearIssues('Fix TST-123 and ABC-456')
 * // => ['TST-123', 'ABC-456']
 */
export function findLinearIssues(text: string): string[] {
  const issues = new Set<string>()
  for (const match of text.matchAll(LINEAR_ISSUE_REGEX)) {
    issues.add(match[1])
  }
  return [...issues]
}

/**
 * Extract a Linear issue identifier from a Slack message.
 *
 * Checks:
 * 1. Linear Asks bot attachments (preferred - most reliable)
 * 2. Message text (fallback)
 *
 * Returns the first issue found, or null.
 */
export function extractLinearIssueFromMessage(message: MessageLike): string | null {
  // Check Linear Asks bot attachments first
  if (message.bot_profile?.name === "Linear Asks" && message.attachments) {
    for (const attachment of message.attachments) {
      if (attachment.from_url) {
        const match = attachment.from_url.match(LINEAR_URL_REGEX)
        if (match) return match[1]
      }
    }
  }

  // Fallback: check message text
  const issues = findLinearIssues(message.text)
  return issues[0] ?? null
}

/**
 * Find a Linear issue in a list of messages.
 * Returns the first issue found.
 */
export function findLinearIssueInMessages(messages: SlackMessage[]): string | null {
  for (const message of messages) {
    const issueId = extractLinearIssueFromMessage(message)
    if (issueId) return issueId
  }
  return null
}
