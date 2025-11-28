export function formatMessagePreview(text: string, maxLength = 50): string {
  // Remove formatting characters, newlines
  const cleaned = text.replace(/[*_~`]/g, '').replace(/\n/g, ' ').trim()

  if (cleaned.length <= maxLength) return `"${cleaned}"`

  return `"${cleaned.slice(0, maxLength - 3)}..."`
}

export function formatTimestamp(ts: string, useRelative = false): string {
  const timestamp = parseFloat(ts) * 1000
  const date = new Date(timestamp)

  if (useRelative) {
    return formatRelativeTime(date)
  }

  // Format as "2:30 PM" or "Dec 15, 2:30 PM" if not today
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
}

export function getMessageAge(ts: string): 'today' | 'recent' | 'old' {
  const timestamp = parseFloat(ts) * 1000
  const date = new Date(timestamp)
  const now = new Date()

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return 'today'

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  return diffDays < 7 ? 'recent' : 'old'
}

const LINEAR_ISSUE_REGEX = /\b([A-Z]{2,}-\d+)\b/g
const LINEAR_URL_REGEX = /linear\.app\/[^/]+\/issue\/([A-Z]{2,}-\d+)/

export function findLinearIssues(text: string): string[] {
  const matches = text.matchAll(LINEAR_ISSUE_REGEX)
  const issues = new Set<string>()

  for (const match of matches) {
    issues.add(match[1])
  }

  return Array.from(issues)
}

export function extractLinearIssueFromMessage(message: {
  text: string
  bot_profile?: {name: string}
  attachments?: Array<{from_url?: string}>
}): string | null {
  // Check if this is a Linear Asks bot message
  if (message.bot_profile?.name === 'Linear Asks') {
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
