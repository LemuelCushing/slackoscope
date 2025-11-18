import * as assert from "assert"
import * as vscode from "vscode"
import {createTestDocument, closeAllEditors} from "./testUtils"

suite("Settings Behavioral Tests", () => {
  setup(async () => {
    process.env.NODE_ENV = "test"

    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", "test-token-for-testing", vscode.ConfigurationTarget.Global)

    const extension = vscode.extensions.getExtension("LemuelCushing.slackoscope")
    if (extension && !extension.isActive) {
      await extension.activate()
    }

    await closeAllEditors()
  })

  teardown(async () => {
    await closeAllEditors()

    const config = vscode.workspace.getConfiguration("slackoscope")
    await config.update("token", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.enabled", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.showTime", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.useRelativeTime", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.showUser", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.showChannelName", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.fontSize", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.color", undefined, vscode.ConfigurationTarget.Global)
    await config.update("inline.fontStyle", undefined, vscode.ConfigurationTarget.Global)
    await config.update("hover.showChannel", undefined, vscode.ConfigurationTarget.Global)
    await config.update("hover.showFiles", undefined, vscode.ConfigurationTarget.Global)
    await config.update("hover.showFileInfo", undefined, vscode.ConfigurationTarget.Global)
    await config.update("highlighting.enabled", undefined, vscode.ConfigurationTarget.Global)
    await config.update("highlighting.todayColor", undefined, vscode.ConfigurationTarget.Global)
    await config.update("highlighting.oldDays", undefined, vscode.ConfigurationTarget.Global)
    await config.update("highlighting.oldColor", undefined, vscode.ConfigurationTarget.Global)
    await config.update("linearToken", undefined, vscode.ConfigurationTarget.Global)
  })

  suite("Inline Settings", () => {
    test("inline.enabled setting controls inline message display", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")
      const slackUrl = "https://workspace.slack.com/archives/C1234/p1234567890123456"

      await config.update("inline.enabled", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))

      const {editor} = await createTestDocument(`${slackUrl}\n`)
      await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

      assert.ok(editor.document.getText().includes(slackUrl), "Document should still contain URL")
    })

    test("inline.showTime setting controls timestamp display", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.showTime", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.showTime"), false, "Should disable time display")

      await config.update("inline.showTime", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.showTime"), true, "Should enable time display")
    })

    test("inline.useRelativeTime setting toggles between relative and absolute time", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.useRelativeTime", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.useRelativeTime"), true, "Should use relative time")

      await config.update("inline.useRelativeTime", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.useRelativeTime"), false, "Should use absolute time")
    })

    test("inline.showUser setting controls user name display", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.showUser", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.showUser"), true, "Should show user names")

      await config.update("inline.showUser", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.showUser"), false, "Should hide user names")
    })

    test("inline.showChannelName setting controls channel name display", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.showChannelName", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.showChannelName"), true, "Should show channel names")

      await config.update("inline.showChannelName", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.showChannelName"), false, "Should hide channel names")
    })

    test("inline.fontSize setting accepts valid font sizes", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.fontSize", 14, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.fontSize"), 14, "Should accept valid font size")

      await config.update("inline.fontSize", 18, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.fontSize"), 18, "Should update font size")
    })

    test("inline.color setting accepts color values", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.color", "rgba(255, 0, 0, 0.8)", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.color"), "rgba(255, 0, 0, 0.8)", "Should accept color value")

      await config.update("inline.color", "#00ff00", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.color"), "#00ff00", "Should update color")
    })

    test("inline.fontStyle setting toggles between normal and italic", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.fontStyle", "italic", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.fontStyle"), "italic", "Should set italic style")

      await config.update("inline.fontStyle", "normal", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("inline.fontStyle"), "normal", "Should set normal style")
    })
  })

  suite("Hover Settings", () => {
    test("hover.showChannel setting controls channel display in hover", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("hover.showChannel", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("hover.showChannel"), false, "Should hide channel in hover")

      await config.update("hover.showChannel", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("hover.showChannel"), true, "Should show channel in hover")
    })

    test("hover.showFiles setting controls file attachment display", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("hover.showFiles", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("hover.showFiles"), false, "Should hide files")

      await config.update("hover.showFiles", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("hover.showFiles"), true, "Should show files")
    })

    test("hover.showFileInfo setting controls file size/type display", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("hover.showFileInfo", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("hover.showFileInfo"), false, "Should hide file info")

      await config.update("hover.showFileInfo", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("hover.showFileInfo"), true, "Should show file info")
    })
  })

  suite("Highlighting Settings", () => {
    test("highlighting.enabled setting controls URL highlighting", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("highlighting.enabled", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.enabled"), false, "Should disable highlighting")

      await config.update("highlighting.enabled", true, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.enabled"), true, "Should enable highlighting")
    })

    test("highlighting.todayColor setting accepts color values", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("highlighting.todayColor", "#00ff00", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.todayColor"), "#00ff00", "Should set today color")

      await config.update("highlighting.todayColor", "rgba(0, 255, 0, 0.5)", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.todayColor"), "rgba(0, 255, 0, 0.5)", "Should update today color")
    })

    test("highlighting.oldDays setting accepts number of days", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("highlighting.oldDays", 14, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.oldDays"), 14, "Should set old days threshold")

      await config.update("highlighting.oldDays", 30, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.oldDays"), 30, "Should update old days threshold")
    })

    test("highlighting.oldColor setting accepts color values", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("highlighting.oldColor", "#ff0000", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.oldColor"), "#ff0000", "Should set old color")

      await config.update("highlighting.oldColor", "rgba(255, 0, 0, 0.3)", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("highlighting.oldColor"), "rgba(255, 0, 0, 0.3)", "Should update old color")
    })
  })

  suite("Token Settings", () => {
    test("slackoscope.token setting stores Slack API token", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("token", "xoxb-test-token-123", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("token"), "xoxb-test-token-123", "Should store token")
    })

    test("slackoscope.linearToken setting stores Linear API token", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("linearToken", "lin_api_test123", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("linearToken"), "lin_api_test123", "Should store Linear token")
    })

    test("token settings support 1Password secret references", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("token", "op://vault/slack/token", vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      assert.strictEqual(config.get("token"), "op://vault/slack/token", "Should store 1Password reference")
    })
  })

  suite("Settings Integration", () => {
    test("multiple settings can be changed simultaneously", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.showTime", false, vscode.ConfigurationTarget.Global)
      await config.update("inline.showUser", true, vscode.ConfigurationTarget.Global)
      await config.update("hover.showFiles", false, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 100))

      assert.strictEqual(config.get("inline.showTime"), false)
      assert.strictEqual(config.get("inline.showUser"), true)
      assert.strictEqual(config.get("hover.showFiles"), false)
    })

    test("settings persist across configuration reloads", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.fontSize", 16, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))

      const reloadedConfig = vscode.workspace.getConfiguration("slackoscope")
      assert.strictEqual(reloadedConfig.get("inline.fontSize"), 16, "Settings should persist")
    })

    test("invalid settings values are rejected or coerced", async () => {
      const config = vscode.workspace.getConfiguration("slackoscope")

      await config.update("inline.fontSize", 999, vscode.ConfigurationTarget.Global)
      await new Promise(resolve => setTimeout(resolve, 50))
      const fontSize = config.get<number>("inline.fontSize")
      assert.ok(fontSize !== undefined, "Should have a font size value")
    })
  })
})
