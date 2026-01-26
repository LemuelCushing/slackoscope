/**
 * Linear entity types.
 */

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  url: string
  state: LinearState
  updatedAt: string
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
  user?: {
    id: string
    name: string
  }
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

/**
 * The current authenticated user.
 */
export interface LinearViewer {
  id: string
  name: string
  email: string
}

/**
 * A workflow state in Linear.
 */
export interface LinearWorkflowState {
  id: string
  name: string
  color: string
  type: string
}
