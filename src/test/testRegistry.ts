/**
 * Global registry for injecting test mocks into the extension.
 *
 * This allows tests to register mock implementations before the extension
 * activates, without needing dynamic imports or bundling test code.
 */

import type {ISlackClient} from "../slack"
import type {ILinearClient} from "../linear"

export type ClientFactoryType = {
  createSlackClient: (token: string) => ISlackClient
  createLinearClient: (token: string) => ILinearClient
}

/**
 * Global test registry - stored on globalThis to survive module reloads
 */
const REGISTRY_KEY = "__SLACKOSCOPE_TEST_REGISTRY__"

interface TestRegistry {
  clientFactory?: ClientFactoryType
}

function getRegistry(): TestRegistry {
  const g = globalThis as unknown as Record<string, TestRegistry>
  if (!g[REGISTRY_KEY]) {
    g[REGISTRY_KEY] = {}
  }
  return g[REGISTRY_KEY]
}

/**
 * Register mock client factory for tests.
 * Call this before extension activation.
 */
export function registerTestMocks(factory: ClientFactoryType): void {
  getRegistry().clientFactory = factory
}

/**
 * Get registered mock factory, or undefined if not in test mode
 */
export function getTestMocks(): ClientFactoryType | undefined {
  return getRegistry().clientFactory
}

/**
 * Clear all registered mocks (for test cleanup)
 */
export function clearTestMocks(): void {
  const g = globalThis as unknown as Record<string, TestRegistry>
  delete g[REGISTRY_KEY]
}
