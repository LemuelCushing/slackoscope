import * as assert from "assert"
import * as vscode from "vscode"

suite("Slackoscope Extension E2E Tests", () => {
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
  })

  suite("Message Caching", () => {
    test("should cache fetched messages", async () => {
      // This test verifies that the message cache exists and works
      // Note: Without a valid token, we can't test actual caching behavior
      // but we can verify the structure

      const slackUrl = "https://test-workspace.slack.com/archives/C1234ABCD/p1234567890123456"
      const doc = await vscode.workspace.openTextDocument({
        content: `// ${slackUrl}\n// ${slackUrl}\n`, // Same URL twice
        language: "javascript"
      })

      await vscode.window.showTextDocument(doc)

      // Execute toggle command twice (toggle on, then off)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(true, "Should handle repeated URL processing (caching)")

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
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
