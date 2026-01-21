/**
 * Test setup - must be imported BEFORE any tests run
 *
 * This file registers mock implementations that the extension will use
 * when it activates in test mode.
 */

import {registerTestMocks, clearTestMocks} from "./testRegistry"
import {MockSlackClient, MockLinearClient} from "./mocks"

/**
 * Initialize test environment with mocks
 */
export function setupTestMocks(): void {
  console.log("[TEST SETUP] Registering test mocks...")
  registerTestMocks({
    createSlackClient: () => new MockSlackClient(),
    createLinearClient: () => new MockLinearClient()
  })
  console.log("[TEST SETUP] Mocks registered")
}

/**
 * Cleanup test mocks
 */
export function teardownTestMocks(): void {
  clearTestMocks()
}

// Auto-register mocks when this module is loaded
console.log("[TEST SETUP] Setup module loaded")
setupTestMocks()
