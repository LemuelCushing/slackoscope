/**
 * Renderers - presentation/view layer.
 */

export {HoverContentBuilder, type ActionDef} from "./hoverContent"
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
