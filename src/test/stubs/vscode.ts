/**
 * An in-memory stand-in for the `vscode` module.
 *
 * The real `vscode` module only exists inside a running extension host, which is why
 * testing anything that touches it has meant booting Electron. This file provides the
 * slice of that API the extension actually uses, backed by plain objects, so those
 * tests can run in plain mocha instead.
 *
 * `stubs/install.ts` points `require("vscode")` here. Nothing in `src/` imports it.
 *
 * Configuration defaults are read from the real `package.json` manifest rather than
 * duplicated, so a default that drifts in the manifest fails the tests here too.
 */

import {readFileSync} from "fs"
import {join} from "path"

/* eslint-disable @typescript-eslint/no-explicit-any */

// Configuration ------------------------------------------------------------

const manifestDefaults = (): Map<string, unknown> => {
  const manifest = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf8"))
  const properties: Record<string, {default?: unknown}> = manifest?.contributes?.configuration?.properties ?? {}
  return new Map(Object.entries(properties).map(([key, schema]) => [key, schema.default]))
}

const DEFAULTS = manifestDefaults()

/** User-set values, i.e. everything a `settings.json` would hold. */
const settings = new Map<string, unknown>()

const configurationListeners = new Set<(event: any) => void>()

const notifyConfigurationChanged = (changedKey: string) => {
  const event = {
    affectsConfiguration: (section: string) => changedKey === section || changedKey.startsWith(`${section}.`)
  }
  for (const listener of [...configurationListeners]) listener(event)
}

/**
 * Mirrors `vscode.WorkspaceConfiguration`, including the part people trip over:
 * it is a *snapshot*. Values read after an `update()` elsewhere stay stale until
 * you fetch the configuration again — which is exactly why `Settings#refresh` exists.
 */
class Configuration {
  private readonly snapshot = new Map(settings)

  constructor(private readonly section?: string) {}

  private absolute(key: string): string {
    return this.section ? `${this.section}.${key}` : key
  }

  get(key: string, fallback?: any): any {
    const absolute = this.absolute(key)
    if (this.snapshot.has(absolute)) return structuredClone(this.snapshot.get(absolute))
    if (DEFAULTS.has(absolute)) return structuredClone(DEFAULTS.get(absolute))
    return fallback
  }

  has(key: string): boolean {
    const absolute = this.absolute(key)
    return this.snapshot.has(absolute) || DEFAULTS.has(absolute)
  }

  inspect(key: string): {key: string; defaultValue?: unknown; globalValue?: unknown} {
    const absolute = this.absolute(key)
    return {key: absolute, defaultValue: DEFAULTS.get(absolute), globalValue: settings.get(absolute)}
  }

  /** `undefined` resets the key to its manifest default, as in the real API. */
  async update(key: string, value: unknown, _target?: unknown): Promise<void> {
    const absolute = this.absolute(key)
    if (value === undefined) settings.delete(absolute)
    else settings.set(absolute, value)
    notifyConfigurationChanged(absolute)
  }
}

// Values and enums ---------------------------------------------------------

export class Disposable {
  static from(...disposables: {dispose(): unknown}[]): Disposable {
    return new Disposable(() => disposables.forEach(disposable => disposable.dispose()))
  }

  constructor(private readonly callOnDispose: () => unknown) {}

  dispose(): void {
    this.callOnDispose()
  }
}

export class EventEmitter<T> {
  private readonly listeners = new Set<(value: T) => void>()

  readonly event = (listener: (value: T) => void): Disposable => {
    this.listeners.add(listener)
    return new Disposable(() => this.listeners.delete(listener))
  }

  fire(value: T): void {
    for (const listener of [...this.listeners]) listener(value)
  }

  dispose(): void {
    this.listeners.clear()
  }
}

export class Position {
  constructor(
    readonly line: number,
    readonly character: number
  ) {}

  translate(lineDelta = 0, characterDelta = 0): Position {
    return new Position(this.line + lineDelta, this.character + characterDelta)
  }

  with(line = this.line, character = this.character): Position {
    return new Position(line, character)
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character
  }

  isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character)
  }

  isBeforeOrEqual(other: Position): boolean {
    return this.isBefore(other) || this.isEqual(other)
  }

  isAfter(other: Position): boolean {
    return other.isBefore(this)
  }

  isAfterOrEqual(other: Position): boolean {
    return other.isBeforeOrEqual(this)
  }

  compareTo(other: Position): number {
    if (this.isBefore(other)) return -1
    return this.isEqual(other) ? 0 : 1
  }
}

export class Range {
  readonly start: Position
  readonly end: Position

  constructor(start: Position, end: Position)
  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number)
  constructor(a: Position | number, b: Position | number, c?: number, d?: number) {
    const [start, end] =
      a instanceof Position && b instanceof Position
        ? [a, b]
        : [new Position(a as number, b as number), new Position(c as number, d as number)]
    // A range is always ordered, however it was constructed.
    ;[this.start, this.end] = start.isBeforeOrEqual(end) ? [start, end] : [end, start]
  }

  get isEmpty(): boolean {
    return this.start.isEqual(this.end)
  }

  get isSingleLine(): boolean {
    return this.start.line === this.end.line
  }

  contains(positionOrRange: Position | Range): boolean {
    const [from, to] =
      positionOrRange instanceof Range
        ? [positionOrRange.start, positionOrRange.end]
        : [positionOrRange, positionOrRange]
    return this.start.isBeforeOrEqual(from) && this.end.isAfterOrEqual(to)
  }

  with(start = this.start, end = this.end): Range {
    return new Range(start, end)
  }
}

export class Selection extends Range {
  get anchor(): Position {
    return this.start
  }

  get active(): Position {
    return this.end
  }
}

export class MarkdownString {
  isTrusted?: boolean | {enabledCommands: string[]}
  supportHtml?: boolean
  supportThemeIcons?: boolean

  constructor(public value = "") {}

  appendText(value: string): MarkdownString {
    this.value += value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&")
    return this
  }

  appendMarkdown(value: string): MarkdownString {
    this.value += value
    return this
  }

  appendCodeblock(code: string, language = ""): MarkdownString {
    this.value += `\n\`\`\`${language}\n${code}\n\`\`\`\n`
    return this
  }
}

export class SnippetString {
  constructor(public value = "") {}

  appendText(value: string): SnippetString {
    this.value += value.replace(/\$|}|\\/g, "\\$&")
    return this
  }

  appendTabstop(number = 1): SnippetString {
    this.value += `$${number}`
    return this
  }

  appendPlaceholder(value: string, number = 1): SnippetString {
    this.value += `\${${number}:${value}}`
    return this
  }

  appendVariable(name: string, defaultValue = ""): SnippetString {
    this.value += defaultValue ? `\${${name}:${defaultValue}}` : `\${${name}}`
    return this
  }
}

export class Uri {
  static file(path: string): Uri {
    return new Uri("file", path)
  }

