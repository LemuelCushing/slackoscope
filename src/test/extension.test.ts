import * as assert from "assert"
import * as vscode from "vscode"
import {clearMessageCache} from "../extension"
import {createTestDocument, closeAllEditors, getHoverContent, extractHoverText} from "./testUtils"

suite("Slackoscope Extension E2E Tests", () => {
  setup(async () => {
    // Clear message cache before each test
    clearMessageCache()
    await closeAllEditors()
  })

  teardown(async () => {
    await closeAllEditors()
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
      const slackoscopeCommands = [
        "slackoscope.toggleInlineMessage",
        "slackoscope.insertCommentedMessage"
      ]

      slackoscopeCommands.forEach(cmd => {
        assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`)
      })
    })
  })

  suite("Toggle Inline Message Command", () => {
    test("should execute without error when no file is open", async () => {
      // Close all editors
      await vscode.commands.executeCommand("workbench.action.closeAllEditors")

      // This should not throw an error
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      assert.ok(true, "Command should execute without error")
    })

    test("should execute with an open document", async () => {
      // Create a new untitled document
      const doc = await vscode.workspace.openTextDocument({
        content: "// Test file\n// https://test.slack.com/archives/C1234/p1234567890123456\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      // Execute the command
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      assert.ok(true, "Command should execute with open document")

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should toggle on and off properly", async () => {
      const doc = await vscode.workspace.openTextDocument({
        content: "// https://test.slack.com/archives/C1234/p1234567890123456\n",
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      // Toggle on
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      // Toggle off
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should toggle on and off without errors")

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should handle multiple Slack URLs in document", async () => {
      const url1 = "https://workspace1.slack.com/archives/C1111/p1111111111111111"
      const url2 = "https://workspace2.slack.com/archives/C2222/p2222222222222222"
      const url3 = "https://workspace3.slack.com/archives/C3333/p3333333333333333"

      const doc = await vscode.workspace.openTextDocument({
        content: `// First: ${url1}\n// Second: ${url2}\n// Third: ${url3}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle multiple URLs")

      // Clean up
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

      // Clean up
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

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should work across different file types", async () => {
      const url = "https://test.slack.com/archives/C1234/p1234567890123456"
      const languages = ["javascript", "typescript", "python", "go", "rust"]

      for (const lang of languages) {
        const doc = await vscode.workspace.openTextDocument({
          content: `// ${url}\n`,
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
      // Create a test document with a Slack URL
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const doc = await vscode.workspace.openTextDocument({
        content: `// Comment with ${slackUrl}\n`,
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      // Find the position of the Slack URL
      const urlPosition = doc.positionAt(doc.getText().indexOf(slackUrl) + 10) // Middle of URL

      // Request hover information
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        doc.uri,
        urlPosition
      )

      // Note: Without a valid Slack token and API response, we can't test the actual content
      // But we can verify the hover provider is registered
      assert.ok(Array.isArray(hovers), "Should return hover information")

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
    })

    test("should show hover with Slack message content", async () => {
      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const {doc} = await createTestDocument(`// ${slackUrl}\n`)

      // Find position in the middle of the URL
      const urlPosition = doc.positionAt(doc.getText().indexOf(slackUrl) + 20)

      // Get hover content
      const hovers = await getHoverContent(doc, urlPosition)
      const hoverText = extractHoverText(hovers)

      // Verify hover contains "Slack Message" label
      assert.ok(hoverText.includes("Slack Message"), "Hover should contain 'Slack Message' label")

      // Verify hover contains some message content (even if it's an error message without token)
      assert.ok(hoverText.length > 20, "Hover should contain message content")

      // Verify hover contains the insert command link
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

      // Should not contain Slackoscope hover for non-Slack URLs
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

        assert.ok(
          hoverText.includes("Slack Message"),
          `Should show hover at position ${position.character} in URL`
        )
      }
    })
  })

  suite("Configuration", () => {
    test("should have slackoscope.token configuration", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const tokenConfig = config.inspect<string>("token")

      assert.ok(tokenConfig, "Token configuration should exist")
      assert.strictEqual(
        typeof tokenConfig?.defaultValue,
        "string",
        "Token should have a string default value"
      )
    })
  })

  suite("Comment Insertion", () => {
    test("should handle insertCommentedMessage command registration", async () => {
      // This command is marked with enablement: false, so it's only callable programmatically
      const commands = await vscode.commands.getCommands(true)
      assert.ok(
        commands.includes("slackoscope.insertCommentedMessage"),
        "insertCommentedMessage command should be registered"
      )
    })

    test("should insert commented message below Slack URL", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`// ${slackUrl}\n`)

      const initialLineCount = doc.lineCount

      // Execute insert command
      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      // Wait a bit for the command to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Document should have more lines now
      assert.ok(doc.lineCount > initialLineCount, "Should have inserted comment lines")

      // Get the inserted content
      const insertedText = doc.getText()

      // Verify it contains comment markers (// for JavaScript)
      assert.ok(insertedText.includes("//"), "Should contain comment markers")

      // Verify the content is on a new line after the URL
      const lines = insertedText.split("\n")
      assert.ok(lines.length >= 2, "Should have at least 2 lines (URL + comment)")
    })

    test("should insert multi-line messages with proper comment formatting", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"
      const {doc} = await createTestDocument(`${slackUrl}\n`, "javascript")

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: slackUrl,
        lineNumber: 0
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      const insertedText = doc.getText()
      const lines = insertedText.split("\n")

      // Each inserted line should have a comment marker
      const commentLines = lines.filter(line => line.trim().startsWith("//"))
      assert.ok(commentLines.length >= 1, "Should have at least one commented line")
    })

    test("should use correct comment syntax for different languages", async () => {
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"

      const testCases = [
        {language: "javascript"},
        {language: "python"},
        {language: "typescript"}
      ]

      for (const {language} of testCases) {
        await closeAllEditors()

        const {doc} = await createTestDocument(`${slackUrl}\n`, language)

        await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
          url: slackUrl,
          lineNumber: 0
        })

        await new Promise(resolve => setTimeout(resolve, 100))

        const insertedText = doc.getText()

        // Note: VS Code's $LINE_COMMENT snippet variable should handle this
        // We can't directly verify the comment syntax without executing the snippet,
        // but we can verify the command completes successfully
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
      {lang: "rust", comment: "//"}
    ]

    testLanguages.forEach(({lang}) => {
      test(`should work with ${lang} files`, async () => {
        const slackUrl = "https://test.slack.com/archives/C1234/p1234567890123456"
        const doc = await vscode.workspace.openTextDocument({
          content: `Test ${slackUrl}\n`,
          language: lang
        })

        await vscode.window.showTextDocument(doc)

        // Should execute without error
        await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

        assert.ok(true, `Should handle ${lang} files`)

        // Clean up
        await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
      })
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
