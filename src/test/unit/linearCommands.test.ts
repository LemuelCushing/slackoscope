/**
 * Linear commands: registration, the code actions that offer them, and what each
 * command actually reports back to the user.
 *
 * These run against the `vscode` stub, so the extension is activated in-process:
 * no editor window, and no sleeping to wait for a provider to warm up.
 */

import * as assert from "assert"
import {readFileSync} from "fs"
import {join} from "path"
import * as vscode from "vscode"
import {answerQuickPick, createExtensionContext, quickPicks, reset, shownMessages} from "../stubs/vscode"
import {registerTestMocks, clearTestMocks} from "../testRegistry"
import {MockSlackClient, MockLinearClient} from "../mocks"
import {TEST_SLACK_URLS, TEST_WORKFLOW_STATES} from "../fixtures"
import {activate} from "../../extension"

const configure = (key: string, value: unknown) =>
  vscode.workspace.getConfiguration("slackoscope").update(key, value, vscode.ConfigurationTarget.Global)

/** Activate the extension for real, with whichever tokens the test cares about. */
const activateWith = async (tokens: {slack?: string; linear?: string} = {}) => {
  const {slack = "test-slack-token", linear = "test-linear-token"} = tokens
  await configure("token", slack)
  if (linear) await configure("linearToken", linear)
  await activate(createExtensionContext() as never)
}

/** The code actions offered at the first URL in a freshly opened document. */
const codeActionsFor = async (url: string): Promise<vscode.CodeAction[]> => {
  const document = await vscode.workspace.openTextDocument({content: `${url}\n`, language: "javascript"})
  const cursor = new vscode.Position(0, 10)
  const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
    "vscode.executeCodeActionProvider",
    document.uri,
    new vscode.Range(cursor, cursor)
  )
  return actions ?? []
}

const titlesOf = (actions: vscode.CodeAction[]) => actions.map(action => action.title)

/** Command ids the manifest actually contributes. */
const contributedCommands = (): string[] => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf8"))
  return manifest.contributes.commands.map((entry: {command: string}) => entry.command)
}

