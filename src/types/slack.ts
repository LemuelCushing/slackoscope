export interface SlackMessage {
  text: string
  user: string // User ID
  ts: string // Timestamp (Slack format)
  threadTs?: string // Thread parent timestamp
  replyCount?: number
  files?: SlackFile[]
  channel: string // Channel ID
}

export interface SlackUser {
  id: string
  name: string
  realName: string
  displayName: string
  avatarUrl?: string
}

export interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
}

export interface SlackFile {
  id: string
  name: string
  mimetype: string
  url: string
  thumb?: string // Thumbnail URL for images
  size: number
}

export interface SlackThread {
  parentTs: string
  replies: SlackMessage[]
  replyCount: number
}

export interface ParsedSlackUrl {
  fullUrl: string
  channelId: string
  messageTs: string
  threadTs?: string
}
