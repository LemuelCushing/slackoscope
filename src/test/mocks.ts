/**
 * Mock implementations of client classes for testing
 *
 * This file contains clean mock implementations that are ONLY used in tests.
 * Production code has no knowledge of these mocks.
 */

import type {SlackMessage, SlackUser, SlackChannel, SlackThread} from "../slack"
import type {LinearIssue, LinearComment, LinearViewer, LinearWorkflowState} from "../linear"
import type {ISlackClient} from "../slack"
import type {ILinearClient} from "../linear"
import {
  TEST_MESSAGES,
  TEST_THREAD_REPLIES,
  getTestUser,
  getTestChannel,
  getTestLinearIssue,
  getTestWorkflowStates,
  getTestViewer
} from "./fixtures"

/**
 * Mock Slack client that implements the same interface as SlackClient
 * but returns test fixtures instead of making real API calls
 */
export class MockSlackClient implements ISlackClient {
  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    // Check if this is a known fixture message
    const fixtureMessage = Object.values(TEST_MESSAGES).find(msg => msg.ts === ts)
    if (fixtureMessage) {
      return {...fixtureMessage, channel: channelId}
    }

    // Check thread replies
    const threadReply = TEST_THREAD_REPLIES.find(msg => msg.ts === ts)
    if (threadReply) {
      return {...threadReply, channel: channelId}
    }

    // Return mock data for unknown messages
    return {
      ts,
      user: "U1234567890",
      text: "Mock Slack message content",
      channel: channelId
    }
  }

  async getThread(channelId: string, threadTs: string): Promise<SlackThread> {
    // Check if this is the known thread parent
    if (threadTs === TEST_MESSAGES.threadParent.ts) {
      return {
        parent: {...TEST_MESSAGES.threadParent, channel: channelId},
        replies: TEST_THREAD_REPLIES.map(reply => ({...reply, channel: channelId}))
      }
    }

    // Return mock thread for unknown threads
    return {
      parent: {
        ts: threadTs,
        user: "U1234567890",
        text: "Mock thread parent message",
        channel: channelId
      },
      replies: [
        {
          ts: `${threadTs.split(".")[0]}.${(parseInt(threadTs.split(".")[1]) + 1).toString().padStart(6, "0")}`,
          user: "U9876543210",
          text: "Mock thread reply",
          channel: channelId
        }
      ]
    }
  }

  async getUser(userId: string): Promise<SlackUser> {
    const fixtureUser = getTestUser(userId)
    return (
      fixtureUser ?? {
        id: userId,
        name: "testuser",
        realName: "Test User",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg"
      }
    )
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    const fixtureChannel = getTestChannel(channelId)
    return (
      fixtureChannel ?? {
        id: channelId,
        name: "test-channel",
        isPrivate: false
      }
    )
  }
}

/**
 * Mock Linear client that implements the same interface as LinearClient
 * but returns test fixtures instead of making real API calls
 */
export class MockLinearClient implements ILinearClient {
  async getIssueByIdentifier(identifier: string): Promise<LinearIssue> {
    const fixtureIssue = getTestLinearIssue(identifier)
    if (fixtureIssue) return fixtureIssue

    return {
      id: "mock-id",
      identifier,
      title: "Mock Linear Issue",
      url: `https://linear.app/test/issue/${identifier}`,
      state: {
        id: "mock-state-id",
        name: "In Progress",
        color: "#f39c12",
        type: "started"
      }
    }
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    return {
      id: "mock-comment-id",
      body,
      createdAt: new Date().toISOString()
    }
  }

  async getComments(_issueId: string): Promise<LinearComment[]> {
    return [
      {
        id: "mock-comment-1",
        body: "First mock comment",
        createdAt: new Date().toISOString(),
        user: {id: "mock-user-id", name: "Mock User"}
      }
    ]
  }

  async updateComment(commentId: string, body: string): Promise<LinearComment> {
    return {
      id: commentId,
      body,
      createdAt: new Date().toISOString(),
      user: {id: "mock-user-id", name: "Mock User"}
    }
  }

  async getViewer(): Promise<LinearViewer> {
    return getTestViewer()
  }

  async assignIssue(issueId: string, _assigneeId: string | null): Promise<LinearIssue> {
    return {
      id: issueId,
      identifier: "MOCK-123",
      title: "Mock assigned issue",
      url: "https://linear.app/test/issue/MOCK-123",
      state: {id: "mock-state-id", name: "In Progress", color: "#f39c12", type: "started"}
    }
  }

  async updateIssueState(issueId: string, stateId: string): Promise<LinearIssue> {
    return {
      id: issueId,
      identifier: "MOCK-123",
      title: "Mock issue with updated state",
      url: "https://linear.app/test/issue/MOCK-123",
      state: {id: stateId, name: "Done", color: "#27ae60", type: "completed"}
    }
  }

  async getWorkflowStates(_issueId: string): Promise<LinearWorkflowState[]> {
    return getTestWorkflowStates()
  }
}
