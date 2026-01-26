---
id: task-7
title: Cache errors like "not in channel" to avoid repeated console spam
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-26 22:58'
labels:
  - cache
  - cleanup
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Errors such as "not in channel" should be cached so they only appear once in console. Should not retry until cache is refreshed globally or via the per-URL refresh button.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented error caching in SlackStore using CacheEntry wrapper type that stores either success or error state. SlackLoader now caches errors and re-throws them on subsequent requests, preventing repeated API calls and console spam. Errors clear on extension reload along with regular cache.
<!-- SECTION:NOTES:END -->
