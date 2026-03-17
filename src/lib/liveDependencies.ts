import type {LoaderDependencies} from "../vscode/dependencies"
import type {CommandDependencies} from "../vscode/commands"

export type LiveCommandDependencies = Pick<
  CommandDependencies,
  "slackClient" | "slackLoader" | "linearClient" | "linearLoader"
>

/** Mutate long-lived dependency objects in place to point at the latest clients/loaders. */
export function syncLiveDependencies(
  loaderDeps: LoaderDependencies,
  values: LiveCommandDependencies,
  commandDeps?: LiveCommandDependencies
): void {
  const {slackLoader, linearLoader} = values
  Object.assign(loaderDeps, {slackLoader, linearLoader})
  if (commandDeps) Object.assign(commandDeps, values)
}
