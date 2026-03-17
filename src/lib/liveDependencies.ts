import type {ISlackClient, SlackLoader} from "../slack"
import type {ILinearClient, LinearLoader} from "../linear"
import type {LoaderDependencies} from "../vscode/dependencies"
import type {CommandDependencies} from "../vscode/commands"

type LiveCommandDependencies = Pick<
  CommandDependencies,
  "slackClient" | "slackLoader" | "linearClient" | "linearLoader"
>

type LiveDependencyValues = LiveCommandDependencies

/**
 * Keep long-lived dependency objects pointing at the latest clients/loaders
 * without replacing their identity.
 */
export function syncLiveDependencies(
  loaderDeps: LoaderDependencies,
  values: LiveDependencyValues,
  commandDeps?: LiveCommandDependencies
): void {
  Object.assign(loaderDeps, {
    slackLoader: values.slackLoader,
    linearLoader: values.linearLoader,
  })

  if (!commandDeps) return

  Object.assign(commandDeps, values)
}

export type {
  LiveCommandDependencies,
  LiveDependencyValues,
  ISlackClient,
  ILinearClient,
  SlackLoader,
  LinearLoader,
}
