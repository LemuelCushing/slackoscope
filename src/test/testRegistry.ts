/**
 * Global registry for injecting test mocks into the extension.
 *
 * This allows tests to register mock implementations before the extension
 * activates, without needing dynamic imports or bundling test code.
 */

import type {ISlackApi} from "../api/slackApi"
import type {ILinearApi} from "../api/linearApi"

export type ApiFactoryType = {
  createSlackApi: (token: string) => ISlackApi
  createLinearApi: (token: string) => ILinearApi
}

/**
 * Global test registry - stored on globalThis to survive module reloads
 */
const REGISTRY_KEY = "__SLACKOSCOPE_TEST_REGISTRY__"

interface TestRegistry {
  apiFactory?: ApiFactoryType
}

function getRegistry(): TestRegistry {
  const g = globalThis as unknown as Record<string, TestRegistry>
  if (!g[REGISTRY_KEY]) {
    g[REGISTRY_KEY] = {}
  }
  return g[REGISTRY_KEY]
}

/**
 * Register mock API factory for tests.
 * Call this before extension activation.
 */
export function registerTestMocks(factory: ApiFactoryType): void {
  getRegistry().apiFactory = factory
}

/**
 * Get registered mock factory, or undefined if not in test mode
 */
export function getTestMocks(): ApiFactoryType | undefined {
  return getRegistry().apiFactory
}

/**
 * Clear all registered mocks (for test cleanup)
 */
export function clearTestMocks(): void {
  const g = globalThis as unknown as Record<string, TestRegistry>
  delete g[REGISTRY_KEY]
}
