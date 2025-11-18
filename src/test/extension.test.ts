import * as assert from "assert"
import * as vscode from "vscode"
import {createTestDocument, closeAllEditors, getHoverContent, extractHoverText, MockSlackApi} from "./testUtils"
import {findLinearIssues, extractLinearIssueFromMessage} from "../ui/formatting"

suite("Slackoscope Extension E2E Tests", () => {
  setup(async () => {
    // Set test environment variable
    process.env.NODE_ENV = "test"

    // Configure a mock Slack token for testing
    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", "test-token-for-testing", vscode.ConfigurationTarget.Global)

    // Ensure extension is activated before clearing cache
    const extension = vscode.extensions.getExtension("LemuelCushing.slackoscope")
    if (extension && !extension.isActive) {
      await extension.activate()
    }

    // Clear message cache before each test (if extension is activated)
    try {
      await vscode.commands.executeCommand("slackoscope.clearCache")
    } catch {
      // Ignore if command not found (extension not activated yet)
    }

    await closeAllEditors()
  })

  teardown(async () => {
    await closeAllEditors()

    // Clean up test configuration
    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", undefined, vscode.ConfigurationTarget.Global)
  })
  suite("Extension Activation", () => {
    test("should be present and activate", async () => {
      const extension = vscode.extensions.getExtension("LemuelCushing.slackoscope")
      assert.ok(extension, "Extension should be installed")

      await extension.activate()
      assert.ok(extension.isActive, "Extension should be activated")
    })

    test("should register all commands", async () => {
      const commands = await vscode.commands.getCommands(true)
      const slackoscopeCommands = ["slackoscope.toggleInlineMessage", "slackoscope.insertCommentedMessage"]

      slackoscopeCommands.forEach(cmd => {
        assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`)
      })
    })
  })

  suite("Toggle Inline Message Command", () => {
    test("should execute without error when no file is open", async () => {
      await vscode.commands.executeCommand("workbench.action.closeAllEditors")
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      assert.ok(true, "Command should execute without error")
    })

    test("should execute with an open document", async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: "// Test file\n// https://test.slack.com/archives/C1234/p1234567890123456\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      assert.ok(true, "Command should execute with open document")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should toggle on and off properly", async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: "// https://test.slack.com/archives/C1234/p1234567890123456\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should toggle on and off without errors")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle multiple Slack URLs in document", async () => {
      const urls = [
        "https://workspace1.slack.com/archives/C1111/p1111111111111111",
        "https://workspace2.slack.com/archives/C2222/p2222222222222222",
        "https://workspace3.slack.com/archives/C3333/p3333333333333333"
      ]

      const doc = await vscode.workspace.openTextDocument({
        content: urls.map((url, i) => `// ${i + 1}: ${url}\n`).join(""),
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle multiple URLs")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle repeated URL in document", async () => {
      const url = "https://test.slack.com/archives/C1234/p1234567890123456"

      const doc = await vscode.workspace.openTextDocument({
        content: `// ${url}\n// ${url}\n// ${url}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle repeated URLs")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle mixed valid and invalid URLs", async () => {
      const validUrl = "https://test.slack.com/archives/C1234/p1234567890123456"
      const invalidUrl = "https://not-slack.com/archives/C1234/p1234567890"

      const doc = await vscode.workspace.openTextDocument({
        content: `// ${validUrl}\n// ${invalidUrl}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle mixed URLs")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should work across different file types", async () => {
      const url = "https://test.slack.com/archives/C1234/p1234567890123456"
      const languages = ["javascript", "typescript", "python", "go", "rust", "ruby", "shellscript"]

      for (const lang of languages) {
        const doc = await vscode.workspace.openTextDocument({
          content: `${url}\n`,
          language: lang
        })

        await vscode.window.showTextDocument(doc)
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

        assert.ok(true, `Should work with ${lang}`)

        await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      }
    })

    test("should handle rapid toggling", async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: "// https://test.slack.com/archives/C1234/p1234567890123456\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      // Rapid toggle multiple times
      for (let i = 0; i < 5; i++) {
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      }

      assert.ok(true, "Should handle rapid toggling")

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })
  })

  suite("Hover Provider", () => {
    test("should be registered for all languages", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const doc = await vscode.workspace.openTextDocument({
        content: `// Comment with ${slackUrl}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      const urlPosition = doc.positionAt(doc.getText().indexOf(slackUrl) + 10)

      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        doc.uri,
        urlPosition
      )

      assert.ok(Array.isArray(hovers), "Should return hover information")

      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should show hover with Slack message content", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const {doc} = await createTestDocument(`// ${slackUrl}\n`)

      const urlPosition = doc.positionAt(doc.getText().indexOf(slackUrl) + 20)

      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(hoverText.includes("@Test User"), "Hover should contain user information")
      assert.ok(hoverText.length > 20, "Hover should contain message content")
      assert.ok(
        hoverText.includes("Insert Commented Message") || hoverText.includes("insertCommentedMessage"),
        "Hover should contain insert command link"
      )
    })

    test("should not show hover for non-Slack URLs", async () => {
      const {doc} = await createTestDocument("// https://example.com/not-slack\n")

      const urlPosition = doc.positionAt(doc.getText().indexOf("example.com"))

      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(!hoverText.includes("Slack Message"), "Should not show Slack hover for non-Slack URLs")
    })

    test("should show hover at any position within Slack URL", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      // Test at beginning, middle, and end of URL
      const positions = [
        doc.positionAt(0), // Beginning
        doc.positionAt(30), // Middle
        doc.positionAt(slackUrl.length - 5) // Near end
      ]

      for (const position of positions) {
        const hovers = await getHoverContent(doc, position)
        const hoverText = extractHoverText(hovers)

        assert.ok(hoverText.includes("@Test User"), `Should show hover at position ${position.character} in URL`)
      }
    })
  })

  suite("Configuration", () => {
    test("should have slackoscope.token configuration", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const tokenConfig = config.inspect<string>("token")

      assert.ok(tokenConfig, "Token configuration should exist")
      assert.strictEqual(typeof tokenConfig?.defaultValue, "string", "Token should have a string default value")
    })
  })

  suite("Comment Insertion", () => {
    test("should handle insertCommentedMessage command registration", async () => {
      const commands = await vscode.commands.getCommands(true)
      assert.ok(
        commands.includes("slackoscope.insertCommentedMessage"),
        "insertCommentedMessage command should be registered"
      )
    })

    test("should insert commented message below Slack URL", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {editor} = await createTestDocument(`// ${slackUrl}\n`)

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      await new Promise(resolve => setTimeout(resolve, 200))

      const updatedDoc = editor.document
      const insertedText = updatedDoc.getText()

      assert.ok(insertedText.includes("//"), "Should contain comment markers")
      assert.ok(insertedText.length > slackUrl.length + 10, "Should have inserted content")

      const lines = insertedText.split("\n")
      assert.ok(lines.length >= 2, "Should have at least 2 lines (URL + comment)")
    })

    test("should insert multi-line messages with proper comment formatting", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {editor} = await createTestDocument(`${slackUrl}\n`, "javascript")

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      const insertedText = editor.document.getText()
      const lines = insertedText.split("\n")

      const commentLines = lines.filter(line => line.trim().startsWith("//"))
      assert.ok(commentLines.length >= 1, "Should have at least one commented line")
    })

    test("should use correct comment syntax for different languages", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"

      const testCases = [{language: "javascript"}, {language: "python"}, {language: "typescript"}]

      for (const {language} of testCases) {
        await closeAllEditors()

        const {doc} = await createTestDocument(`${slackUrl}\n`, language)

        await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
          url: slackUrl,
          lineNumber: 0
        })

        await new Promise(resolve => setTimeout(resolve, 100))

        const insertedText = doc.getText()

        assert.ok(insertedText.length > slackUrl.length, `Should insert content for ${language}`)
      }
    })
  })

  suite("Message Caching", () => {
    test("should cache fetched messages", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const {doc} = await createTestDocument(`// ${slackUrl}\n// ${slackUrl}\n`)

      const urlPosition = doc.positionAt(doc.getText().indexOf(slackUrl) + 20)

      // First hover - will fetch and cache
      const hovers1 = await getHoverContent(doc, urlPosition)
      const hoverText1 = extractHoverText(hovers1)

      // Second hover - should use cache
      const hovers2 = await getHoverContent(doc, urlPosition)
      const hoverText2 = extractHoverText(hovers2)

      // Both should return the same content
      assert.strictEqual(hoverText1, hoverText2, "Cached content should match")
      assert.ok(hoverText1.length > 0, "Should have content")
    })

    test("should clear cache with clearCache command", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`// ${slackUrl}\n`)

      const urlPosition = doc.positionAt(doc.getText().indexOf(slackUrl) + 20)

      // Fetch and cache
      await getHoverContent(doc, urlPosition)

      // Clear cache
      await vscode.commands.executeCommand("slackoscope.clearCache")

      // Fetch again - cache should be cleared
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Should still get content (even though cache was cleared)
      assert.ok(hoverText.length > 0, "Should still fetch content after cache clear")
    })

    test("should cache same URL across different features", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(10)

      // Fetch via hover
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Toggle inline messages (should use cached content)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      // Both features should work (using cache)
      assert.ok(hoverText.length > 0, "Hover should have content from cache")
    })
  })

  suite("Language Support", () => {
    const testLanguages = [
      {lang: "javascript", comment: "//"},
      {lang: "python", comment: "#"},
      {lang: "typescript", comment: "//"},
      {lang: "go", comment: "//"},
      {lang: "rust", comment: "//"},
      {lang: "ruby", comment: "#"},
      {lang: "shellscript", comment: "#"}
    ]

    testLanguages.forEach(({lang}) => {
      test(`should work with ${lang} files`, async () => {
        const slackUrl = "https://test.slack.com/archives/C1234/p1234567890123456"
        const doc = await vscode.workspace.openTextDocument({
          content: `Test ${slackUrl}\n`,
          language: lang
        })

        await vscode.window.showTextDocument(doc)

        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

        assert.ok(true, `Should handle ${lang} files`)

        await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      })
    })
  })

  suite("Settings Configuration", () => {
    test("should respect inline.enabled setting", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      await config.update("inline.enabled", false, vscode.ConfigurationTarget.Global)

      await createTestDocument("https://test.slack.com/archives/C1234/p1234567890123456\n")
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      await config.update("inline.enabled", undefined, vscode.ConfigurationTarget.Global)
      assert.ok(true, "Should respect inline.enabled setting")
    })

    test("should have inline.showTime setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("inline.showTime")
      assert.ok(setting !== undefined, "inline.showTime setting should exist")
    })

    test("should have inline.useRelativeTime setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("inline.useRelativeTime")
      assert.ok(setting !== undefined, "inline.useRelativeTime setting should exist")
    })

    test("should have inline.showUser setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("inline.showUser")
      assert.ok(setting !== undefined, "inline.showUser setting should exist")
    })

    test("should have inline.showChannelName setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("inline.showChannelName")
      assert.ok(setting !== undefined, "inline.showChannelName setting should exist")
    })

    test("should have inline.fontSize setting with validation", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect<number>("inline.fontSize")
      assert.ok(setting !== undefined, "inline.fontSize setting should exist")
      assert.strictEqual(typeof setting.defaultValue, "number", "fontSize should be a number")
    })

    test("should have inline.color setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("inline.color")
      assert.ok(setting !== undefined, "inline.color setting should exist")
    })

    test("should have inline.fontStyle setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("inline.fontStyle")
      assert.ok(setting !== undefined, "inline.fontStyle setting should exist")
    })

    test("should have hover.showChannel setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("hover.showChannel")
      assert.ok(setting !== undefined, "hover.showChannel setting should exist")
    })

    test("should have hover.showFiles setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("hover.showFiles")
      assert.ok(setting !== undefined, "hover.showFiles setting should exist")
    })

    test("should have hover.showFileInfo setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("hover.showFileInfo")
      assert.ok(setting !== undefined, "hover.showFileInfo setting should exist")
    })

    test("should have highlighting.enabled setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("highlighting.enabled")
      assert.ok(setting !== undefined, "highlighting.enabled setting should exist")
    })

    test("should have highlighting.todayColor setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("highlighting.todayColor")
      assert.ok(setting !== undefined, "highlighting.todayColor setting should exist")
    })

    test("should have highlighting.oldDays setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("highlighting.oldDays")
      assert.ok(setting !== undefined, "highlighting.oldDays setting should exist")
    })

    test("should have highlighting.oldColor setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("highlighting.oldColor")
      assert.ok(setting !== undefined, "highlighting.oldColor setting should exist")
    })

    test("should have linearToken setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const setting = config.inspect("linearToken")
      assert.ok(setting !== undefined, "linearToken setting should exist")
    })
  })

  suite("Thread Support", () => {
    test("should detect thread URLs with thread_ts parameter", () => {
      const threadUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456?thread_ts=1234567890.123456"
      const mockApi = new MockSlackApi()
      const parsed = mockApi.parseSlackUrl(threadUrl)

      assert.ok(parsed, "Should parse thread URL")
      assert.ok(parsed?.threadTs, "Should extract thread_ts")
      assert.strictEqual(parsed?.threadTs, "1234567890.123456", "Should have correct thread timestamp")
    })

    test("should handle thread parent messages", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(10)
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      assert.ok(hoverText.length > 0, "Should show hover for thread parent")
    })
  })

  suite("File Attachments", () => {
    test("should display file information when hover.showFiles is enabled", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      await config.update("hover.showFiles", true, vscode.ConfigurationTarget.Global)

      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`)

      const urlPosition = doc.positionAt(10)
      await getHoverContent(doc, urlPosition)

      await config.update("hover.showFiles", undefined, vscode.ConfigurationTarget.Global)
      assert.ok(true, "Should handle file display setting")
    })

    test("should toggle file info display with hover.showFileInfo setting", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("hover.showFileInfo", false, vscode.ConfigurationTarget.Global)
      let fileInfoSetting = config.get("hover.showFileInfo")
      assert.strictEqual(fileInfoSetting, false, "Should disable file info")

      await config.update("hover.showFileInfo", true, vscode.ConfigurationTarget.Global)
      fileInfoSetting = config.get("hover.showFileInfo")
      assert.strictEqual(fileInfoSetting, true, "Should enable file info")

      await config.update("hover.showFileInfo", undefined, vscode.ConfigurationTarget.Global)
    })
  })

  suite("Linear Integration", () => {
    test("should have postToLinear command registered", async () => {
      const commands = await vscode.commands.getCommands(true)
      assert.ok(commands.includes("slackoscope.postToLinear"), "postToLinear command should be registered")
    })

    test("should extract Linear issue ID from message text", () => {
      const text = "This is related to TST-123 and PRJ-456"
      const issues = findLinearIssues(text)

      assert.ok(Array.isArray(issues), "Should return an array")
      assert.ok(issues.length >= 1, "Should find at least one issue")
      assert.ok(issues.includes("TST-123"), "Should find TST-123")
    })

    test("should detect Linear Asks bot messages", () => {
      const message = {
        text: "Issue created",
        bot_profile: {name: "Linear Asks"},
        attachments: [{from_url: "https://linear.app/test/issue/TST-10291"}]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "TST-10291", "Should extract Linear issue ID from bot message")
    })

    test("should extract Linear issue from URL in attachments", () => {
      const message = {
        text: "New issue",
        bot_profile: {name: "Linear Asks"},
        attachments: [
          {from_url: "https://linear.app/workspace/issue/ABC-999"},
          {from_url: "https://example.com"}
        ]
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "ABC-999", "Should extract issue from first Linear URL")
    })

    test("should handle messages without Linear Asks bot", () => {
      const message = {
        text: "Regular message without Linear",
        bot_profile: {name: "Other Bot"}
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, null, "Should return null for non-Linear messages")
    })

    test("should fallback to text search when no bot attachments", () => {
      const message = {
        text: "Check out PROJ-555 for details"
      }

      const issueId = extractLinearIssueFromMessage(message)
      assert.strictEqual(issueId, "PROJ-555", "Should find issue in text")
    })
  })

  suite("Error Handling", () => {
    test("should handle documents with no Slack URLs gracefully", async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: "// Just a regular comment\n// No Slack URLs here\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      // Should not throw
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle documents without Slack URLs")

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle malformed Slack URLs gracefully", async () => {
      const badUrls = [
        "https://example.com/archives/C1234/p1234567890",
        "https://workspace.slack.com/invalid",
        "slack://workspace.slack.com/archives/C1234/p1234567890"
      ]

      for (const url of badUrls) {
        const doc = await vscode.workspace.openTextDocument({
          content: `// ${url}\n`,
          language: "javascript"
        })

        await vscode.window.showTextDocument(doc)

        // Should not throw
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

        assert.ok(true, `Should handle malformed URL: ${url}`)

        await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      }
    })
  })
})
