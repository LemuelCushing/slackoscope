import * as vscode from "vscode"

export function rangeFromLineMatch(line: vscode.TextLine, match: RegExpMatchArray): vscode.Range {
  const start = line.range.start.translate(0, match.index!)
  const end = start.translate(0, match[0].length)
  return new vscode.Range(start, end)
}

export function rangeFromDocumentMatch(document: vscode.TextDocument, match: RegExpMatchArray): vscode.Range {
  const start = document.positionAt(match.index!)
  const end = document.positionAt(match.index! + match[0].length)
  return new vscode.Range(start, end)
}

export function rangeWithin(base: vscode.Range, startOffset: number, length: number): vscode.Range {
  const start = base.start.translate(0, startOffset)
  const end = start.translate(0, length)
  return new vscode.Range(start, end)
}
