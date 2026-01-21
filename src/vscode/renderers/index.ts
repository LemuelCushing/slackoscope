/**
 * Renderers - presentation/view layer.
 */

export {HoverContentBuilder} from "./hoverContent"
export {
  createInlineDecorationType,
  buildInlineContent,
  createDecorationOptions,
  type DecorationContent,
} from "./decorations"
export {
  formatRelativeTime,
  formatAbsoluteTime,
  slackTsToDate,
  truncate,
  collapseLine,
} from "./formatting"
