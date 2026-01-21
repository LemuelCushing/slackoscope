/**
 * clearCache command - Clear all cached data.
 */

import * as vscode from "vscode"
import type {SlackStore} from "../../slack"
import type {LinearStore} from "../../linear"

export function clearCache(slackStore: SlackStore, linearStore: LinearStore): void {
  slackStore.clear()
  linearStore.clear()
  vscode.window.showInformationMessage("Slackoscope: Cache cleared")
}
