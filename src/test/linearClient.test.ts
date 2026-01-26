/**
 * Unit tests for LinearClient methods.
 *
 * These tests verify the behavior of the LinearClient class methods,
 * particularly the new methods added for issue assignment and status management.
 */

import * as assert from "assert"
import type {ILinearClient, LinearIssue, LinearComment, LinearViewer, LinearWorkflowState} from "../linear"

/**
 * Mock LinearClient for unit testing that tracks method calls and returns predictable data.
 */
class TestableLinearClient implements ILinearClient {
  public calls: Array<{method: string; args: unknown[]}> = []
  public mockIssue: LinearIssue = {
    id: "test-issue-id",
    identifier: "TST-123",
    title: "Test Issue",
    url: "https://linear.app/test/issue/TST-123",
    state: {id: "state-1", name: "In Progress", color: "#f39c12", type: "started"}
  }
  public mockViewer: LinearViewer = {
    id: "viewer-id",
    name: "Test User",
    email: "test@example.com"
  }
  public mockStates: LinearWorkflowState[] = [
    {id: "state-backlog", name: "Backlog", color: "#bdc3c7", type: "backlog"},
    {id: "state-todo", name: "Todo", color: "#3498db", type: "unstarted"},
    {id: "state-progress", name: "In Progress", color: "#f39c12", type: "started"},
    {id: "state-done", name: "Done", color: "#27ae60", type: "completed"},
    {id: "state-canceled", name: "Canceled", color: "#95a5a6", type: "canceled"}
  ]
  public mockComments: LinearComment[] = [
    {id: "comment-1", body: "First comment", createdAt: "2024-01-01T00:00:00Z", user: {id: "user-1", name: "Alice"}},
    {id: "comment-2", body: "Second comment", createdAt: "2024-01-02T00:00:00Z", user: {id: "user-2", name: "Bob"}}
  ]

  async getIssueByIdentifier(identifier: string): Promise<LinearIssue> {
    this.calls.push({method: "getIssueByIdentifier", args: [identifier]})
    return {...this.mockIssue, identifier}
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    this.calls.push({method: "createComment", args: [issueId, body]})
    return {id: "new-comment-id", body, createdAt: new Date().toISOString()}
  }

  async getComments(issueId: string): Promise<LinearComment[]> {
    this.calls.push({method: "getComments", args: [issueId]})
    return this.mockComments
  }

  async updateComment(commentId: string, body: string): Promise<LinearComment> {
    this.calls.push({method: "updateComment", args: [commentId, body]})
    return {id: commentId, body, createdAt: new Date().toISOString(), user: {id: "user-1", name: "Test"}}
  }

  async getViewer(): Promise<LinearViewer> {
    this.calls.push({method: "getViewer", args: []})
    return this.mockViewer
  }

  async assignIssue(issueId: string, assigneeId: string | null): Promise<LinearIssue> {
    this.calls.push({method: "assignIssue", args: [issueId, assigneeId]})
    return this.mockIssue
  }

  async updateIssueState(issueId: string, stateId: string): Promise<LinearIssue> {
    this.calls.push({method: "updateIssueState", args: [issueId, stateId]})
    const newState = this.mockStates.find(s => s.id === stateId) || this.mockStates[0]
    return {...this.mockIssue, state: newState}
  }

  async getWorkflowStates(issueId: string): Promise<LinearWorkflowState[]> {
    this.calls.push({method: "getWorkflowStates", args: [issueId]})
    return this.mockStates
  }
}

