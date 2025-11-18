export interface SlackMessage {
  text: string
  user: string // User ID
  ts: string // Timestamp (Slack format)
  threadTs?: string // Thread parent timestamp
  replyCount?: number
  files?: SlackFile[]
  channel: string // Channel ID
  bot_profile?: SlackBotProfile
  attachments?: SlackAttachment[]
}

export interface SlackBotProfile {
  id: string
  name: string
  deleted?: boolean
  updated?: number
  app_id?: string
  user_id?: string
  icons?: {
    image_36?: string
    image_48?: string
    image_72?: string
  }
  team_id?: string
}

export interface SlackAttachment {
  from_url?: string
  id?: number
  [key: string]: unknown
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
