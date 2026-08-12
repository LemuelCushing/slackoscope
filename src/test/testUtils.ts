import * as vscode from "vscode"
import type {SlackFile} from "../slack"

/**
 * Create a mock SlackFile for testing
 */
export function createMockFile(overrides?: Partial<SlackFile>): SlackFile {
  return {
    id: "F1234567890",
    name: "test-file.txt",
    mimetype: "text/plain",
    url_private_download: "https://files.slack.com/files-pri/T123/F123/download/test-file.txt",
    url_private: "https://files.slack.com/files-pri/T123/F123/test-file.txt",
    permalink: "https://workspace.slack.com/files/U123/F123/test-file.txt",
    size: 1024,
    ...overrides
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

/**
 * The quoted message body of a hover, without any of the surrounding chrome.
 *
 * Action links embed the line they act on, so two hovers over the same URL on
 * different lines differ by design. Assertions about what was *fetched* (and
 * therefore cached) should compare the message, not the chrome around it.
 */
export function extractHoverMessage(hoverText: string): string {
  return hoverText
    .split("\n")
    .filter(line => line.startsWith("> "))
    .join("\n")
}
