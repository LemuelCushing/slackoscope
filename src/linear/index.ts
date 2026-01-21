/**
 * Linear module - everything Linear-related.
 */

// Types
export type {LinearIssue, LinearState, LinearComment, LinearUrlMetadata} from "./types"

// Detection (pure functions)
export {findLinearIssues, extractLinearIssueFromMessage, findLinearIssueInMessages} from "./detector"

// Client (HTTP)
export {LinearClient, type ILinearClient} from "./client"

// Store (caching) and Loader (fetch-or-cache)
export {LinearStore, LinearLoader} from "./store"
