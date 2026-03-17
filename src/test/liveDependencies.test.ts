import * as assert from "assert"
import {syncLiveDependencies, type LiveCommandDependencies} from "../lib/liveDependencies"
import type {LoaderDependencies} from "../vscode/dependencies"

suite("Live dependency synchronization", () => {
  test("mutates existing dependency objects in place", () => {
    const [s0, s1, l0, l1, sc0, sc1, lc0, lc1] = Array.from({length: 8}, () => ({}) as never)

    const loaderDeps: LoaderDependencies = {slackLoader: s0, linearLoader: l0}
    const commandDeps: LiveCommandDependencies = {slackClient: sc0, slackLoader: s0, linearClient: lc0, linearLoader: l0}

    const [originalLoader, originalCommand] = [loaderDeps, commandDeps]
    syncLiveDependencies(loaderDeps, {slackLoader: s1, linearLoader: l1, slackClient: sc1, linearClient: lc1}, commandDeps)

    assert.deepStrictEqual([loaderDeps, commandDeps], [originalLoader, originalCommand], "object identities preserved")
    assert.deepStrictEqual(
      [loaderDeps.slackLoader, loaderDeps.linearLoader, commandDeps.slackClient, commandDeps.slackLoader, commandDeps.linearClient, commandDeps.linearLoader],
      [s1, l1, sc1, s1, lc1, l1],
      "all values updated"
    )
  })
})
