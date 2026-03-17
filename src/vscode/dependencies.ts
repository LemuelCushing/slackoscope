import type {SlackLoader} from "../slack"
import type {LinearLoader} from "../linear"

/**
 * Shared live loader references used by VS Code-facing components.
 *
 * The composition root mutates this object during reconfiguration so
 * providers, controllers, and command handlers all keep seeing the latest
 * loaders without ad-hoc update calls or a heavier observable layer.
 */
export interface LoaderDependencies {
  slackLoader: SlackLoader
  linearLoader: LinearLoader
}
