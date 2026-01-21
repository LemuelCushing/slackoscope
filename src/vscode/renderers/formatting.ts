/**
 * Formatting utilities for display.
 */

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday").
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

/**
 * Format a date as absolute time (e.g., "Jan 15, 2:30 PM").
 */
export function formatAbsoluteTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Format a Slack timestamp string to a Date.
 */
export function slackTsToDate(ts: string): Date {
  return new Date(parseFloat(ts) * 1000)
}

/**
 * Truncate text to a max length, adding ellipsis if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + "…"
}

/**
 * Collapse multi-line text to a single line for inline display.
 */
export function collapseLine(text: string): string {
  return text.replace(/\n/g, " ↵ ").trim()
}
