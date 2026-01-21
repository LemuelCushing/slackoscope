/**
 * Linear entity types.
 */

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  url: string
  state: LinearState
}

export interface LinearState {
  id: string
  name: string
  color: string
  type: string
}

export interface LinearComment {
  id: string
  body: string
  createdAt: string
}

/**
 * Metadata linking a Slack URL to a Linear issue.
 * `null` means we checked and found nothing.
 * `undefined` means we haven't checked yet.
 */
export type LinearUrlMetadata = {
  issueId: string
  identifier: string
} | null
