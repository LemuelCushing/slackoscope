import type {LinearIssue, LinearComment} from '../types/linear'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{message: string}>
}

export class LinearApi {
  private apiUrl = 'https://api.linear.app/graphql'
  private token: string

  constructor(token: string) {
    if (!token) throw new Error('Linear token is required')
    this.token = token
  }

  async getIssue(issueId: string): Promise<LinearIssue> {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          state {
            name
            type
          }
        }
      }
    `

    const response = await this.request<{issue: LinearIssue}>(query, {id: issueId})
    if (!response.issue) throw new Error('Issue not found')

    return response.issue
  }

  async getIssueByIdentifier(identifier: string): Promise<LinearIssue> {
    const query = `
      query GetIssueByIdentifier($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          state {
            name
            type
          }
        }
      }
    `

    const response = await this.request<{issue: LinearIssue}>(query, {id: identifier})
    if (!response.issue) throw new Error('Issue not found')

    return response.issue
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    const mutation = `
      mutation CreateComment($issueId: String!, $body: String!) {
        commentCreate(input: {issueId: $issueId, body: $body}) {
          success
          comment {
            id
            body
            createdAt
          }
        }
      }
    `

    const response = await this.request<{commentCreate: {success: boolean; comment: LinearComment}}>(mutation, {
      issueId,
      body
    })

    if (!response.commentCreate.success) {
      throw new Error('Failed to create comment')
    }

    return response.commentCreate.comment
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token
      },
      body: JSON.stringify({query, variables})
    })

    const result = (await response.json()) as GraphQLResponse<T>

    if (result.errors) {
      throw new Error(result.errors[0].message)
    }

    if (!result.data) {
      throw new Error('No data returned from Linear API')
    }

    return result.data
  }
}
