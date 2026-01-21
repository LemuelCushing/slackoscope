---
id: task-12
title: Linear integration should be optional and never attempted without token
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-21 09:14'
labels:
  - linear
  - gh-issue-10
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub Issue #10. When no Linear token is configured, the extension should not attempt any Linear API calls and should gracefully skip Linear features.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Verified working as expected**: All Linear API call sites are properly guarded:
- `hoverProvider.ts` lines 129, 234: `if (linearIssueId && this.linearApi)`
- `linearMetadata.ts` line 88: `if (!linearIdentifier || !linearApi)` returns early
- `postToLinear.ts` line 8: `if (!linearApi)` shows error message and returns

No changes needed - the extension already gracefully skips Linear features when no token is configured.
<!-- SECTION:NOTES:END -->
