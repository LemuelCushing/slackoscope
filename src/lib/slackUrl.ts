import * as vscode from "vscode"
import type {ISlackApi} from "../api/slackApi"
import type {ParsedSlackUrl} from "../types/slack"
import {rangeFromDocumentMatch, rangeFromLineMatch, rangeWithin} from "./vscodeRanges"

export class SlackUrlMatch {
  private constructor(
    private readonly parsedUrl: ParsedSlackUrl,
    public readonly range: vscode.Range
  ) {}

  static fromLineMatch(slackApi: ISlackApi, line: vscode.TextLine, match: RegExpMatchArray): SlackUrlMatch | null {
    const parsed = slackApi.parseSlackUrl(match[0])
    if (!parsed) return null
    return new SlackUrlMatch(parsed, rangeFromLineMatch(line, match))
  }

  static fromDocumentMatch(
    slackApi: ISlackApi,
    document: vscode.TextDocument,
    match: RegExpMatchArray
  ): SlackUrlMatch | null {
    const parsed = slackApi.parseSlackUrl(match[0])
    if (!parsed) return null
    return new SlackUrlMatch(parsed, rangeFromDocumentMatch(document, match))
  }

  static allInLine(slackApi: ISlackApi, line: vscode.TextLine): SlackUrlMatch[] {
    const globalRegex = new RegExp(slackApi.SLACK_URL_REGEX.source, "g")
    return [...line.text.matchAll(globalRegex)]
      .map(match => SlackUrlMatch.fromLineMatch(slackApi, line, match))
      .filter((m): m is SlackUrlMatch => m !== null)
  }

  static allInDocument(slackApi: ISlackApi, document: vscode.TextDocument): SlackUrlMatch[] {
    const globalRegex = new RegExp(slackApi.SLACK_URL_REGEX.source, "g")
    return [...document.getText().matchAll(globalRegex)]
      .map(match => SlackUrlMatch.fromDocumentMatch(slackApi, document, match))
      .filter((m): m is SlackUrlMatch => m !== null)
  }

  get parsed(): ParsedSlackUrl {
    return this.parsedUrl
  }

  get fullUrl(): string {
    return this.parsedUrl.fullUrl
  }

  get channelId(): string {
    return this.parsedUrl.channelId
  }

  get messageTs(): string {
    return this.parsedUrl.messageTs
  }

  get threadTs(): string | undefined {
    return this.parsedUrl.threadTs
  }

  get isThread(): boolean {
    return this.parsedUrl.threadTs !== undefined
  }

  contains(position: vscode.Position): boolean {
    return this.range.contains(position)
  }

  channelIdRange(): vscode.Range | null {
    const startOffset = this.parsedUrl.fullUrl.indexOf(this.parsedUrl.channelId)
    if (startOffset === -1) return null
    return rangeWithin(this.range, startOffset, this.parsedUrl.channelId.length)
  }

  timestampRange(): vscode.Range | null {
    const match = this.parsedUrl.fullUrl.match(/\/p(\d+)/)
    if (!match) return null

    const startOffset = this.parsedUrl.fullUrl.indexOf(match[0])
    if (startOffset === -1) return null

    // Keep the leading "/" visible, replace only the "p123..." part
    return rangeWithin(this.range, startOffset + 1, match[0].length - 1)
  }
}

export function pickSlackUrlMatchForLine(
  slackApi: ISlackApi,
  line: vscode.TextLine,
  position: vscode.Position
): SlackUrlMatch | null {
  const urls = SlackUrlMatch.allInLine(slackApi, line)
  return urls.find(url => url.contains(position)) ?? (urls.length === 1 ? urls[0] : null)
}
