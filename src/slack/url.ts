/**
 * SlackUrl - A parsed Slack message URL.
 *
 * This is a value object representing a validated Slack URL.
 * It can only be created through `parseSlackUrl()`, ensuring all
 * instances are valid.
 *
 * Pure module - no VS Code imports, no HTTP calls, fully testable.
 */

export const SLACK_URL_REGEX =
  /https:\/\/([a-zA-Z0-9-]+)\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?thread_ts=(\d+\.\d+)[^\s]*)?/

/** Global variant for matchAll — each call to matchAll resets state, so sharing is safe. */
export const SLACK_URL_REGEX_GLOBAL = new RegExp(SLACK_URL_REGEX.source, "g")

export interface SlackUrl {
  readonly raw: string
  readonly workspace: string
  readonly channelId: string
  readonly messageTs: string
  readonly threadTs?: string
}

/**
 * Parse a Slack URL into its components.
 *
 * @example
 * parseSlackUrl('https://myworkspace.slack.com/archives/C1234ABCD/p1234567890123456')
 * // => { raw: '...', workspace: 'myworkspace', channelId: 'C1234ABCD', messageTs: '1234567890.123456' }
 *
 * parseSlackUrl('https://myworkspace.slack.com/archives/C1234/p1234567890123456?thread_ts=1234567890.345678')
 * // => { ..., threadTs: '1234567890.345678' }
 *
 * parseSlackUrl('not a slack url')
 * // => null
 */
export function parseSlackUrl(raw: string): SlackUrl | null {
  const match = SLACK_URL_REGEX.exec(raw)
  if (!match) return null

  const [fullUrl, workspace, channelId, rawTs, threadTs] = match
  const messageTs = formatTimestamp(rawTs)

  return {
    raw: fullUrl,
    workspace,
    channelId,
    messageTs,
    threadTs,
  }
}

/**
 * Convert Slack's compact timestamp (p1234567890123456) to API format (1234567890.123456)
 */
function formatTimestamp(rawTs: string): string {
  return `${rawTs.slice(0, -6)}.${rawTs.slice(-6)}`
}

// Derived properties as functions - more composable than methods

export const isThread = (url: SlackUrl): boolean => url.threadTs !== undefined

export const cacheKey = (url: SlackUrl): string =>
  url.threadTs ? `${url.channelId}:${url.threadTs}` : `${url.channelId}:${url.messageTs}`

export const messageCacheKey = (url: SlackUrl): string => `${url.channelId}:${url.messageTs}`

/**
 * Find all Slack URLs in a string.
 */
export function findAllSlackUrls(text: string): SlackUrl[] {
  return [...text.matchAll(SLACK_URL_REGEX_GLOBAL)]
    .map(match => parseSlackUrl(match[0]))
    .filter((url): url is SlackUrl => url !== null)
}
