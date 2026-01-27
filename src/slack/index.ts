/**
 * Slack module - everything Slack-related.
 *
 * @example
 * import {parseSlackUrl, SlackClient, SlackStore, SlackLoader} from '@slack'
 */

// URL parsing (pure, no dependencies)
export {
  SLACK_URL_REGEX,
  SLACK_URL_REGEX_GLOBAL,
  parseSlackUrl,
  findAllSlackUrls,
  isThread,
  cacheKey,
  messageCacheKey,
  type SlackUrl,
} from "./url"

// Types
export type {
  SlackMessage,
  SlackUser,
  SlackChannel,
  SlackFile,
  SlackThread,
  SlackBotProfile,
  SlackAttachment,
} from "./types"

// Client (HTTP)
export {SlackClient, type ISlackClient} from "./client"

// Store (caching) and Loader (fetch-or-cache)
export {SlackStore, SlackLoader} from "./store"
