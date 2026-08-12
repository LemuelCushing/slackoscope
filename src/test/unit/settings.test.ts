import * as assert from "assert"
import * as vscode from "vscode"
import {reset} from "../stubs/vscode"
import {Settings} from "../../vscode"

const configure = (key: string, value: unknown) =>
  vscode.workspace.getConfiguration("slackoscope").update(key, value, vscode.ConfigurationTarget.Global)

/**
 * `Settings#onDidChange` defers its callback through `setTimeout(0)`, so yielding to
 * the timer queue is what lets a change event arrive. Timers fire in the order they
 * were scheduled, so this always lands after the callback under test.
 */
const settledTimers = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Most settings are a straight pass-through: a manifest key goes in, a typed
 * property comes out. Stating them as a table keeps the interesting cases below
 * from drowning in fifteen near-identical blocks.
 */
const passthroughSettings: {key: string; value: unknown; read: (settings: Settings) => unknown}[] = [
  {key: "inline.enabled", value: false, read: settings => settings.inline.enabled},
  {key: "inline.showTime", value: false, read: settings => settings.inline.showTime},
  {key: "inline.useRelativeTime", value: true, read: settings => settings.inline.useRelativeTime},
  {key: "inline.showUser", value: true, read: settings => settings.inline.showUser},
  {key: "inline.showChannelName", value: false, read: settings => settings.inline.showChannelName},
  {key: "inline.color", value: "rgba(255, 0, 0, 0.8)", read: settings => settings.inline.color},
  {key: "inline.fontStyle", value: "normal", read: settings => settings.inline.fontStyle},
  {key: "hover.showChannel", value: false, read: settings => settings.hover.showChannel},
  {key: "hover.showFiles", value: false, read: settings => settings.hover.showFiles},
  {key: "hover.showFileInfo", value: false, read: settings => settings.hover.showFileInfo},
  {key: "highlighting.enabled", value: true, read: settings => settings.highlighting.enabled},
  {key: "highlighting.todayColor", value: "#00ff00", read: settings => settings.highlighting.todayColor},
  {key: "highlighting.oldDays", value: 14, read: settings => settings.highlighting.oldDays},
  {key: "highlighting.oldColor", value: "rgba(255, 0, 0, 0.3)", read: settings => settings.highlighting.oldColor},
  {key: "token", value: "xoxb-test-token-123", read: settings => settings.slackToken},
  {key: "token", value: "op://vault/slack/token", read: settings => settings.slackToken},
  {key: "linearToken", value: "lin_api_test123", read: settings => settings.linearToken},
  {key: "linear.doneStateTypes", value: ["completed", "canceled"], read: settings => settings.linear.doneStateTypes},
  {key: "linear.showTicketWarnings", value: false, read: settings => settings.linear.showTicketWarnings}
]

suite("Settings", () => {
  teardown(() => reset())

  suite("reading configuration", () => {
    for (const {key, value, read} of passthroughSettings) {
      test(`${key} = ${JSON.stringify(value)} surfaces on Settings`, async () => {
        await configure(key, value)
        assert.deepStrictEqual(read(new Settings()), value)
      })
    }

    test("falls back to the defaults declared in package.json", () => {
      const settings = new Settings()

      assert.strictEqual(settings.slackToken, "", "token defaults to empty")
      assert.strictEqual(settings.inline.enabled, true)
      assert.strictEqual(settings.inline.showChannelName, true)
      assert.strictEqual(settings.inline.useRelativeTime, false)
      assert.strictEqual(settings.inline.fontStyle, "italic")
      assert.strictEqual(settings.hover.showFiles, true)
      assert.strictEqual(settings.highlighting.enabled, false)
      assert.strictEqual(settings.highlighting.oldDays, 7)
      assert.deepStrictEqual(settings.linear.doneStateTypes, ["completed"])
    })

    test("reads several changed settings together", async () => {
      await configure("inline.showTime", false)
      await configure("inline.showUser", true)
      await configure("hover.showFiles", false)

      const settings = new Settings()
      assert.strictEqual(settings.inline.showTime, false)
      assert.strictEqual(settings.inline.showUser, true)
      assert.strictEqual(settings.hover.showFiles, false)
    })
  })

  suite("font size clamping", () => {
    const clamped: [input: number, expected: number][] = [
      [14, 14],
      [10, 10],
      [24, 24],
      [4, 10],
      [999, 24],
      [-1, 10]
    ]

    for (const [input, expected] of clamped) {
      test(`clamps a font size of ${input} to ${expected}`, async () => {
        await configure("inline.fontSize", input)
        assert.strictEqual(new Settings().inline.fontSize, expected)
      })
    }
  })

  suite("refresh", () => {
    test("keeps the snapshot taken at construction until refreshed", async () => {
      const settings = new Settings()
      await configure("inline.fontSize", 16)

      assert.strictEqual(settings.inline.fontSize, 12, "still reading the snapshot from construction")

      settings.refresh()
      assert.strictEqual(settings.inline.fontSize, 16, "picks up the new value once refreshed")
    })

    test("resetting a key to undefined restores the manifest default", async () => {
      await configure("inline.color", "#00ff00")
      assert.strictEqual(new Settings().inline.color, "#00ff00")

      await configure("inline.color", undefined)
      assert.strictEqual(new Settings().inline.color, "rgba(128, 128, 128, 0.6)")
    })
  })

  suite("change notifications", () => {
    test("reports a token change", async () => {
      const settings = new Settings()
      const events: {tokensChanged: boolean; displayChanged: boolean}[] = []
      const subscription = settings.onDidChange(event => events.push(event))

      await configure("token", "xoxb-new-token")
      await settledTimers()

      subscription.dispose()
      assert.strictEqual(events.length, 1, "one change event")
      assert.strictEqual(events[0].tokensChanged, true)
    })

    test("reports a display change", async () => {
      const settings = new Settings()
      const events: {tokensChanged: boolean; displayChanged: boolean}[] = []
      const subscription = settings.onDidChange(event => events.push(event))

      await configure("inline.showUser", true)
      await settledTimers()

      subscription.dispose()
      assert.strictEqual(events.length, 1, "one change event")
      assert.strictEqual(events[0].displayChanged, true)
      assert.strictEqual(events[0].tokensChanged, false)
    })

    test("stops reporting once disposed", async () => {
      const settings = new Settings()
      const events: unknown[] = []
      settings.onDidChange(event => events.push(event)).dispose()

      await configure("inline.showUser", true)
      await settledTimers()

      assert.strictEqual(events.length, 0)
    })
  })
})
