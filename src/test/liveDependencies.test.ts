import * as assert from "assert"
import {syncLiveDependencies, type LiveCommandDependencies} from "../lib/liveDependencies"
import type {LoaderDependencies} from "../vscode/dependencies"

suite("Live dependency synchronization", () => {
  test("mutates existing dependency objects in place", () => {
    const initialSlackLoader = {name: "initial-slack"} as const
    const initialLinearLoader = {name: "initial-linear"} as const
    const nextSlackLoader = {name: "next-slack"} as const
    const nextLinearLoader = {name: "next-linear"} as const
    const initialSlackClient = {name: "initial-slack-client"} as const
    const initialLinearClient = {name: "initial-linear-client"} as const
    const nextSlackClient = {name: "next-slack-client"} as const
    const nextLinearClient = {name: "next-linear-client"} as const

    const loaderDeps: LoaderDependencies = {
      slackLoader: initialSlackLoader as never,
      linearLoader: initialLinearLoader as never,
    }

    const commandDeps: LiveCommandDependencies = {
      slackClient: initialSlackClient as never,
      slackLoader: initialSlackLoader as never,
      linearClient: initialLinearClient as never,
      linearLoader: initialLinearLoader as never,
    }

    const originalLoaderDeps = loaderDeps
    const originalCommandDeps = commandDeps

    syncLiveDependencies(
      loaderDeps,
      {
        slackClient: nextSlackClient as never,
        slackLoader: nextSlackLoader as never,
        linearClient: nextLinearClient as never,
        linearLoader: nextLinearLoader as never,
      },
      commandDeps
    )

    assert.strictEqual(loaderDeps, originalLoaderDeps, "Loader dependency object should keep its identity")
    assert.strictEqual(commandDeps, originalCommandDeps, "Command dependency object should keep its identity")
    assert.strictEqual(loaderDeps.slackLoader, nextSlackLoader, "Slack loader should be updated in place")
    assert.strictEqual(loaderDeps.linearLoader, nextLinearLoader, "Linear loader should be updated in place")
    assert.strictEqual(commandDeps.slackClient, nextSlackClient, "Slack client should be updated in place")
    assert.strictEqual(commandDeps.slackLoader, nextSlackLoader, "Command Slack loader should be updated in place")
    assert.strictEqual(commandDeps.linearClient, nextLinearClient, "Linear client should be updated in place")
    assert.strictEqual(commandDeps.linearLoader, nextLinearLoader, "Command Linear loader should be updated in place")
  })
})
