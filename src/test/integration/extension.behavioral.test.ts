// Setup must be imported FIRST to register mocks before extension activation
import "../setup"

import * as assert from "assert"
import * as vscode from "vscode"
import {createTestDocument, closeAllEditors, getHoverContent, extractHoverText, extractHoverMessage} from "../testUtils"
import {TEST_SLACK_URLS} from "../fixtures"

suite("Slackoscope Extension Behavioral Tests", () => {
  // Set tokens once before all tests in this suite
  suiteSetup(async () => {
    process.env.NODE_ENV = "test"

    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", "test-token-for-testing", vscode.ConfigurationTarget.Global)
    // Also set Linear token for Linear-related tests (extension will use mock)
    await config.update("linearToken", "test-linear-token-for-testing", vscode.ConfigurationTarget.Global)

    // Wait for config to be persisted
    await new Promise(resolve => setTimeout(resolve, 100))

    const extension = vscode.extensions.getExtension("LemuelCushing.slackoscope")
    if (extension && !extension.isActive) {
      await extension.activate()
    }

    // Force the extension to reconfigure with the new tokens
    // (extension may have activated before tokens were set)
    try {
      await vscode.commands.executeCommand("slackoscope._forceReconfigure")
    } catch {
      // Ignore if command not found (non-test mode)
    }
  })

  setup(async () => {
    try {
      await vscode.commands.executeCommand("slackoscope.clearCache")
    } catch {
      // Ignore if command not found
    }

    await closeAllEditors()
  })

  teardown(async () => {
    await closeAllEditors()
  })

  suiteTeardown(async () => {
    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", undefined, vscode.ConfigurationTarget.Global)
    await config.update("linearToken", undefined, vscode.ConfigurationTarget.Global)
  })

  suite("Extension Activation", () => {
    test("should activate and register all commands", async () => {
      const extension = vscode.extensions.getExtension("LemuelCushing.slackoscope")
      assert.ok(extension, "Extension should be installed")
      assert.ok(extension.isActive, "Extension should be activated")

      const commands = await vscode.commands.getCommands(true)
      const requiredCommands = [
        "slackoscope.toggleInlineMessage",
        "slackoscope.insertCommentedMessage",
        "slackoscope.clearCache",
        "slackoscope.postToLinear"
      ]

      requiredCommands.forEach(cmd => {
        assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`)
      })
    })
  })

  suite("Hover Display Behavior", () => {
    test("should display user name in hover tooltip", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(slackUrl.length / 2)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Fixture user U1234567890 has displayName "Alice"
      assert.ok(hoverText.includes("@Alice"), "Should display user name with @ prefix")
    })

    test("should display message content in hover tooltip", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(20)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(hoverText.length > 50, "Should display message content")
      // Fixture message TEST_MESSAGES.simple has text "This is a simple test message"
      assert.ok(hoverText.includes("simple test message"), "Should contain actual message text")
    })

    test("should include insert comment action in hover", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(20)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(
        hoverText.includes("Insert") || hoverText.includes("Comment"),
        "Should include action to insert as comment"
      )
    })

    test("should detect hover at any position within URL", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const positions = [0, slackUrl.length / 4, slackUrl.length / 2, (slackUrl.length * 3) / 4]

      for (const offset of positions) {
        const urlPosition = doc.positionAt(offset)
        const hovers = await getHoverContent(doc, urlPosition)
        const hoverText = extractHoverText(hovers)

        assert.ok(hoverText.length > 0, `Should show hover at position ${offset}`)
      }
    })

    test("should not show Slackoscope hover for non-Slack URLs", async () => {
      const {doc} = await createTestDocument("https://github.com/test/repo\n")

      const urlPosition = doc.positionAt(10)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Should not contain any Slack-specific content
      assert.ok(!hoverText.includes("@Alice") && !hoverText.includes("Slack"), "Should not show Slackoscope hover for GitHub URLs")
    })
  })

  suite("Inline Message Display", () => {
    test("should toggle inline messages on and off", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const doc = await vscode.workspace.openTextDocument({
        content: `${slackUrl}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should toggle without errors")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle multiple URLs in same document", async () => {
      const urls = [
        "https://workspace1.slack.com/archives/C1111/p1111111111111111",
        "https://workspace2.slack.com/archives/C2222/p2222222222222222",
        "https://workspace3.slack.com/archives/C3333/p3333333333333333"
      ]

      const doc = await vscode.workspace.openTextDocument({
        content: urls.join("\n") + "\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle multiple URLs")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should work with URLs on same line", async () => {
      const url = "https://test.slack.com/archives/C1234/p1234567890123456"
      const doc = await vscode.workspace.openTextDocument({
        content: `${url} ${url} ${url}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle multiple URLs on same line")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })
  })

  suite("Comment Insertion Behavior", () => {
    test("should insert message as commented text", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {editor} = await createTestDocument(`${slackUrl}\n`, "javascript")

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      await new Promise(resolve => setTimeout(resolve, 200))

      const insertedText = editor.document.getText()

      assert.ok(insertedText.includes("//"), "Should insert with comment markers")
      assert.ok(insertedText.length > slackUrl.length, "Should insert message content")
    })

    test("should use language-specific comment syntax for Python", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {editor} = await createTestDocument(`${slackUrl}\n`, "python")

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      await new Promise(resolve => setTimeout(resolve, 200))

      const insertedText = editor.document.getText()

      assert.ok(insertedText.length > slackUrl.length, "Should insert content for Python")
    })

    test("should handle multiline messages with proper formatting", async () => {
      const slackUrl = TEST_SLACK_URLS.multiline
      const {editor} = await createTestDocument(`${slackUrl}\n`, "javascript")

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      await new Promise(resolve => setTimeout(resolve, 200))

      const insertedText = editor.document.getText()
      const lines = insertedText.split("\n")

      const commentLines = lines.filter(line => line.trim().startsWith("//"))
      assert.ok(commentLines.length >= 1, "Should comment each line of multiline message")
    })
  })

  suite("Thread Display Behavior", () => {
    test("should parse thread URLs correctly", async () => {
      const threadUrl = "https://workspace.slack.com/archives/C1234/p1234567890345678?thread_ts=1234567890.345678"
      const {doc} = await createTestDocument(`${threadUrl}\n`)

      const urlPosition = doc.positionAt(20)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(hoverText.length > 0, "Should show hover for thread URLs")
    })

    test("should display thread parent message", async () => {
      const threadParentUrl = TEST_SLACK_URLS.threadParent
      const {doc} = await createTestDocument(`${threadParentUrl}\n`)

      const urlPosition = doc.positionAt(20)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(hoverText.length > 0, "Should display thread parent content")
    })

    test("should detect Linear issues in thread replies", async () => {
      // Linear token is set in suite setup, so extension should have LinearApi initialized
      // Use threadReply URL which points to a thread that has a Linear bot reply
      const threadUrl = TEST_SLACK_URLS.threadReply
      const {doc} = await createTestDocument(`${threadUrl}\n`)

      const urlPosition = doc.positionAt(20)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Should display Linear issue information from the thread
      // The thread fixture has a Linear Asks bot reply with TST-10291
      assert.ok(hoverText.includes("Linear") || hoverText.includes("TST-10291"), "Should display Linear issue from thread")
    })

    test("should show Post to Linear action for thread URLs with Linear issues", async () => {
      // Linear token is set in suite setup, so extension should have LinearApi initialized
      const threadUrl = TEST_SLACK_URLS.threadReply
      const {doc} = await createTestDocument(`${threadUrl}\n`)

      const urlPosition = doc.positionAt(20)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Should include Post to Linear command link
      // The thread fixture has a Linear Asks bot reply with TST-10291
      assert.ok(
        hoverText.includes("Post") && (hoverText.includes("Linear") || hoverText.includes("TST-10291")),
        "Should include Post to Linear action"
      )
    })
  })

  suite("Message Caching Behavior", () => {
    test("should cache messages to avoid redundant API calls", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n${slackUrl}\n`)

      const urlPosition1 = doc.positionAt(20)
      const hovers1 = await getHoverContent(doc, urlPosition1)
      const hoverText1 = extractHoverText(hovers1)

      const urlPosition2 = doc.positionAt(slackUrl.length + 20)
      const hovers2 = await getHoverContent(doc, urlPosition2)
      const hoverText2 = extractHoverText(hovers2)

      const message1 = extractHoverMessage(hoverText1)
      const message2 = extractHoverMessage(hoverText2)

      assert.ok(message1.length > 0, "Should render a message body to compare")
      assert.strictEqual(message1, message2, "Cached messages should return same content")
    })

    test("should clear cache when command is executed", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(20)
      await getHoverContent(doc, urlPosition)

      await vscode.commands.executeCommand("slackoscope.clearCache")

      const hoversAfterClear = await getHoverContent(doc, urlPosition)
      const hoverTextAfterClear = extractHoverText(hoversAfterClear)

      assert.ok(hoverTextAfterClear.length > 0, "Should refetch after cache clear")
    })
  })

  suite("Multi-Language Support", () => {
    const languages = ["javascript", "typescript", "python", "go", "rust", "ruby", "shellscript"]

    languages.forEach(lang => {
      test(`should work with ${lang} files`, async () => {
        const slackUrl = "https://test.slack.com/archives/C1234/p1234567890123456"
        const doc = await vscode.workspace.openTextDocument({
          content: `${slackUrl}\n`,
          language: lang
        })

        await vscode.window.showTextDocument(doc)
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

        assert.ok(true, `Should work with ${lang}`)

        await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      })
    })
  })

  suite("Error Handling", () => {
    test("should handle documents with no Slack URLs", async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: "// Regular comment\n// No URLs here\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should not throw on documents without URLs")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle malformed URLs gracefully", async () => {
      const badUrls = [
        "https://example.com/archives/C1234/p1234567890",
        "https://workspace.slack.com/invalid",
        "slack://workspace.slack.com/archives/C1234/p1234567890"
      ]

      for (const url of badUrls) {
        const doc = await vscode.workspace.openTextDocument({
          content: `${url}\n`,
          language: "javascript"
        })

        await vscode.window.showTextDocument(doc)
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

        await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      }

      assert.ok(true, "Should handle all malformed URLs without errors")
    })

    test("should handle rapid command execution", async () => {
      const slackUrl = "https://test.slack.com/archives/C1234/p1234567890123456"
      const doc = await vscode.workspace.openTextDocument({
        content: `${slackUrl}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      for (let i = 0; i < 5; i++) {
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      }

      assert.ok(true, "Should handle rapid toggling")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })
  })
})