  static parse(value: string): Uri {
    const [scheme, rest] = value.includes(":") ? [value.slice(0, value.indexOf(":")), value.slice(value.indexOf(":") + 1)] : ["file", value]
    return new Uri(scheme, rest.replace(/^\/\//, ""))
  }

  private constructor(
    readonly scheme: string,
    readonly path: string
  ) {}

  get fsPath(): string {
    return this.path
  }

  toString(): string {
    return `${this.scheme}:${this.path}`
  }
}

export class ThemeColor {
  constructor(readonly id: string) {}
}

export class CodeActionKind {
  static readonly Empty = new CodeActionKind("")
  static readonly QuickFix = new CodeActionKind("quickfix")
  static readonly Refactor = new CodeActionKind("refactor")
  static readonly RefactorInline = new CodeActionKind("refactor.inline")
  static readonly Source = new CodeActionKind("source")

  constructor(readonly value: string) {}

  append(parts: string): CodeActionKind {
    return new CodeActionKind(this.value ? `${this.value}.${parts}` : parts)
  }

  contains(other: CodeActionKind): boolean {
    return other.value === this.value || other.value.startsWith(`${this.value}.`)
  }
}

export class CodeAction {
  command?: {command: string; title: string; arguments?: unknown[]}
  diagnostics?: unknown[]
  isPreferred?: boolean

  constructor(
    public title: string,
    public kind?: CodeActionKind
  ) {}
}

export class Hover {
  readonly contents: unknown[]

  constructor(
    contents: unknown,
    readonly range?: Range
  ) {
    this.contents = Array.isArray(contents) ? contents : [contents]
  }
}

export const ConfigurationTarget = {Global: 1, Workspace: 2, WorkspaceFolder: 3} as const
export const ExtensionMode = {Production: 1, Development: 2, Test: 3} as const
export const CodeActionTriggerKind = {Invoke: 1, Automatic: 2} as const
export const DecorationRangeBehavior = {OpenOpen: 0, ClosedClosed: 1, OpenClosed: 2, ClosedOpen: 3} as const
export const OverviewRulerLane = {Left: 1, Center: 2, Right: 4, Full: 7} as const
export const StatusBarAlignment = {Left: 1, Right: 2} as const
export const ViewColumn = {Active: -1, Beside: -2, One: 1, Two: 2, Three: 3} as const
export const EndOfLine = {LF: 1, CRLF: 2} as const
export const TextEditorRevealType = {Default: 0, InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3} as const

// Documents ----------------------------------------------------------------

const lineRange = (lineNumber: number, text: string) => new Range(lineNumber, 0, lineNumber, text.length)

class TextDocument {
  private readonly lines: string[]

  constructor(
    private readonly content: string,
    readonly languageId: string,
    readonly uri: Uri
  ) {
    this.lines = content.split("\n")
  }

  get lineCount(): number {
    return this.lines.length
  }

  get fileName(): string {
    return this.uri.fsPath
  }

  get isUntitled(): boolean {
    return this.uri.scheme === "untitled"
  }

  get isDirty(): boolean {
    return false
  }

  get isClosed(): boolean {
    return false
  }

  get eol(): number {
    return EndOfLine.LF
  }

  get version(): number {
    return 1
  }

  getText(range?: Range): string {
    if (!range) return this.content
    return this.content.slice(this.offsetAt(range.start), this.offsetAt(range.end))
  }

  lineAt(lineOrPosition: number | Position): Record<string, unknown> {
    const lineNumber = typeof lineOrPosition === "number" ? lineOrPosition : lineOrPosition.line
    const text = this.lines[lineNumber] ?? ""
    return {
      lineNumber,
      text,
      range: lineRange(lineNumber, text),
      rangeIncludingLineBreak: new Range(lineNumber, 0, lineNumber, text.length + 1),
      firstNonWhitespaceCharacterIndex: text.length - text.trimStart().length,
      isEmptyOrWhitespace: text.trim().length === 0
    }
  }

  offsetAt(position: Position): number {
    const precedingLines = this.lines.slice(0, position.line)
    const precedingLength = precedingLines.reduce((total, line) => total + line.length + 1, 0)
    return precedingLength + Math.min(position.character, (this.lines[position.line] ?? "").length)
  }

  positionAt(offset: number): Position {
    let remaining = Math.max(0, Math.min(offset, this.content.length))
    for (const [lineNumber, line] of this.lines.entries()) {
      if (remaining <= line.length) return new Position(lineNumber, remaining)
      remaining -= line.length + 1
    }
    const lastLine = this.lines.length - 1
    return new Position(lastLine, this.lines[lastLine].length)
  }

  async save(): Promise<boolean> {
    return true
  }
}

let untitledCount = 0

const openDocuments: TextDocument[] = []

const openTextDocument = async (options?: {content?: string; language?: string} | string | Uri): Promise<TextDocument> => {
  const {content = "", language = "plaintext"} = typeof options === "object" && options !== null && !(options instanceof Uri) ? options : {}
  const document = new TextDocument(content, language, Uri.parse(`untitled:Untitled-${++untitledCount}`))
  openDocuments.push(document)
  return document
}

const documentFor = (uri: Uri): TextDocument | undefined =>
  openDocuments.find(document => document.uri.toString() === uri.toString())

// Editors ------------------------------------------------------------------

class TextEditor {
  selection: Selection
  selections: Selection[]

  constructor(readonly document: TextDocument) {
    this.selection = new Selection(new Position(0, 0), new Position(0, 0))
    this.selections = [this.selection]
  }

  get visibleRanges(): Range[] {
    return [new Range(0, 0, this.document.lineCount, 0)]
  }

  setDecorations(): void {
    // Decoration rendering is a display concern; nothing to do off-screen.
  }

  revealRange(): void {}

  async insertSnippet(): Promise<boolean> {
    return true
  }

  async edit(): Promise<boolean> {
    return true
  }
}

// Namespaces ---------------------------------------------------------------

const registeredCommands = new Map<string, (...args: any[]) => any>()

const hoverProviders: any[] = []
const codeActionProviders: any[] = []

const cancellation = {
  isCancellationRequested: false,
  onCancellationRequested: () => new Disposable(() => {})
}

/**
 * The `vscode.execute*Provider` commands are how VS Code asks its registered providers
 * for results, and how tests reach a provider without a rendered UI. Dispatching them
 * here means provider tests keep speaking the same API they do against the real editor.
 */
const builtinCommands: Record<string, (...args: any[]) => Promise<unknown>> = {
  async "vscode.executeHoverProvider"(uri: Uri, position: Position) {
    const document = documentFor(uri)
    if (!document) return []
    const hovers = await Promise.all(
      hoverProviders.map(provider => provider.provideHover(document, position, cancellation))
    )
    return hovers.filter(Boolean)
  },

  async "vscode.executeCodeActionProvider"(uri: Uri, range: Range) {
    const document = documentFor(uri)
    if (!document) return []
    const context = {diagnostics: [], only: undefined, triggerKind: CodeActionTriggerKind.Invoke}
    const actions = await Promise.all(
      codeActionProviders.map(provider => provider.provideCodeActions(document, range, context, cancellation))
    )
    return actions.flat().filter(Boolean)
  },

  async "workbench.action.closeAllEditors"() {
    window.activeTextEditor = undefined
    window.visibleTextEditors = []
    return undefined
  }
}

export const commands = {
  registerCommand(command: string, callback: (...args: any[]) => any): Disposable {
    registeredCommands.set(command, callback)
    return new Disposable(() => registeredCommands.delete(command))
  },

  registerTextEditorCommand(command: string, callback: (...args: any[]) => any): Disposable {
    return commands.registerCommand(command, callback)
  },

  async executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined> {
    const builtin = builtinCommands[command]
    if (builtin) return (await builtin(...args)) as T
    return registeredCommands.get(command)?.(...args)
  },

  async getCommands(_filterInternal?: boolean): Promise<string[]> {
    return [...registeredCommands.keys()]
  }
}

/** Messages the extension surfaced, so tests can assert on user-facing output. */
export const shownMessages = {information: [] as string[], warning: [] as string[], error: [] as string[]}

/** Quick picks the extension opened, in order, with the items it offered. */
export const quickPicks: {items: unknown[]; options: unknown}[] = []

const quickPickAnswers: unknown[] = []

/**
 * Queue what the user "chooses" at the next quick pick(s). Unanswered picks resolve
 * to `undefined`, which is how the real API reports a cancelled pick.
 */
export function answerQuickPick(...answers: unknown[]): void {
  quickPickAnswers.push(...answers)
}

const noopDisposable = () => new Disposable(() => {})

export const window = {
  activeTextEditor: undefined as TextEditor | undefined,
  visibleTextEditors: [] as TextEditor[],

  async showTextDocument(document: TextDocument): Promise<TextEditor> {
    const editor = new TextEditor(document)
    window.activeTextEditor = editor
    window.visibleTextEditors = [editor]
    return editor
  },

  async showInformationMessage(message: string): Promise<undefined> {
    shownMessages.information.push(message)
    return undefined
  },

  async showWarningMessage(message: string): Promise<undefined> {
    shownMessages.warning.push(message)
    return undefined
  },

  async showErrorMessage(message: string): Promise<undefined> {
    shownMessages.error.push(message)
    return undefined
  },

  async showQuickPick(items: unknown[] | Promise<unknown[]>, options?: unknown): Promise<unknown> {
    quickPicks.push({items: await items, options})
    return quickPickAnswers.shift()
  },

  async showInputBox(): Promise<undefined> {
    return undefined
  },

  createTextEditorDecorationType(options: unknown) {
    return {key: `decoration-${Math.random().toString(36).slice(2)}`, options, dispose() {}}
  },

  createOutputChannel(name: string) {
    return {name, append() {}, appendLine() {}, clear() {}, show() {}, hide() {}, dispose() {}}
  },

  createStatusBarItem() {
    return {text: "", tooltip: "", command: "", show() {}, hide() {}, dispose() {}}
  },

  async withProgress<T>(_options: unknown, task: (progress: {report(): void}) => Promise<T>): Promise<T> {
    return task({report() {}})
  },

  onDidChangeActiveTextEditor: noopDisposable,
  onDidChangeTextEditorSelection: noopDisposable,
  onDidChangeVisibleTextEditors: noopDisposable
}

export const workspace = {
  workspaceFolders: undefined as unknown[] | undefined,

  get textDocuments(): TextDocument[] {
    return openDocuments
  },

  getConfiguration(section?: string): Configuration {
    return new Configuration(section)
  },

  onDidChangeConfiguration(listener: (event: any) => void): Disposable {
    configurationListeners.add(listener)
    return new Disposable(() => configurationListeners.delete(listener))
  },

  openTextDocument,
  onDidOpenTextDocument: noopDisposable,
  onDidCloseTextDocument: noopDisposable,
  onDidChangeTextDocument: noopDisposable,
  onDidSaveTextDocument: noopDisposable
}

const registerProvider = (registry: unknown[], provider: unknown): Disposable => {
  registry.push(provider)
  return new Disposable(() => registry.splice(registry.indexOf(provider), 1))
}

export const languages = {
  registerHoverProvider: (_selector: unknown, provider: unknown) => registerProvider(hoverProviders, provider),
  registerCodeActionsProvider: (_selector: unknown, provider: unknown, _metadata?: unknown) =>
    registerProvider(codeActionProviders, provider),
  registerCompletionItemProvider: noopDisposable
}

export const extensions = {
  getExtension(_id: string): undefined {
    return undefined
  }
}

export const env = {
  async openExternal(): Promise<boolean> {
    return true
  },
  clipboard: {
    async writeText(): Promise<void> {},
    async readText(): Promise<string> {
      return ""
    }
  }
}

// Test helpers -------------------------------------------------------------

/**
 * A disposable-collecting `ExtensionContext`, enough to call `activate()` directly.
 * `extensionMode` is `Test`, which is what keeps 1Password resolution out of the way.
 */
export function createExtensionContext(): Record<string, unknown> {
  const memento = {get: () => undefined, update: async () => {}, keys: () => [] as string[]}
  return {
    subscriptions: [] as {dispose(): unknown}[],
    extensionMode: ExtensionMode.Test,
    extensionPath: process.cwd(),
    extensionUri: Uri.file(process.cwd()),
    globalState: {...memento, setKeysForSync: () => {}},
    workspaceState: memento,
    secrets: {get: async () => undefined, store: async () => {}, delete: async () => {}},
    environmentVariableCollection: {replace: () => {}, append: () => {}, prepend: () => {}, clear: () => {}}
  }
}

/**
 * Return the stub to a pristine state. Call between tests so leftover settings,
 * commands, providers, or recorded messages cannot leak from one test into the next.
 */
export function reset(): void {
  settings.clear()
  configurationListeners.clear()
  registeredCommands.clear()
  hoverProviders.length = 0
  codeActionProviders.length = 0
  openDocuments.length = 0
  window.activeTextEditor = undefined
  window.visibleTextEditors = []
  shownMessages.information.length = 0
  shownMessages.warning.length = 0
  shownMessages.error.length = 0
  quickPicks.length = 0
  quickPickAnswers.length = 0
}
