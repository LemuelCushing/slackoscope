/**
 * Mock implementations of API classes for testing
 *
 * This file contains clean mock implementations that are ONLY used in tests.
 * Production code in src/api/ has no knowledge of these mocks.
 */

import type {SlackMessage, SlackUser, SlackChannel, ParsedSlackUrl} from '../types/slack'
import type {LinearIssue, LinearComment} from '../types/linear'
import type {ISlackApi} from '../api/slackApi'
import type {ILinearApi} from '../api/linearApi'
import {SLACK_URL_REGEX} from '../api/slackApi'
import {
  TEST_MESSAGES,
  TEST_THREAD_REPLIES,
  getTestUser,
  getTestChannel,
  getTestLinearIssue
} from './fixtures'

/**
 * Mock Slack API that implements the same interface as the real SlackApi
 * but returns test fixtures instead of making real API calls
 */
export class MockSlackApi implements ISlackApi {
  public readonly SLACK_URL_REGEX = SLACK_URL_REGEX

  parseSlackUrl(url: string): ParsedSlackUrl | null {
    const match = this.SLACK_URL_REGEX.exec(url)
    if (!match) return null

    const [fullUrl, channelId, rawTs, threadTs] = match
    const messageTs = `${rawTs.slice(0, -6)}.${rawTs.slice(-6)}`

    return {fullUrl, channelId, messageTs, threadTs}
  }

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
      user: 'U1234567890',
      text: 'Mock Slack message content',
      channel: channelId
    }
  }

  async getThread(channelId: string, threadTs: string): Promise<{parent: SlackMessage; replies: SlackMessage[]}> {
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
        user: 'U1234567890',
        text: 'Mock thread parent message',
        channel: channelId
      },
      replies: [
        {
          ts: `${threadTs.split('.')[0]}.${(parseInt(threadTs.split('.')[1]) + 1).toString().padStart(6, '0')}`,
          user: 'U9876543210',
          text: 'Mock thread reply',
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
        name: 'testuser',
        realName: 'Test User',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg'
      }
    )
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    const fixtureChannel = getTestChannel(channelId)
    return (
      fixtureChannel ?? {
        id: channelId,
        name: 'test-channel',
        isPrivate: false
      }
    )
  }
}

/**
 * Mock Linear API that implements the same interface as the real LinearApi
 * but returns test fixtures instead of making real API calls
 */
export class MockLinearApi implements ILinearApi {
  async getIssue(issueId: string): Promise<LinearIssue> {
    const fixtureIssue = getTestLinearIssue(issueId)
    if (fixtureIssue) return fixtureIssue

    return {
      id: issueId,
      identifier: issueId,
      title: 'Mock Linear Issue',
      url: `https://linear.app/test/issue/${issueId}`,
      state: {
        name: 'In Progress',
        type: 'started'
      }
    }
  }

  async getIssueByIdentifier(identifier: string): Promise<LinearIssue> {
    const fixtureIssue = getTestLinearIssue(identifier)
    if (fixtureIssue) return fixtureIssue

    return {
      id: 'mock-id',
      identifier,
      title: 'Mock Linear Issue',
      url: `https://linear.app/test/issue/${identifier}`,
      state: {
        name: 'In Progress',
        type: 'started'
      }
    }
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    return {
      id: 'mock-comment-id',
      body,
      createdAt: new Date().toISOString()
    }
  }
}
