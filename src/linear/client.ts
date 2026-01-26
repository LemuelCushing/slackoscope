/**
 * LinearClient - HTTP client for Linear GraphQL API.
 */

import type {LinearIssue, LinearComment, LinearViewer, LinearWorkflowState} from "./types"

export interface ILinearClient {
  getIssueByIdentifier(identifier: string): Promise<LinearIssue>
  createComment(issueId: string, body: string): Promise<LinearComment>
  getComments(issueId: string): Promise<LinearComment[]>
  updateComment(commentId: string, body: string): Promise<LinearComment>
  getViewer(): Promise<LinearViewer>
  assignIssue(issueId: string, assigneeId: string | null): Promise<LinearIssue>
  updateIssueState(issueId: string, stateId: string): Promise<LinearIssue>
  getWorkflowStates(issueId: string): Promise<LinearWorkflowState[]>
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
          updatedAt
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

  async getComments(issueId: string): Promise<LinearComment[]> {
    const query = `
      query IssueComments($issueId: String!) {
        issue(id: $issueId) {
          comments {
            nodes {
              id
              body
              createdAt
              user {
                id
                name
              }
            }
          }
        }
      }
    `

    const data = await this.query<{issue: {comments: {nodes: LinearComment[]}}}>(query, {issueId})
    return data.issue.comments.nodes
  }

  async updateComment(commentId: string, body: string): Promise<LinearComment> {
    const query = `
      mutation UpdateComment($commentId: String!, $body: String!) {
        commentUpdate(id: $commentId, input: { body: $body }) {
          success
          comment {
            id
            body
            createdAt
            user {
              id
              name
            }
          }
        }
      }
    `

    const data = await this.query<{commentUpdate: {comment: LinearComment}}>(query, {commentId, body})
    return data.commentUpdate.comment
  }

  async getViewer(): Promise<LinearViewer> {
    const query = `
      query Viewer {
        viewer {
          id
          name
          email
        }
      }
    `

    const data = await this.query<{viewer: LinearViewer}>(query)
    return data.viewer
  }

  async assignIssue(issueId: string, assigneeId: string | null): Promise<LinearIssue> {
    const query = `
      mutation AssignIssue($issueId: String!, $assigneeId: String) {
        issueUpdate(id: $issueId, input: { assigneeId: $assigneeId }) {
          success
          issue {
            id
            identifier
            title
            url
            updatedAt
            state {
              id
              name
              color
              type
            }
          }
        }
      }
    `

    const data = await this.query<{issueUpdate: {issue: LinearIssue}}>(query, {issueId, assigneeId})
    return data.issueUpdate.issue
  }

  async updateIssueState(issueId: string, stateId: string): Promise<LinearIssue> {
    const query = `
      mutation UpdateIssueState($issueId: String!, $stateId: String!) {
        issueUpdate(id: $issueId, input: { stateId: $stateId }) {
          success
          issue {
            id
            identifier
            title
            url
            updatedAt
            state {
              id
              name
              color
              type
            }
          }
        }
      }
    `

    const data = await this.query<{issueUpdate: {issue: LinearIssue}}>(query, {issueId, stateId})
    return data.issueUpdate.issue
  }

  async getWorkflowStates(issueId: string): Promise<LinearWorkflowState[]> {
    // First get the issue's team, then get workflow states for that team
    const issueQuery = `
      query IssueTeam($issueId: String!) {
        issue(id: $issueId) {
          team {
            id
          }
        }
      }
    `

    const issueData = await this.query<{issue: {team: {id: string}}}>(issueQuery, {issueId})
    const teamId = issueData.issue.team.id

    const statesQuery = `
      query WorkflowStates($teamId: ID!) {
        workflowStates(filter: { team: { id: { eq: $teamId } } }) {
          nodes {
            id
            name
            color
            type
          }
        }
      }
    `

    const statesData = await this.query<{workflowStates: {nodes: LinearWorkflowState[]}}>(statesQuery, {teamId})
    return statesData.workflowStates.nodes
  }
}
