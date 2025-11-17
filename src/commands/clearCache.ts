import * as vscode from 'vscode'
import type {CacheManager} from '../cache/cacheManager'

export function clearCacheCommand(cacheManager: CacheManager): void {
  const stats = cacheManager.getStats()
  cacheManager.clearAll()
  vscode.window.showInformationMessage(
    `Slackoscope: Cache cleared (${stats.messages} messages, ${stats.users} users, ${stats.channels} channels, ${stats.threads} threads, ${stats.linearIssues} Linear issues)`
  )
}
