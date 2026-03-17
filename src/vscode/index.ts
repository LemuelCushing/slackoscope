/**
 * VS Code module - everything VS Code specific.
 */

// Config
export {Settings, type InlineSettings, type HoverSettings, type HighlightingSettings} from "./config"
export type {LoaderDependencies} from "./dependencies"

// Editor
export {SlackUrlOccurrence} from "./editor"

// Renderers
export {HoverContentBuilder, formatRelativeTime, formatAbsoluteTime} from "./renderers"

// Providers
export {HoverProvider, CodeActionProvider} from "./providers"

// Controllers
export {DecorationController} from "./controllers"

// Commands
export {registerCommands, type CommandDependencies} from "./commands"
