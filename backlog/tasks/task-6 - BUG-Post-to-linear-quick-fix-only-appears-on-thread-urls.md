---
id: task-6
title: '[BUG] Post to linear quick fix only appears on thread urls'
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-21 09:14'
labels:
  - bug
  - linear
  - gh-issue-11
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub Issue #11. The "Post to Linear" code action only shows up when cursor is on a thread URL, but should also work for single message URLs.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Fixed**: Updated `getOrFetchMessagesForUrl` in `src/services/slackData.ts` to also fetch thread replies for single message URLs. Previously, only thread URLs fetched the full thread - now single message URLs also try to fetch thread replies to find Linear Asks bot messages.
<!-- SECTION:NOTES:END -->
