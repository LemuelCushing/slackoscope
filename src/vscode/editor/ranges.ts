/**
 * VS Code Range utilities.
 */

import * as vscode from "vscode"

/**
 * Create a Range from a regex match on a line.
 */
export function rangeFromLineMatch(line: vscode.TextLine, match: RegExpMatchArray): vscode.Range {
  const start = line.range.start.translate(0, match.index ?? 0)
  const end = start.translate(0, match[0].length)
  return new vscode.Range(start, end)
}

/**
 * Create a Range from a regex match on a document.
 */
export function rangeFromDocumentMatch(document: vscode.TextDocument, match: RegExpMatchArray): vscode.Range {
  const startPos = document.positionAt(match.index ?? 0)
  const endPos = document.positionAt((match.index ?? 0) + match[0].length)
  return new vscode.Range(startPos, endPos)
}

/**
 * Create a sub-range within a parent range.
 * Useful for highlighting parts of a matched string.
 */
export function rangeWithin(parent: vscode.Range, startOffset: number, length: number): vscode.Range {
  const start = parent.start.translate(0, startOffset)
  const end = start.translate(0, length)
  return new vscode.Range(start, end)
}
