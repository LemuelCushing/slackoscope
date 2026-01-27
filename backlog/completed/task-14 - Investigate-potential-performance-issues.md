---
id: task-14
title: Investigate potential performance issues
status: Done
assignee: []
created_date: '2026-01-21 10:13'
updated_date: '2026-01-27 09:01'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigated the codebase for performance bottlenecks. Found and fixed regex recompilation (urlOccurrence.ts, url.ts) and redundant regex in timestampRange(). Several reported concerns turned out to be non-issues due to existing cache layer (duplicate fetches between providers are just cache hits, unbounded cache is intentional for session-based usage).
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Investigation Results (2026-01-27)

### Fixed
1. **Regex recompilation** — `scanLine()` and `scanDocument()` in urlOccurrence.ts were calling `new RegExp(SLACK_URL_REGEX.source, "g")` on every invocation. Added `SLACK_URL_REGEX_GLOBAL` as a cached module-level constant. Same fix applied to `findAllSlackUrls()` in url.ts.
2. **timestampRange() regex** — Was using `match(/\/p(\d+)/)` + `indexOf()`. Replaced with pure string operations (`lastIndexOf("/p")` + `indexOf("?")`) — no regex needed.

### Investigated but NOT issues
- **Duplicate fetches between hover + codeActions** — Both use `SlackLoader` which goes through `Cache.fetch()`. Second call is just a cache hit.
- **Unbounded cache** — Session-based caching is intentional (discussed and decided against LRU in previous session).
- **Settings object allocation** — `vscode.workspace.getConfiguration()` is designed for frequent access; VS Code caches internally.
- **Full document scan on change** — By design, debounced at 300ms, and cache makes subsequent fetches instant.

### Noted but low priority
- Linear `getWorkflowStates()` makes 2 sequential GraphQL calls (could be combined) — only affects "Set Status" command, rarely used.
- No request deduplication for simultaneous in-flight requests to same resource — mitigated by cache after first resolution.
<!-- SECTION:NOTES:END -->
