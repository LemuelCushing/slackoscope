import * as vscode from "vscode"
import type {SlackMessage, SlackUser, SlackChannel, ParsedSlackUrl} from "../types/slack"

/**
 * Mock SlackApi for testing
 * Can be configured with predefined responses for specific URLs
 */
export class MockSlackApi {
  private responses = new Map<string, string>()
  private defaultResponse = "Mock Slack message content"
  public readonly SLACK_URL_REGEX =
    /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?thread_ts=(\d+\.\d+)[^\s]*)?/

  setResponse(url: string, response: string): void {
    this.responses.set(url, response)
  }

  setDefaultResponse(response: string): void {
    this.defaultResponse = response
  }

  async getMessageContent(url: string): Promise<string> {
    return this.responses.get(url) ?? this.defaultResponse
  }

  parseSlackUrl(url: string): ParsedSlackUrl | null {
    const match = this.SLACK_URL_REGEX.exec(url)
    if (!match) return null

    const [fullUrl, channelId, rawTs, threadTs] = match
    const messageTs = `${rawTs.slice(0, -6)}.${rawTs.slice(-6)}`

    return {
      fullUrl,
      channelId,
      messageTs,
      threadTs
    }
  }

  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    // Return a mock message
    return {
      ts,
      user: "U1234567890",
      text: this.defaultResponse,
      channel: channelId
    }
  }

  async getThread(channelId: string, threadTs: string): Promise<{parent: SlackMessage; replies: SlackMessage[]}> {
    const parent: SlackMessage = {
      ts: threadTs,
      user: "U1234567890",
      text: "Mock thread parent message",
      channel: channelId
    }

    const replies: SlackMessage[] = [
      {
        ts: "1234567890.123457",
        user: "U1234567891",
        text: "Mock thread reply",
        channel: channelId
      }
    ]

    return {parent, replies}
  }

  async getUser(userId: string): Promise<SlackUser> {
    return {
      id: userId,
      name: "testuser",
      realName: "Test User",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg"
    }
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    return {
      id: channelId,
      name: "test-channel",
      isPrivate: false
    }
  }
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  checkIntervalMs = 100
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs))
  }

  return false
}

/**
 * Helper to create a test document with content
 */
export async function createTestDocument(
  content: string,
  language = "javascript"
): Promise<{doc: vscode.TextDocument; editor: vscode.TextEditor}> {
  const doc = await vscode.workspace.openTextDocument({
    content,
    language
  })
  const editor = await vscode.window.showTextDocument(doc)
  return {doc, editor}
}

/**
 * Helper to create a test document without showing it
 */
export async function createTestDocumentOnly(content: string, language = "javascript"): Promise<vscode.TextDocument> {
  return await vscode.workspace.openTextDocument({
    content,
    language
  })
}

/**
 * Helper to clean up test documents
 */
export async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.closeAllEditors")
}

/**
 * Execute hover provider and get results
 */
export async function getHoverContent(
  doc: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover[] | undefined> {
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>("vscode.executeHoverProvider", doc.uri, position)
  return hovers
}

/**
 * Extract markdown text from hover results
 */
export function extractHoverText(hovers: vscode.Hover[] | undefined): string {
  if (!hovers || hovers.length === 0) return ""

  return hovers
    .map(hover =>
      hover.contents
        .map(content => {
          if (typeof content === "string") return content
          if (content instanceof vscode.MarkdownString) return content.value
          return ""
        })
        .join("\n")
    )
    .join("\n")
}
