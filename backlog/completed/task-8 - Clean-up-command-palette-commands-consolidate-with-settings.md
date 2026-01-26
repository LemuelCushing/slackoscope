---
id: task-8
title: Clean up command palette commands - consolidate with settings
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-26 22:58'
labels:
  - cleanup
  - ux
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review command palette commands. Some may be unnecessary and could be settings instead. Reduce clutter.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewed command palette. Found postToLinear showing in palette but requires context (issueId). Added enablement: false to hide it from palette. Commands with enablement: false are still registered and callable programmatically (from hover actions).
<!-- SECTION:NOTES:END -->
