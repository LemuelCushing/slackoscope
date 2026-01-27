/**
 * Formatting utilities for display.
 */

/** Time thresholds for relative formatting */
const TIME_THRESHOLDS: Array<{max: number; divisor: number; format: (n: number) => string}> = [
  {max: 60, divisor: 1, format: () => "just now"},
  {max: 3600, divisor: 60, format: n => `${n}m ago`},
  {max: 86400, divisor: 3600, format: n => `${n}h ago`},
  {max: 172800, divisor: 86400, format: () => "yesterday"},
  {max: 604800, divisor: 86400, format: n => `${n}d ago`},
]

/**
 * Format a date as relative time (e.g., "2 hours ago", "yesterday").
 */
export function formatRelativeTime(date: Date): string {
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000)

  for (const {max, divisor, format} of TIME_THRESHOLDS) {
    if (diffSecs < max) return format(Math.floor(diffSecs / divisor))
  }

  return date.toLocaleDateString()
}

/**
 * Format a date as absolute time (e.g., "Jan 15, 2:30 PM").
 */
export const formatAbsoluteTime = (date: Date): string =>
  date.toLocaleString(undefined, {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"})

/**
 * Convert a Slack timestamp string to a Date.
 */
export const slackTsToDate = (ts: string): Date => new Date(parseFloat(ts) * 1000)

/**
 * Truncate text to a max length, adding ellipsis if truncated.
 */
export const truncate = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : text.slice(0, maxLength - 1) + "…"

/**
 * Collapse multi-line text to a single line for inline display.
 */
export const collapseLine = (text: string): string => text.replace(/\n/g, " ↵ ").trim()
