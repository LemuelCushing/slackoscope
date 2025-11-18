export interface LinearIssue {
  id: string
  identifier: string // e.g., "ENG-123"
  title: string
  url: string
  state: {
    name: string
    type: string // "started", "completed", etc.
  }
}

export interface LinearComment {
  id: string
  body: string
  createdAt: string
}
