import type {SlackMessage, SlackUser, SlackChannel, SlackFile} from "../types/slack"
import type {LinearIssue} from "../types/linear"

/**
 * Test fixtures for realistic mock data
 */

export const TEST_USERS: Record<string, SlackUser> = {
  U1234567890: {
    id: "U1234567890",
    name: "alice",
    realName: "Alice Johnson",
    displayName: "Alice",
    avatarUrl: "https://example.com/avatars/alice.jpg"
  },
  U9876543210: {
    id: "U9876543210",
    name: "bob",
    realName: "Bob Smith",
    displayName: "Bob",
    avatarUrl: "https://example.com/avatars/bob.jpg"
  },
  UBOT123456: {
    id: "UBOT123456",
    name: "linearbot",
    realName: "Linear Asks Bot",
    displayName: "Linear Asks",
    avatarUrl: "https://example.com/avatars/linear.jpg"
  }
}

export const TEST_CHANNELS: Record<string, SlackChannel> = {
  C1234ABCD: {
    id: "C1234ABCD",
    name: "general",
    isPrivate: false
  },
  C5678EFGH: {
    id: "C5678EFGH",
    name: "engineering",
    isPrivate: false
  },
  G9012IJKL: {
    id: "G9012IJKL",
    name: "private-team",
    isPrivate: true
  }
}

export const TEST_FILES: Record<string, SlackFile> = {
  textFile: {
    id: "F1234567890",
    name: "document.txt",
    mimetype: "text/plain",
    url_private_download: "https://files.slack.com/files-pri/T123/F123/download/document.txt",
    url_private: "https://files.slack.com/files-pri/T123/F123/document.txt",
    permalink: "https://workspace.slack.com/files/U123/F123/document.txt",
    size: 1024
  },
  imageFile: {
    id: "F9876543210",
    name: "screenshot.png",
    mimetype: "image/png",
    url_private_download: "https://files.slack.com/files-pri/T123/F987/download/screenshot.png",
    url_private: "https://files.slack.com/files-pri/T123/F987/screenshot.png",
    permalink: "https://workspace.slack.com/files/U123/F987/screenshot.png",
    thumb: "https://files.slack.com/files-tmb/T123/F987/screenshot_thumb.png",
    size: 524288
  },
  pdfFile: {
    id: "F5555555555",
    name: "report.pdf",
    mimetype: "application/pdf",
    url_private_download: "https://files.slack.com/files-pri/T123/F555/download/report.pdf",
    url_private: "https://files.slack.com/files-pri/T123/F555/report.pdf",
    permalink: "https://workspace.slack.com/files/U123/F555/report.pdf",
    size: 2097152
  }
}

export const TEST_MESSAGES: Record<string, SlackMessage> = {
  simple: {
    ts: "1234567890.123456",
    user: "U1234567890",
    text: "This is a simple test message",
    channel: "C1234ABCD"
  },
  withFiles: {
    ts: "1234567890.234567",
    user: "U1234567890",
    text: "Check out these files",
    channel: "C1234ABCD",
    files: [TEST_FILES.textFile, TEST_FILES.imageFile]
  },
  threadParent: {
    ts: "1234567890.345678",
    user: "U1234567890",
    text: "This is a thread parent message",
    channel: "C1234ABCD",
    threadTs: "1234567890.345678",
    replyCount: 3
  },
  linearBot: {
    ts: "1234567890.456789",
    user: "UBOT123456",
    text: "Linear issue created",
    channel: "C5678EFGH",
    bot_profile: {
      id: "B123456",
      name: "Linear Asks"
    },
    attachments: [
      {
        from_url: "https://linear.app/company/issue/ENG-1234"
      }
    ]
  },
  multiline: {
    ts: "1234567890.567890",
    user: "U9876543210",
    text: "This is a multi-line message\nWith several lines\nAnd some more content\n\nEven a blank line!",
    channel: "C1234ABCD"
  }
}

export const TEST_THREAD_REPLIES: SlackMessage[] = [
  {
    ts: "1234567890.345679",
    user: "U9876543210",
    text: "First reply to thread",
    channel: "C1234ABCD",
    threadTs: "1234567890.345678"
  },
  {
    ts: "1234567890.345680",
    user: "UBOT123456",
    text: "Linear issue",
    channel: "C1234ABCD",
    threadTs: "1234567890.345678",
    bot_profile: {
      id: "B123456",
      name: "Linear Asks"
    },
    attachments: [
      {
        from_url: "https://linear.app/company/issue/TST-10291"
      }
    ]
  },
  {
    ts: "1234567890.345681",
    user: "U1234567890",
    text: "Last reply",
    channel: "C1234ABCD",
    threadTs: "1234567890.345678"
  }
]

export const TEST_LINEAR_ISSUES: Record<string, LinearIssue> = {
  "ENG-1234": {
    id: "issue-id-1",
    identifier: "ENG-1234",
    title: "Implement new feature",
    url: "https://linear.app/company/issue/ENG-1234",
    state: {
      name: "In Progress",
      type: "started"
    }
  },
  "TST-10291": {
    id: "issue-id-2",
    identifier: "TST-10291",
    title: "Fix bug in test suite",
    url: "https://linear.app/company/issue/TST-10291",
    state: {
      name: "Done",
      type: "completed"
    }
  },
  "PROJ-555": {
    id: "issue-id-3",
    identifier: "PROJ-555",
    title: "Update documentation",
    url: "https://linear.app/company/issue/PROJ-555",
    state: {
      name: "Todo",
      type: "unstarted"
    }
  }
}

export const TEST_SLACK_URLS = {
  simple: "https://workspace.slack.com/archives/C1234ABCD/p1234567890123456",
  withFiles: "https://workspace.slack.com/archives/C1234ABCD/p1234567890234567",
  threadParent: "https://workspace.slack.com/archives/C1234ABCD/p1234567890345678",
  threadReply: "https://workspace.slack.com/archives/C1234ABCD/p1234567890345679?thread_ts=1234567890.345678",
  linearBot: "https://workspace.slack.com/archives/C5678EFGH/p1234567890456789",
  multiline: "https://workspace.slack.com/archives/C1234ABCD/p1234567890567890"
}

/**
 * Get a test message by timestamp
 */
export function getTestMessage(ts: string): SlackMessage | undefined {
  return Object.values(TEST_MESSAGES).find(msg => msg.ts === ts)
}

/**
 * Get a test user by ID
 */
export function getTestUser(userId: string): SlackUser | undefined {
  return TEST_USERS[userId]
}

/**
 * Get a test channel by ID
 */
export function getTestChannel(channelId: string): SlackChannel | undefined {
  return TEST_CHANNELS[channelId]
}

/**
 * Get a test Linear issue by identifier
 */
export function getTestLinearIssue(identifier: string): LinearIssue | undefined {
  return TEST_LINEAR_ISSUES[identifier]
}
