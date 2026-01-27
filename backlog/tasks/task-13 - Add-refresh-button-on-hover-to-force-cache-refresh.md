---
id: task-13
title: Add refresh button on hover to force cache refresh
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-27 11:58'
labels:
  - ux
  - cache
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a "Refresh" action in hover tooltip to force re-fetch message from Slack API, bypassing the cache. It should only be a small button/icon in the hover tooltip of messages, not a full context menu item or a big prominent button
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed: Added refresh command (refreshMessage.ts), registered in registry, added to package.json. Hover tooltip shows ↻ Refresh on the Slack actions row. Cache invalidation uses new Cache.remove() method for single-entry eviction.
<!-- SECTION:NOTES:END -->