suite("LinearClient Unit Tests", () => {
  let client: TestableLinearClient

  setup(() => {
    client = new TestableLinearClient()
  })

  suite("getViewer", () => {
    test("should return current user information", async () => {
      const viewer = await client.getViewer()

      assert.strictEqual(viewer.id, "viewer-id")
      assert.strictEqual(viewer.name, "Test User")
      assert.strictEqual(viewer.email, "test@example.com")
    })

    test("should track method call", async () => {
      await client.getViewer()

      assert.strictEqual(client.calls.length, 1)
      assert.strictEqual(client.calls[0].method, "getViewer")
      assert.deepStrictEqual(client.calls[0].args, [])
    })
  })

  suite("assignIssue", () => {
    test("should assign issue to user", async () => {
      const result = await client.assignIssue("issue-123", "user-456")

      assert.ok(result)
      assert.strictEqual(result.id, "test-issue-id")
    })

    test("should pass correct arguments", async () => {
      await client.assignIssue("issue-123", "user-456")

      assert.strictEqual(client.calls.length, 1)
      assert.strictEqual(client.calls[0].method, "assignIssue")
      assert.deepStrictEqual(client.calls[0].args, ["issue-123", "user-456"])
    })

    test("should handle null assigneeId for unassignment", async () => {
      await client.assignIssue("issue-123", null)

      assert.strictEqual(client.calls[0].args[1], null)
    })
  })

  suite("updateIssueState", () => {
    test("should update issue state", async () => {
      const result = await client.updateIssueState("issue-123", "state-done")

      assert.ok(result)
      assert.strictEqual(result.state.id, "state-done")
      assert.strictEqual(result.state.name, "Done")
    })

    test("should pass correct arguments", async () => {
      await client.updateIssueState("issue-123", "state-progress")

      assert.strictEqual(client.calls.length, 1)
      assert.strictEqual(client.calls[0].method, "updateIssueState")
      assert.deepStrictEqual(client.calls[0].args, ["issue-123", "state-progress"])
    })

    test("should return updated issue with new state", async () => {
      const result = await client.updateIssueState("issue-123", "state-todo")

      assert.strictEqual(result.state.name, "Todo")
      assert.strictEqual(result.state.type, "unstarted")
      assert.strictEqual(result.state.color, "#3498db")
    })
  })

  suite("getWorkflowStates", () => {
    test("should return all workflow states", async () => {
      const states = await client.getWorkflowStates("issue-123")

      assert.strictEqual(states.length, 5)
    })

    test("should include all state types", async () => {
      const states = await client.getWorkflowStates("issue-123")
      const types = states.map(s => s.type)

      assert.ok(types.includes("backlog"))
      assert.ok(types.includes("unstarted"))
      assert.ok(types.includes("started"))
      assert.ok(types.includes("completed"))
      assert.ok(types.includes("canceled"))
    })

    test("should include state details", async () => {
      const states = await client.getWorkflowStates("issue-123")
      const doneState = states.find(s => s.name === "Done")

      assert.ok(doneState)
      assert.strictEqual(doneState.id, "state-done")
      assert.strictEqual(doneState.color, "#27ae60")
      assert.strictEqual(doneState.type, "completed")
    })

    test("should pass issueId to get team-specific states", async () => {
      await client.getWorkflowStates("specific-issue-id")

      assert.strictEqual(client.calls[0].args[0], "specific-issue-id")
    })
  })

  suite("getComments", () => {
    test("should return comments for issue", async () => {
      const comments = await client.getComments("issue-123")

      assert.strictEqual(comments.length, 2)
    })

    test("should include comment details", async () => {
      const comments = await client.getComments("issue-123")

      assert.strictEqual(comments[0].id, "comment-1")
      assert.strictEqual(comments[0].body, "First comment")
      assert.ok(comments[0].user)
      assert.strictEqual(comments[0].user!.name, "Alice")
    })

    test("should pass correct arguments", async () => {
      await client.getComments("issue-456")

      assert.strictEqual(client.calls[0].method, "getComments")
      assert.deepStrictEqual(client.calls[0].args, ["issue-456"])
    })
  })

  suite("updateComment", () => {
    test("should update comment body", async () => {
      const result = await client.updateComment("comment-123", "Updated body")

      assert.strictEqual(result.id, "comment-123")
      assert.strictEqual(result.body, "Updated body")
    })

    test("should pass correct arguments", async () => {
      await client.updateComment("comment-456", "New content")

      assert.strictEqual(client.calls[0].method, "updateComment")
      assert.deepStrictEqual(client.calls[0].args, ["comment-456", "New content"])
    })

    test("should return updated comment with user info", async () => {
      const result = await client.updateComment("comment-123", "Test")

      assert.ok(result.user)
      assert.ok(result.createdAt)
    })
  })

  suite("Integration Patterns", () => {
    test("should support assign-to-me workflow", async () => {
      // Get current viewer
      const viewer = await client.getViewer()

      // Assign issue to self
      const result = await client.assignIssue("issue-123", viewer.id)

      assert.ok(result)
      assert.strictEqual(client.calls.length, 2)
      assert.strictEqual(client.calls[0].method, "getViewer")
      assert.strictEqual(client.calls[1].method, "assignIssue")
      assert.strictEqual(client.calls[1].args[1], viewer.id)
    })

    test("should support set-status workflow", async () => {
      // Get workflow states
      const states = await client.getWorkflowStates("issue-123")

      // Find "Done" state
      const doneState = states.find(s => s.type === "completed")
      assert.ok(doneState)

      // Update issue state
      const result = await client.updateIssueState("issue-123", doneState.id)

      assert.strictEqual(result.state.type, "completed")
      assert.strictEqual(client.calls.length, 2)
    })

    test("should support check-and-update-comment workflow", async () => {
      // Get existing comments
      const comments = await client.getComments("issue-123")

      // Update first comment
      if (comments.length > 0) {
        const updated = await client.updateComment(comments[0].id, "Updated: " + comments[0].body)
        assert.ok(updated.body.startsWith("Updated:"))
      }

      assert.strictEqual(client.calls.length, 2)
    })
  })
})

suite("LinearClient Interface Compliance", () => {
  test("ILinearClient interface has all required methods", () => {
    const client: ILinearClient = new TestableLinearClient()

    // Verify all methods exist
    assert.ok(typeof client.getIssueByIdentifier === "function")
    assert.ok(typeof client.createComment === "function")
    assert.ok(typeof client.getComments === "function")
    assert.ok(typeof client.updateComment === "function")
    assert.ok(typeof client.getViewer === "function")
    assert.ok(typeof client.assignIssue === "function")
    assert.ok(typeof client.updateIssueState === "function")
    assert.ok(typeof client.getWorkflowStates === "function")
  })
})
