/**
 * Slack entity types.
 */

export interface SlackMessage {
  text: string
  user: string
  ts: string
  threadTs?: string
  replyCount?: number
  files?: SlackFile[]
  channel: string
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
  url?: string
  url_private?: string
  url_private_download?: string
  permalink?: string
  thumb?: string
  size: number
}

export interface SlackThread {
  parent: SlackMessage
  replies: SlackMessage[]
}
