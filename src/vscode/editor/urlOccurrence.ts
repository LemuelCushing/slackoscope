/**
 * SlackUrlOccurrence - A Slack URL found in an editor document.
 *
 * Combines the parsed URL (domain object) with its location (VS Code Range).
 * This separation keeps domain logic pure while providing editor integration.
 */

import * as vscode from "vscode"
import {parseSlackUrl, SLACK_URL_REGEX_GLOBAL, type SlackUrl} from "../../slack"
import {rangeFromLineMatch, rangeFromDocumentMatch, rangeWithin} from "./ranges"

export class SlackUrlOccurrence {
  private constructor(
    public readonly url: SlackUrl,
    public readonly range: vscode.Range
  ) {}

  // Factory methods

  static fromLineMatch(line: vscode.TextLine, match: RegExpMatchArray): SlackUrlOccurrence | null {
    const url = parseSlackUrl(match[0])
    if (!url) return null
    return new SlackUrlOccurrence(url, rangeFromLineMatch(line, match))
  }

  static fromDocumentMatch(document: vscode.TextDocument, match: RegExpMatchArray): SlackUrlOccurrence | null {
    const url = parseSlackUrl(match[0])
    if (!url) return null
    return new SlackUrlOccurrence(url, rangeFromDocumentMatch(document, match))
  }

  // Scanning methods

  /**
   * Find all Slack URLs on a line.
   */
  static scanLine(line: vscode.TextLine): SlackUrlOccurrence[] {
    return [...line.text.matchAll(SLACK_URL_REGEX_GLOBAL)]
      .map(match => SlackUrlOccurrence.fromLineMatch(line, match))
      .filter((occ): occ is SlackUrlOccurrence => occ !== null)
  }

  /**
   * Find all Slack URLs in a document.
   */
  static scanDocument(document: vscode.TextDocument): SlackUrlOccurrence[] {
    return [...document.getText().matchAll(SLACK_URL_REGEX_GLOBAL)]
      .map(match => SlackUrlOccurrence.fromDocumentMatch(document, match))
      .filter((occ): occ is SlackUrlOccurrence => occ !== null)
  }

  /**
   * Find the URL at a specific position, if any.
   * If position is on a line with a single URL, returns that URL even if not directly on it.
   */
  static at(document: vscode.TextDocument, position: vscode.Position): SlackUrlOccurrence | null {
    const line = document.lineAt(position.line)
    const occurrences = SlackUrlOccurrence.scanLine(line)

    // Exact match
    const exact = occurrences.find(occ => occ.contains(position))
    if (exact) return exact

    // If only one URL on line, return it
    if (occurrences.length === 1) return occurrences[0]

    return null
  }

  // Instance methods

  /**
   * Check if a position is within this URL's range.
   */
  contains(position: vscode.Position): boolean {
    return this.range.contains(position)
  }

  /**
   * Get the range of just the channel ID within the URL.
   */
  channelIdRange(): vscode.Range | null {
    const offset = this.url.raw.indexOf(this.url.channelId)
    if (offset === -1) return null
    return rangeWithin(this.range, offset, this.url.channelId.length)
  }

  /**
   * Get the range of just the timestamp within the URL (the "p123..." segment).
   */
  timestampRange(): vscode.Range | null {
    const pIndex = this.url.raw.lastIndexOf("/p")
    if (pIndex === -1) return null

    const start = pIndex + 1 // skip the "/"
    const queryStart = this.url.raw.indexOf("?", start)
    const end = queryStart === -1 ? this.url.raw.length : queryStart

    return rangeWithin(this.range, start, end - start)
  }

  /**
   * Get a range suitable for inline decorations.
   * Extends past any trailing quote character so decoration appears outside string literals.
   */
  inlineDecorationRange(document: vscode.TextDocument): vscode.Range {
    const line = document.lineAt(this.range.end.line)
    const charAfter = line.text[this.range.end.character]

    if (charAfter === '"' || charAfter === "'") {
      return new vscode.Range(this.range.start, this.range.end.translate(0, 1))
    }
    return this.range
  }
}
