import * as vscode from "vscode"

/**
 * Mock SlackApi for testing
 * Can be configured with predefined responses for specific URLs
 */
export class MockSlackApi {
  private responses = new Map<string, string>()
  private defaultResponse = "Mock Slack message content"

  setResponse(url: string, response: string): void {
    this.responses.set(url, response)
  }

  setDefaultResponse(response: string): void {
    this.defaultResponse = response
  }

  async getMessageContent(url: string): Promise<string> {
    return this.responses.get(url) ?? this.defaultResponse
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
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    doc.uri,
    position
  )
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