suite("Linear commands", () => {
  suiteSetup(() => {
    process.env.NODE_ENV = "test"
    registerTestMocks({
      createSlackClient: () => new MockSlackClient(),
      createLinearClient: () => new MockLinearClient()
    })
  })

  suiteTeardown(() => clearTestMocks())

  teardown(() => reset())

  suite("registration", () => {
    test("activation registers every contributed command", async () => {
      await activateWith()
      const registered = await vscode.commands.getCommands(true)

      for (const command of [
        "slackoscope.toggleInlineMessage",
        "slackoscope.insertCommentedMessage",
        "slackoscope.clearCache",
        "slackoscope.postToLinear",
        "slackoscope.assignToMe",
        "slackoscope.setStatus",
        "slackoscope.claimAndClose",
        "slackoscope.refreshMessage"
      ]) {
        assert.ok(registered.includes(command), `${command} should be registered`)
      }
    })

    test("every registered command is declared in package.json", async () => {
      await activateWith()
      const contributed = contributedCommands()

      // `_forceReconfigure` is a test-mode affordance and is deliberately undeclared.
      const declarable = (await vscode.commands.getCommands(true)).filter(
        id => id.startsWith("slackoscope.") && !id.startsWith("slackoscope._")
      )

      assert.ok(declarable.length > 0, "activation should register commands")
      for (const command of declarable) {
        assert.ok(contributed.includes(command), `${command} should be declared in package.json`)
      }
    })
  })

  suite("code actions", () => {
    test("offers the Linear actions for a URL whose message carries an issue", async () => {
      await activateWith()

      assert.deepStrictEqual(titlesOf(await codeActionsFor(TEST_SLACK_URLS.linearBot)), [
        "Slack: Insert as Comment",
        "Linear: Post to ENG-1234",
        "Linear: Assign ENG-1234 to Me",
        "Linear: Set ENG-1234 Status",
        "Linear: Claim & Close ENG-1234"
      ])
    })

    test("finds an issue mentioned in a thread reply, not just the parent", async () => {
      await activateWith()
      const titles = titlesOf(await codeActionsFor(TEST_SLACK_URLS.threadParent))

      assert.ok(
        titles.includes("Linear: Claim & Close TST-10291"),
        `expected the threaded issue to surface, got ${JSON.stringify(titles)}`
      )
    })

    test("offers only the Slack action when no issue is mentioned", async () => {
      await activateWith()

      assert.deepStrictEqual(titlesOf(await codeActionsFor(TEST_SLACK_URLS.simple)), ["Slack: Insert as Comment"])
    })

    test("offers nothing away from a Slack URL", async () => {
      await activateWith()
      const document = await vscode.workspace.openTextDocument({content: "const x = 1\n", language: "javascript"})
      const cursor = new vscode.Position(0, 3)

      const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
        "vscode.executeCodeActionProvider",
        document.uri,
        new vscode.Range(cursor, cursor)
      )

      assert.deepStrictEqual(actions, [])
    })

    test("prefixes every action with the service it acts on", async () => {
      await activateWith()

      for (const {title} of await codeActionsFor(TEST_SLACK_URLS.linearBot)) {
        assert.ok(/^(Slack|Linear): /.test(title), `'${title}' should be prefixed with its service`)
      }
    })

    test("wires each Linear action to its command and issue", async () => {
      await activateWith()
      const actions = await codeActionsFor(TEST_SLACK_URLS.linearBot)
      const claimAndClose = actions.find(action => action.title.includes("Claim & Close"))

      assert.ok(claimAndClose, "Claim & Close action should be offered")
      assert.strictEqual(claimAndClose.command?.command, "slackoscope.claimAndClose")
      assert.deepStrictEqual(claimAndClose.command?.arguments, [{issueId: "issue-id-1", identifier: "ENG-1234"}])
    })

    test("points the insert action at the line the URL ends on", async () => {
      await activateWith()
      const [insert] = await codeActionsFor(TEST_SLACK_URLS.simple)

      assert.deepStrictEqual(insert.command?.arguments, [{url: TEST_SLACK_URLS.simple, lineNumber: 0}])
    })
  })

  suite("setStatus", () => {
    test("offers the workflow states ordered from backlog through canceled", async () => {
      await activateWith()
      await vscode.commands.executeCommand("slackoscope.setStatus", {issueId: "issue-id-1", identifier: "ENG-1234"})

      assert.strictEqual(quickPicks.length, 1, "should open one quick pick")
      const offered = quickPicks[0].items as {label: string; description: string; detail: string}[]

      assert.deepStrictEqual(
        offered.map(item => item.description),
        ["backlog", "unstarted", "started", "started", "completed", "canceled"]
      )
      assert.deepStrictEqual(
        offered.map(item => item.label),
        TEST_WORKFLOW_STATES.map(state => state.name)
      )
      assert.deepStrictEqual(
        offered.map(item => item.detail),
        TEST_WORKFLOW_STATES.map(state => state.id)
      )
    })

    test("reports the new status once a state is chosen", async () => {
      await activateWith()
      answerQuickPick({label: "Done", description: "completed", detail: "state-done"})

      await vscode.commands.executeCommand("slackoscope.setStatus", {issueId: "issue-id-1", identifier: "ENG-1234"})

      assert.deepStrictEqual(shownMessages.information, ["Slackoscope: Updated MOCK-123 status to Done"])
      assert.deepStrictEqual(shownMessages.error, [])
    })

    test("says nothing when the pick is cancelled", async () => {
      await activateWith()

      await vscode.commands.executeCommand("slackoscope.setStatus", {issueId: "issue-id-1", identifier: "ENG-1234"})

      assert.deepStrictEqual(shownMessages.information, [])
      assert.deepStrictEqual(shownMessages.error, [])
    })

    test("explains the missing Linear token instead of opening a pick", async () => {
      await activateWith({linear: ""})

      await vscode.commands.executeCommand("slackoscope.setStatus", {issueId: "issue-id-1", identifier: "ENG-1234"})

      assert.deepStrictEqual(shownMessages.error, ["Slackoscope: Linear token not configured"])
      assert.strictEqual(quickPicks.length, 0, "should not ask for a status it cannot set")
    })
  })

  suite("assignToMe", () => {
    test("reports who the issue was assigned to", async () => {
      await activateWith()

      await vscode.commands.executeCommand("slackoscope.assignToMe", {issueId: "issue-id-1", identifier: "ENG-1234"})

      assert.deepStrictEqual(shownMessages.information, ["Slackoscope: Assigned MOCK-123 to Test User"])
      assert.deepStrictEqual(shownMessages.error, [])
    })

    test("explains the missing Linear token", async () => {
      await activateWith({linear: ""})

      await vscode.commands.executeCommand("slackoscope.assignToMe", {issueId: "issue-id-1", identifier: "ENG-1234"})

      assert.deepStrictEqual(shownMessages.error, ["Slackoscope: Linear token not configured"])
    })

    test("surfaces an error rather than throwing when arguments are missing", async () => {
      await activateWith()

      await assert.doesNotReject(() => Promise.resolve(vscode.commands.executeCommand("slackoscope.assignToMe", {})))
      assert.deepStrictEqual(shownMessages.error, [])
    })
  })

  suite("hover actions", () => {
    /** The rendered markdown of the hover at the first URL in a fresh document. */
    const hoverMarkdownFor = async (url: string): Promise<string> => {
      const document = await vscode.workspace.openTextDocument({content: `${url}\n`, language: "javascript"})
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        document.uri,
        new vscode.Position(0, 10)
      )
      return (hovers ?? [])
        .flatMap(hover => hover.contents)
        .map(content => (typeof content === "string" ? content : (content as vscode.MarkdownString).value))
        .join("\n")
    }

    test("offers the Linear actions when an issue is detected", async () => {
      await activateWith()
      const markdown = await hoverMarkdownFor(TEST_SLACK_URLS.linearBot)

      assert.match(markdown, /ENG-1234/)
      assert.match(markdown, /\(command:slackoscope\.postToLinear\?/)
      assert.match(markdown, /\(command:slackoscope\.assignToMe\?/)
      assert.match(markdown, /\(command:slackoscope\.setStatus\?/)
    })

    test("finds an issue mentioned in a thread reply", async () => {
      await activateWith()
      const markdown = await hoverMarkdownFor(TEST_SLACK_URLS.threadParent)

      assert.match(markdown, /TST-10291/)
      assert.match(markdown, /\(command:slackoscope\.setStatus\?/)
    })

    test("omits the Linear actions when no issue is mentioned", async () => {
      await activateWith()
      const markdown = await hoverMarkdownFor(TEST_SLACK_URLS.simple)

      assert.doesNotMatch(markdown, /command:slackoscope\.(postToLinear|assignToMe|setStatus)/)
      assert.match(markdown, /\(command:slackoscope\.insertCommentedMessage\?/, "Slack actions still offered")
    })

    test("carries the issue through to the command arguments", async () => {
      await activateWith()
      const markdown = await hoverMarkdownFor(TEST_SLACK_URLS.linearBot)

      const [, encoded] = markdown.match(/\(command:slackoscope\.assignToMe\?([^)]+)\)/) ?? []
      assert.ok(encoded, "assignToMe link should carry arguments")
      assert.deepStrictEqual(JSON.parse(decodeURIComponent(encoded)), {
        issueId: "issue-id-1",
        identifier: "ENG-1234"
      })
    })

    test("says nothing away from a Slack URL", async () => {
      await activateWith()
      const document = await vscode.workspace.openTextDocument({content: "const x = 1\n", language: "javascript"})

      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        document.uri,
        new vscode.Position(0, 3)
      )

      assert.deepStrictEqual(hovers, [])
    })
  })

  suite("contributed Linear settings", () => {
    const declaredDefault = <T>(key: string): T | undefined =>
      vscode.workspace.getConfiguration("slackoscope").inspect<T>(key)?.defaultValue

    test("linear.doneStateTypes defaults to completed", () => {
      assert.deepStrictEqual(declaredDefault<string[]>("linear.doneStateTypes"), ["completed"])
    })

    test("linear.showTicketWarnings defaults to on", () => {
      assert.strictEqual(declaredDefault<boolean>("linear.showTicketWarnings"), true)
    })
  })
})
