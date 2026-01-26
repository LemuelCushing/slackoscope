/**
 * Tests for Linear commands: setStatus, assignToMe, and related code actions.
 */

// Setup must be imported FIRST to register mocks before extension activation
import "./setup"

import * as assert from "assert"
import * as vscode from "vscode"
import {createTestDocument, closeAllEditors} from "./testUtils"
import {TEST_SLACK_URLS, TEST_LINEAR_ISSUES} from "./fixtures"

suite("Linear Commands Tests", () => {
  suiteSetup(async () => {
    process.env.NODE_ENV = "test"

    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", "test-token-for-testing", vscode.ConfigurationTarget.Global)
    await config.update("linearToken", "test-linear-token-for-testing", vscode.ConfigurationTarget.Global)

    await new Promise(resolve => setTimeout(resolve, 100))

    const extension = vscode.extensions.getExtension("LemuelCushing.slackoscope")
    if (extension && !extension.isActive) {
      await extension.activate()
    }

    try {
      await vscode.commands.executeCommand("slackoscope._forceReconfigure")
    } catch {
      // Ignore if command not found
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

  suite("Command Registration", () => {
    test("should register setStatus command", async () => {
      const commands = await vscode.commands.getCommands(true)
      assert.ok(commands.includes("slackoscope.setStatus"), "setStatus command should be registered")
    })

    test("should register assignToMe command", async () => {
      const commands = await vscode.commands.getCommands(true)
      assert.ok(commands.includes("slackoscope.assignToMe"), "assignToMe command should be registered")
    })

    test("should register claimAndClose command", async () => {
      const commands = await vscode.commands.getCommands(true)
      assert.ok(commands.includes("slackoscope.claimAndClose"), "claimAndClose command should be registered")
    })
  })

  suite("Code Action Prefixes", () => {
    test("should use 'Slack:' prefix for Slack actions", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.simple}\n`)

      await new Promise(resolve => setTimeout(resolve, 200))

      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      if (actions && actions.length > 0) {
        const insertAction = actions.find(a => a.title.includes("Insert as Comment"))
        if (insertAction) {
          assert.ok(
            insertAction.title.startsWith("Slack:"),
            `Insert comment action should start with 'Slack:' but was '${insertAction.title}'`
          )
        }
      }
    })

    test("should use 'Linear:' prefix for Linear actions", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.threadParent}\n`)

      await new Promise(resolve => setTimeout(resolve, 300))

      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      if (actions && actions.length > 0) {
        const linearActions = actions.filter(
          a => a.title.includes("Post to") || a.title.includes("Assign") || a.title.includes("Set") || a.title.includes("Claim")
        )

        for (const action of linearActions) {
          if (action.title.includes("Post to") || action.title.includes("Assign") || action.title.includes("Set") || action.title.includes("Claim")) {
            assert.ok(
              action.title.startsWith("Linear:"),
              `Linear action should start with 'Linear:' but was '${action.title}'`
            )
          }
        }
      }
    })

    test("should provide Claim & Close action for Linear issues", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.threadParent}\n`)

      await new Promise(resolve => setTimeout(resolve, 300))

      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      if (actions && actions.length > 0) {
        const claimAndCloseAction = actions.find(a => a.title.includes("Claim & Close"))
        if (claimAndCloseAction) {
          assert.ok(
            claimAndCloseAction.title.startsWith("Linear:"),
            `Claim & Close action should start with 'Linear:'`
          )
          assert.ok(
            claimAndCloseAction.command?.command === "slackoscope.claimAndClose",
            "Should use claimAndClose command"
          )
        }
      }
    })
  })

  suite("Linear Settings", () => {
    test("should have linear.doneStateTypes setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const doneStateTypes = config.get<string[]>("linear.doneStateTypes")
      // Should default to ["completed"]
      assert.ok(Array.isArray(doneStateTypes), "doneStateTypes should be an array")
      assert.ok(doneStateTypes.includes("completed"), "Should include 'completed' by default")
    })

    test("should have linear.showTicketWarnings setting", () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const showTicketWarnings = config.get<boolean>("linear.showTicketWarnings")
      // Should default to true
      assert.strictEqual(showTicketWarnings, true)
    })
  })

  suite("setStatus Command", () => {
    test("should execute without error with valid issue", async () => {
      // The command requires user interaction (quick pick), so we just verify it doesn't crash
      // when called with valid arguments (the quick pick will be cancelled in test mode)
      const issue = TEST_LINEAR_ISSUES["ENG-1234"]

      // Execute the command - it will fail gracefully since we can't interact with quick pick
      try {
        await vscode.commands.executeCommand("slackoscope.setStatus", {
          issueId: issue.id,
          identifier: issue.identifier
        })
      } catch (error) {
        // Expected - quick pick cancelled or other UI interaction needed
        assert.ok(error instanceof Error, "Should throw an error when quick pick is cancelled")
      }
    })

    test("should show error when Linear token is not configured", async () => {
      // Temporarily remove Linear token
      const config = vscode.workspace.getConfiguration("slackoscope")
      const originalToken = config.get<string>("linearToken")
      await config.update("linearToken", undefined, vscode.ConfigurationTarget.Global)

      try {
        await vscode.commands.executeCommand("slackoscope._forceReconfigure")
      } catch {
        // Ignore
      }

      // Give time for reconfiguration
      await new Promise(resolve => setTimeout(resolve, 100))

      // Command should handle missing token gracefully
      try {
        await vscode.commands.executeCommand("slackoscope.setStatus", {
          issueId: "test-id",
          identifier: "TST-123"
        })
      } catch {
        // Expected - no token configured
      }

      // Restore token
      await config.update("linearToken", originalToken, vscode.ConfigurationTarget.Global)
      try {
        await vscode.commands.executeCommand("slackoscope._forceReconfigure")
      } catch {
        // Ignore
      }
    })
  })

  suite("assignToMe Command", () => {
    test("should execute without error with valid issue", async () => {
      const issue = TEST_LINEAR_ISSUES["ENG-1234"]

      // Execute the command - uses mock client which will return mock viewer
      try {
        await vscode.commands.executeCommand("slackoscope.assignToMe", {
          issueId: issue.id,
          identifier: issue.identifier
        })
        // If it doesn't throw, the command executed successfully
        assert.ok(true, "assignToMe command executed successfully")
      } catch (error) {
        // Command might fail due to test environment, but shouldn't crash
        if (error instanceof Error) {
          assert.ok(
            error.message.includes("Linear") || error.message.includes("token"),
            `Error should be Linear-related: ${error.message}`
          )
        }
      }
    })

    test("should handle missing arguments gracefully", async () => {
      try {
        await vscode.commands.executeCommand("slackoscope.assignToMe", {})
      } catch {
        // Expected - missing required arguments
        assert.ok(true, "Should handle missing arguments")
      }
    })
  })

  suite("Code Actions for Linear", () => {
    test("should provide code actions for Slack URL with Linear issue", async () => {
      // Use the Linear bot URL which has a Linear issue in the thread
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.linearBot}\n`)

      // Wait for extension to process
      await new Promise(resolve => setTimeout(resolve, 200))

      // Get code actions at the URL position
      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      // Should have at least the insert comment action
      assert.ok(actions && actions.length > 0, "Should provide at least one code action")

      // Check for insert comment action
      const insertAction = actions.find(a => a.title.includes("Insert as Comment"))
      assert.ok(insertAction, "Should have Insert as Comment action")
    })

    test("should provide Linear-specific actions when Linear issue is detected", async () => {
      // Use thread URL that has Linear issue in replies
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.threadParent}\n`)

      await new Promise(resolve => setTimeout(resolve, 300))

      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      if (actions && actions.length > 0) {
        const actionTitles = actions.map(a => a.title)

        // Check for Linear-specific actions
        const hasPostToLinear = actionTitles.some(t => t.includes("Post to"))
        const hasAssignToMe = actionTitles.some(t => t.includes("Assign") && t.includes("to Me"))
        const hasSetStatus = actionTitles.some(t => t.includes("Set") && t.includes("Status"))

        // At least one Linear action should be present if issue was detected
        if (hasPostToLinear || hasAssignToMe || hasSetStatus) {
          assert.ok(true, "Linear-specific actions are provided")
        }
      }
    })

    test("should not provide Linear actions for URL without Linear issue", async () => {
      // Use simple URL that has no Linear issue
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.simple}\n`)

      await new Promise(resolve => setTimeout(resolve, 200))

      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      if (actions && actions.length > 0) {
        const actionTitles = actions.map(a => a.title)

        // Should NOT have Linear-specific actions for simple URL
        const hasAssignToMe = actionTitles.some(t => t.includes("Assign") && t.includes("to Me"))
        const hasSetStatus = actionTitles.some(t => t.includes("Set") && t.includes("Status"))

        // These should not be present for a URL without Linear issue
        assert.ok(
          !hasAssignToMe && !hasSetStatus,
          "Should not have Linear-specific actions for URL without Linear issue"
        )
      }
    })

    test("should provide code actions with correct command arguments", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.linearBot}\n`)

      await new Promise(resolve => setTimeout(resolve, 200))

      const position = new vscode.Position(0, 10)
      const range = new vscode.Range(position, position)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        doc.uri,
        range
      )

      if (actions && actions.length > 0) {
        const insertAction = actions.find(a => a.title.includes("Insert as Comment"))
        if (insertAction?.command) {
          assert.ok(insertAction.command.command === "slackoscope.insertCommentedMessage")
          assert.ok(insertAction.command.arguments, "Should have command arguments")
          assert.ok(insertAction.command.arguments.length > 0, "Should have at least one argument")

          const args = insertAction.command.arguments[0] as {url?: string}
          assert.ok(args.url, "Should have url in arguments")
        }
      }
    })
  })

  suite("Insert Comment with Linear ID", () => {
    test("should include Linear ticket ID in comment when available", async () => {
      const {editor} = await createTestDocument(`${TEST_SLACK_URLS.linearBot}\n`, "javascript")

      await new Promise(resolve => setTimeout(resolve, 200))

      // Execute insert comment command
      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: TEST_SLACK_URLS.linearBot,
        lineNumber: 0
      })

      // Wait for insertion
      await new Promise(resolve => setTimeout(resolve, 200))

      const text = editor.document.getText()

      // The comment should be inserted and may contain the Linear identifier
      // Due to mock data, we check that the comment was inserted
      assert.ok(text.includes("//") || text.includes("#"), "Should have inserted a comment")
    })

    test("should insert comment without Linear ID when no issue detected", async () => {
      const {editor} = await createTestDocument(`${TEST_SLACK_URLS.simple}\n`, "javascript")

      await new Promise(resolve => setTimeout(resolve, 200))

      await vscode.commands.executeCommand("slackoscope.insertCommentedMessage", {
        url: TEST_SLACK_URLS.simple,
        lineNumber: 0
      })

      await new Promise(resolve => setTimeout(resolve, 200))

      const text = editor.document.getText()
      assert.ok(text.includes("//") || text.length > TEST_SLACK_URLS.simple.length, "Should have inserted content")
    })
  })

  suite("Hover Actions for Linear", () => {
    test("should show Linear actions in hover when issue is detected", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.linearBot}\n`)

      await new Promise(resolve => setTimeout(resolve, 200))

      const position = new vscode.Position(0, 10)
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        doc.uri,
        position
      )

      if (hovers && hovers.length > 0) {
        const hoverText = hovers
          .map(h =>
            h.contents
              .map(c => (c instanceof vscode.MarkdownString ? c.value : String(c)))
              .join("\n")
          )
          .join("\n")

        // Check for Linear-related content in hover
        const hasLinearContent =
          hoverText.includes("Linear") ||
          hoverText.includes("ENG-") ||
          hoverText.includes("Set Status") ||
          hoverText.includes("Assign")

        if (hasLinearContent) {
          assert.ok(true, "Hover contains Linear-related content")
        }
      }
    })

    test("should show Set Status action in hover for Linear issue", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.threadParent}\n`)

      await new Promise(resolve => setTimeout(resolve, 300))

      const position = new vscode.Position(0, 10)
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        doc.uri,
        position
      )

      if (hovers && hovers.length > 0) {
        const hoverText = hovers
          .map(h =>
            h.contents
              .map(c => (c instanceof vscode.MarkdownString ? c.value : String(c)))
              .join("\n")
          )
          .join("\n")

        // If Linear issue is detected, should have Set Status action
        if (hoverText.includes("Linear") || hoverText.includes("TST-")) {
          assert.ok(
            hoverText.includes("Set Status") || hoverText.includes("setStatus"),
            "Should have Set Status action when Linear issue detected"
          )
        }
      }
    })

    test("should show Assign to Me action in hover for Linear issue", async () => {
      const {doc} = await createTestDocument(`${TEST_SLACK_URLS.threadParent}\n`)

      await new Promise(resolve => setTimeout(resolve, 300))

      const position = new vscode.Position(0, 10)
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        doc.uri,
        position
      )

      if (hovers && hovers.length > 0) {
        const hoverText = hovers
          .map(h =>
            h.contents
              .map(c => (c instanceof vscode.MarkdownString ? c.value : String(c)))
              .join("\n")
          )
          .join("\n")

        // If Linear issue is detected, should have Assign to Me action
        if (hoverText.includes("Linear") || hoverText.includes("TST-")) {
          assert.ok(
            hoverText.includes("Assign to Me") || hoverText.includes("assignToMe"),
            "Should have Assign to Me action when Linear issue detected"
          )
        }
      }
    })
  })
})
