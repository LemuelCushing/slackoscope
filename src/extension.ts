import * as vscode from 'vscode'
import {SlackApi} from './api/slackApi'
import {LinearApi} from './api/linearApi'
import {OnePasswordApi} from './api/onePasswordApi'
import {CacheManager} from './cache/cacheManager'
import {SettingsManager} from './ui/settingsManager'
import {HoverProvider} from './providers/hoverProvider'
import {DecorationProvider} from './providers/decorationProvider'
import {CodeActionProvider} from './providers/codeActionProvider'
import {registerCommands} from './commands'

let slackApi: SlackApi
let linearApi: LinearApi | null = null
let cacheManager: CacheManager
let settingsManager: SettingsManager
let decorationProvider: DecorationProvider
let hoverProvider: HoverProvider

export async function activate(context: vscode.ExtensionContext) {
  console.log('Slackoscope is activating...')

  // Initialize managers
  settingsManager = new SettingsManager()
  cacheManager = new CacheManager()

  // Initialize 1Password API
  const onePasswordApi = new OnePasswordApi()
  const has1Password = await onePasswordApi.isAvailable()

  if (!has1Password) {
    console.warn('1Password CLI not available, using plain text tokens')
  }

  // Load tokens (with 1Password if available)
  let slackToken = settingsManager.slackToken
  let linearToken = settingsManager.linearToken

  try {
    if (has1Password) {
      slackToken = await onePasswordApi.readSecret(slackToken)
      if (linearToken) {
        linearToken = await onePasswordApi.readSecret(linearToken)
      }
    }
  } catch (error) {
    console.error('Failed to load tokens from 1Password:', error)
    vscode.window.showWarningMessage('Slackoscope: Failed to load tokens from 1Password, using plain text values')
  }

  // Initialize Slack API (will work even without token, but show warning)
  slackApi = new SlackApi(slackToken)

  // Only show warning in non-test environments to avoid test noise
  if (!slackToken && context.extensionMode !== vscode.ExtensionMode.Test) {
    vscode.window.showWarningMessage(
      'Slackoscope: Slack token not configured. Please set slackoscope.token in your VS Code settings to enable Slack features.'
    )
  }

  // Initialize Linear API (optional)
  if (linearToken) {
    try {
      linearApi = new LinearApi(linearToken)
    } catch (error) {
      console.warn('Linear API not available:', error)
    }
  }

  // Register providers
  hoverProvider = new HoverProvider(slackApi, cacheManager, settingsManager, linearApi)
  decorationProvider = new DecorationProvider(slackApi, cacheManager, settingsManager)
  const codeActionProvider = new CodeActionProvider(slackApi, cacheManager)

  context.subscriptions.push(
    vscode.languages.registerHoverProvider('*', hoverProvider),
    vscode.languages.registerCodeActionsProvider('*', codeActionProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.RefactorInline]
    })
  )

  // Register commands
  registerCommands(context, {
    slackApi,
    linearApi,
    cacheManager,
    settingsManager,
    decorationProvider
  })

  // Watch for settings changes
  context.subscriptions.push(
    settingsManager.onDidChange(async () => {
      // Reload tokens
      let newSlackToken = settingsManager.slackToken
      let newLinearToken = settingsManager.linearToken

      try {
        if (has1Password) {
          newSlackToken = await onePasswordApi.readSecret(newSlackToken)
          if (newLinearToken) {
            newLinearToken = await onePasswordApi.readSecret(newLinearToken)
          }
        }
      } catch (error) {
        console.error('Failed to reload tokens:', error)
        return
      }

      // Recreate Slack API with new token
      slackApi = new SlackApi(newSlackToken)
      hoverProvider.updateApi(slackApi)
      decorationProvider.updateApi(slackApi)
      codeActionProvider.updateApi(slackApi)

      // Only show warning in non-test environments
      if (!newSlackToken && context.extensionMode !== vscode.ExtensionMode.Test) {
        vscode.window.showWarningMessage('Slackoscope: Slack token not configured')
      }

      // Update Linear API
      if (newLinearToken) {
        try {
          linearApi = new LinearApi(newLinearToken)
          hoverProvider.updateLinearApi(linearApi)
        } catch (error) {
          console.warn('Failed to update Linear API:', error)
          linearApi = null
          hoverProvider.updateLinearApi(null)
        }
      } else {
        linearApi = null
        hoverProvider.updateLinearApi(null)
      }
    })
  )

  console.log('Slackoscope activated successfully')
}

export function deactivate() {
  cacheManager?.clearAll()
  decorationProvider?.dispose()
}
