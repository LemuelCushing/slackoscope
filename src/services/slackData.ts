import type {ISlackApi} from "../api/slackApi"
import type {CacheManager} from "../cache/cacheManager"
import type {ParsedSlackUrl, SlackChannel, SlackMessage, SlackUser} from "../types/slack"

export async function getOrFetchMessage(
  slackApi: ISlackApi,
  cacheManager: CacheManager,
  channelId: string,
  ts: string
): Promise<SlackMessage> {
  const cached = cacheManager.getMessage(channelId, ts)
  if (cached) return cached

  const message = await slackApi.getMessage(channelId, ts)
  cacheManager.setMessage(channelId, ts, message)
  return message
}

export async function getOrFetchThread(
  slackApi: ISlackApi,
  cacheManager: CacheManager,
  channelId: string,
  threadTs: string
): Promise<{parent: SlackMessage; replies: SlackMessage[]}> {
  const cached = cacheManager.getThread(threadTs)
  if (cached) return cached

  const thread = await slackApi.getThread(channelId, threadTs)
  cacheManager.setThread(threadTs, thread)
  return thread
}

export async function getOrFetchUser(
  slackApi: ISlackApi,
  cacheManager: CacheManager,
  userId: string
): Promise<SlackUser> {
  const cached = cacheManager.getUser(userId)
  if (cached) return cached

  const user = await slackApi.getUser(userId)
  cacheManager.setUser(userId, user)
  return user
}

export async function getOrFetchChannel(
  slackApi: ISlackApi,
  cacheManager: CacheManager,
  channelId: string
): Promise<SlackChannel> {
  const cached = cacheManager.getChannel(channelId)
  if (cached) return cached

  const channel = await slackApi.getChannel(channelId)
  cacheManager.setChannel(channelId, channel)
  return channel
}

export type SlackMessagesForUrl = {
  targetMessage: SlackMessage
  messages: SlackMessage[]
  replyCount: number
}

export async function getOrFetchMessagesForUrl(
  slackApi: ISlackApi,
  cacheManager: CacheManager,
  parsed: ParsedSlackUrl
): Promise<SlackMessagesForUrl> {
  if (parsed.threadTs) {
    const thread = await getOrFetchThread(slackApi, cacheManager, parsed.channelId, parsed.threadTs)
    const messages = [thread.parent, ...thread.replies]
    const targetMessage = messages.find(m => m.ts === parsed.messageTs) ?? thread.parent
    return {targetMessage, messages, replyCount: thread.replies.length}
  }

  const targetMessage = await getOrFetchMessage(slackApi, cacheManager, parsed.channelId, parsed.messageTs)
  return {targetMessage, messages: [targetMessage], replyCount: 0}
}
