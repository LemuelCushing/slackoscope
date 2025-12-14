import * as vscode from "vscode"
import {SlackApi, type ISlackApi} from "./api/slackApi"
import {LinearApi, type ILinearApi} from "./api/linearApi"
import {OnePasswordApi} from "./api/onePasswordApi"
import {CacheManager} from "./cache/cacheManager"
import {SettingsManager, type SettingsChangeEvent} from "./ui/settingsManager"
import {HoverProvider} from "./providers/hoverProvider"
import {DecorationProvider} from "./providers/decorationProvider"
import {CodeActionProvider} from "./providers/codeActionProvider"
import {registerCommands} from "./commands"

/**
 * Factory functions for creating API instances - mainly to allow mocking in tests
 */
export const apiFactory = {
  createSlackApi: (token: string): ISlackApi => new SlackApi(token),
  createLinearApi: (token: string): ILinearApi => new LinearApi(token)
}

/**
 * Helper class for managing disposable resources
 */
class Disposer implements vscode.Disposable {
  private readonly items: vscode.Disposable[] = []

  add<T extends vscode.Disposable>(...ds: T[]): T[] {
    this.items.push(...ds)
    return ds
  }

  dispose(): void {
    this.items.splice(0).forEach(d => d.dispose())
  }
}

/**
 * Helper class for serializing async operations - in case multiple reconfigurations are triggered rapidly
 */
class AsyncLock {
  private pending: Promise<void> = Promise.resolve()

  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.pending.then(fn, fn)
    this.pending = next.finally(() => undefined) as Promise<void>
    return next
  }
}

/**
 * Type definitions for configuration phases
 */
type Tokens = {slackToken?: string; linearToken?: string}
type Apis = {slack: ISlackApi; linear: ILinearApi | null}

class SlackoscopeExtension implements vscode.Disposable {
  private slackApi!: ISlackApi
  private linearApi: ILinearApi | null = null

  private readonly cache = new CacheManager()
  private readonly settings = new SettingsManager()
  private readonly onePassword = new OnePasswordApi()

  private hover!: HoverProvider
  private decoration!: DecorationProvider
  private codeActions!: CodeActionProvider

  private readonly disposer = new Disposer()
  private readonly reconfigLock = new AsyncLock()
  private has1Password = false
  private readonly isTestMode: boolean
  private providersInitialized = false

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly factory: typeof apiFactory
  ) {
    this.isTestMode = process.env.NODE_ENV === "test" || context.extensionMode === vscode.ExtensionMode.Test
  }

  async init(): Promise<void> {
    await this.initSecrets()
    await this.reconfigureFromSettings()

    this.hover = new HoverProvider(this.slackApi, this.cache, this.settings, this.linearApi)
    this.decoration = new DecorationProvider(this.slackApi, this.cache, this.settings, this.linearApi)
    this.codeActions = new CodeActionProvider(this.slackApi, this.cache, this.linearApi)
    this.providersInitialized = true

    this.disposer.add(
      vscode.languages.registerHoverProvider("*", this.hover),
      vscode.languages.registerCodeActionsProvider("*", this.codeActions, {
        providedCodeActionKinds: [vscode.CodeActionKind.RefactorInline]
      }),
      this.settings.onDidChange(event => this.handleSettingsChange(event))
    )

    registerCommands(this.context, {
      slackApi: this.slackApi,
      linearApi: this.linearApi,
      cacheManager: this.cache,
      settingsManager: this.settings,
      decorationProvider: this.decoration
    })

    console.log("Slackoscope activated successfully")
  }

  private async initSecrets(): Promise<void> {
    if (this.isTestMode) return

    this.has1Password = await this.onePassword.isAvailable()
    if (!this.has1Password) {
      console.warn("1Password CLI not available, using plain text tokens")
    }
  }

  private async resolveToken(raw: string | undefined): Promise<string | undefined> {
    if (!raw) return raw
    if (this.isTestMode || !this.has1Password) return raw

    try {
      return await this.onePassword.readSecret(raw)
    } catch (error) {
      console.error("Failed to resolve token:", error)
      return raw
    }
  }

  /**
   * Handle settings changes with selective refresh based on what changed
   */
  private async handleSettingsChange(event: SettingsChangeEvent): Promise<void> {
    if (event.tokensChanged) {
      // Tokens changed - rebuild APIs and refresh providers
      await this.reconfigureFromSettings()
    }
    // Display settings changed - providers will automatically pick up new settings
    // from SettingsManager on next access, no explicit refresh needed
  }

  /**
   * Load and resolve tokens from settings
   */
  private async loadTokens(): Promise<Tokens> {
    const slackToken = await this.resolveToken(this.settings.slackToken)
    const linearToken = await this.resolveToken(this.settings.linearToken)
    return {slackToken, linearToken}
  }

  /**
   * Build API instances from tokens
   */
  private buildApis({slackToken, linearToken}: Tokens): Apis {
    const slack = this.factory.createSlackApi(slackToken ?? "")
    const linear = linearToken ? this.factory.createLinearApi(linearToken) : null

    if (!slackToken && !this.isTestMode) {
      vscode.window.showWarningMessage(
        "Slackoscope: Slack token not configured. Please set slackoscope.token in your VS Code settings to enable Slack features."
      )
    }

    return {slack, linear}
  }

  /**
   * Apply new API instances to extension state
   */
  private applyApis(apis: Apis): void {
    this.slackApi = apis.slack
    this.linearApi = apis.linear
  }

  /**
   * Refresh existing providers with new API instances (only if initialized)
   */
  private refreshProviders(): void {
    if (!this.providersInitialized) return

    this.hover.updateApi(this.slackApi)
    this.decoration.updateApi(this.slackApi)
    this.codeActions.updateApi(this.slackApi)
    this.hover.updateLinearApi(this.linearApi)
    this.decoration.updateLinearApi(this.linearApi)
    this.codeActions.updateLinearApi(this.linearApi)
  }

  /**
   * Reconfigure extension from settings (serialized via AsyncLock)
   */
  private async reconfigureFromSettings(): Promise<void> {
    return this.reconfigLock.run(async () => {
      const tokens = await this.loadTokens()
      const apis = this.buildApis(tokens)
      this.applyApis(apis)
      this.refreshProviders()
    })
  }

  dispose(): void {
    this.cache.clearAll()
    if (this.providersInitialized) {
      this.decoration.dispose()
    }
    this.disposer.dispose()
  }
}

/**
 * Build factory for API instances, with test mocks if in test mode
 */
async function buildFactoryFor(context: vscode.ExtensionContext): Promise<typeof apiFactory> {
  const isTestMode = process.env.NODE_ENV === "test" || context.extensionMode === vscode.ExtensionMode.Test

  if (!isTestMode) return apiFactory

  const {MockSlackApi, MockLinearApi} = await import("./test/mocks.js")
  return {
    createSlackApi: () => new MockSlackApi(),
    createLinearApi: () => new MockLinearApi()
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log("Slackoscope is activating...")

  const factory = await buildFactoryFor(context)
  const extension = new SlackoscopeExtension(context, factory)
  await extension.init()
  context.subscriptions.push(extension)
}
