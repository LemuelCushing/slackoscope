/**
 * LinearClient - HTTP client for Linear GraphQL API.
 */

import type {LinearIssue, LinearComment} from "./types"

export interface ILinearClient {
  getIssueByIdentifier(identifier: string): Promise<LinearIssue>
  createComment(issueId: string, body: string): Promise<LinearComment>
}

export class LinearClient implements ILinearClient {
  private readonly endpoint = "https://api.linear.app/graphql"

  constructor(private readonly token: string) {}

  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.token,
      },
      body: JSON.stringify({query, variables}),
    })

    const result = (await response.json()) as {data?: T; errors?: Array<{message: string}>}

    if (result.errors?.length) {
      throw new Error(result.errors[0].message)
    }

    if (!result.data) {
      throw new Error("No data returned from Linear API")
    }

    return result.data
  }

  async getIssueByIdentifier(identifier: string): Promise<LinearIssue> {
    const query = `
      query IssueByIdentifier($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          url
          state {
            id
            name
            color
            type
          }
        }
      }
    `

    const data = await this.query<{issue: LinearIssue}>(query, {identifier})
    return data.issue
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    const query = `
      mutation CreateComment($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
          comment {
            id
            body
            createdAt
          }
        }
      }
    `

    const data = await this.query<{commentCreate: {comment: LinearComment}}>(query, {issueId, body})
    return data.commentCreate.comment
  }
}
