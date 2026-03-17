/**
 * Slackoscope Extension - Composition Root
 *
 * This file wires everything together. It:
 * - Creates instances
 * - Registers providers and commands
 * - Handles configuration changes
 *
 * Business logic lives elsewhere. This is pure wiring.
 */

import * as vscode from "vscode"
import {SlackClient, SlackStore, SlackLoader, type ISlackClient} from "./slack"
import {LinearClient, LinearStore, LinearLoader, type ILinearClient} from "./linear"
import {syncLiveDependencies} from "./lib/liveDependencies"
import {
  Settings,
  HoverProvider,
  CodeActionProvider,
  DecorationController,
  registerCommands,
  type LoaderDependencies,
  type CommandDependencies,
} from "./vscode"

// 1Password integration (optional)
import {OnePasswordApi} from "./api/onePasswordApi"

// Test registry for mock injection
import {getTestMocks} from "./test/testRegistry"

/**
 * Factory functions for creating clients.
 * Can be swapped with mocks in tests.
 */
export const clientFactory = {
  createSlackClient: (token: string): ISlackClient => new SlackClient(token),
  createLinearClient: (token: string): ILinearClient => new LinearClient(token),
}

/**
 * Extension state container.
 */
class Slackoscope implements vscode.Disposable {
  // Stores (caching)
  private readonly slackStore = new SlackStore()
  private readonly linearStore = new LinearStore()

  // Settings
  private readonly settings = new Settings()

  // Clients (HTTP)
  private slackClient!: ISlackClient
  private linearClient: ILinearClient | null = null

  // Loaders (fetch-or-cache)
  private slackLoader!: SlackLoader
  private linearLoader!: LinearLoader
  private readonly loaderDeps: LoaderDependencies = {} as LoaderDependencies
  private commandDeps?: CommandDependencies

  // VS Code integrations
  private hoverProvider!: HoverProvider
  private codeActionProvider!: CodeActionProvider
  private decorationController!: DecorationController

  // Utilities
  private readonly onePassword = new OnePasswordApi()
  private has1Password = false
  private readonly isTestMode: boolean
  private readonly factory: typeof clientFactory

  private disposables: vscode.Disposable[] = []

  constructor(private readonly context: vscode.ExtensionContext, factory: typeof clientFactory) {
    this.isTestMode = process.env.NODE_ENV === "test" || context.extensionMode === vscode.ExtensionMode.Test
    this.factory = factory
  }

  async activate(): Promise<void> {
    // Check for 1Password
    if (!this.isTestMode) {
      this.has1Password = await this.onePassword.isAvailable()
    }

    // Build initial configuration
    await this.buildClients()

    // Create loaders
    this.rebuildLoaders()

    // Create VS Code integrations
    this.hoverProvider = new HoverProvider(this.loaderDeps, this.settings)
    this.codeActionProvider = new CodeActionProvider(this.loaderDeps)
    this.decorationController = new DecorationController(this.loaderDeps, this.settings)

    this.commandDeps = {
      slackClient: this.slackClient,
      slackStore: this.slackStore,
      slackLoader: this.slackLoader,
      linearClient: this.linearClient,
      linearStore: this.linearStore,
      linearLoader: this.linearLoader,
      decorationController: this.decorationController,
      settings: this.settings,
    }

    // Register providers
    this.disposables.push(
      vscode.languages.registerHoverProvider("*", this.hoverProvider),
      vscode.languages.registerCodeActionsProvider("*", this.codeActionProvider, {
        providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds,
      })
    )

    // Register commands
    registerCommands(this.context, this.commandDeps)

    // Subscribe to settings changes
    this.disposables.push(
      this.settings.onDidChange(async event => {
        if (event.tokensChanged) {
          await this.reconfigure()
        }
      })
    )

    // Test-only reconfigure command
    if (this.isTestMode) {
      this.context.subscriptions.push(
        vscode.commands.registerCommand("slackoscope._forceReconfigure", () => this.reconfigure())
      )
    }

    console.log("Slackoscope activated successfully")
  }

  private async buildClients(): Promise<void> {
    const slackToken = await this.resolveToken(this.settings.slackToken)
    const linearToken = await this.resolveToken(this.settings.linearToken)

    this.slackClient = this.factory.createSlackClient(slackToken || "")
    this.linearClient = linearToken ? this.factory.createLinearClient(linearToken) : null

    if (!slackToken && !this.isTestMode) {
      vscode.window.showWarningMessage(
        "Slackoscope: Slack token not configured. Please set slackoscope.token in your VS Code settings."
      )
    }
  }

  private async reconfigure(): Promise<void> {
    await this.buildClients()
    this.rebuildLoaders()
  }

  private rebuildLoaders(): void {
    this.slackLoader = new SlackLoader(this.slackClient, this.slackStore)
    this.linearLoader = new LinearLoader(this.linearClient, this.linearStore)

    syncLiveDependencies(
      this.loaderDeps,
      {
        slackClient: this.slackClient,
        slackLoader: this.slackLoader,
        linearClient: this.linearClient,
        linearLoader: this.linearLoader,
      },
      this.commandDeps
    )
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

  dispose(): void {
    this.slackStore.clear()
    this.linearStore.clear()
    this.decorationController.dispose()
    this.settings.dispose()
    this.disposables.forEach(d => d.dispose())
  }
}

// Entry point
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log("Slackoscope is activating...")

  // In test mode, check for registered mock factory
  const testMocks = getTestMocks()
  const factory = testMocks ?? clientFactory

  const extension = new Slackoscope(context, factory)
  await extension.activate()
  context.subscriptions.push(extension)
}
