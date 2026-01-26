---
id: task-4
title: Allow easy check if linear comment was already added and if stale
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-26 22:41'
labels:
  - linear
  - ux
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Show indicator in hover/inline if a Linear comment already exists for this message. Show if the comment is stale (message has been updated since posting).
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decided against pre-checking comment existence in hover/code-actions - would add latency and API calls for marginal UX benefit. Current approach (check on post, prompt with update/add options) is preferred: info arrives exactly when needed without slowing down browsing.
<!-- SECTION:NOTES:END -->
