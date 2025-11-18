export interface SlackoscopeSettings {
  slackToken: string
  linearToken?: string
  inline: InlineSettings
  hover: HoverSettings
  highlighting: HighlightingSettings
}

export interface InlineSettings {
  enabled: boolean
  position: 'right' | 'above' | 'below'
  showTime: boolean
  useRelativeTime: boolean
  showUser: boolean
  fontSize: number
  color: string
  fontStyle: 'normal' | 'italic'
  showChannelName: boolean
}

export interface HoverSettings {
  showChannel: boolean
  showFiles: boolean
}

export interface HighlightingSettings {
  enabled: boolean
  todayColor: string
  oldDays: number
  oldColor: string
}
