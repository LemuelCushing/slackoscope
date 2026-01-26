---
id: task-2
title: Allow linear comment override or addition
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-26 22:39'
labels:
  - linear
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When posting to Linear, allow options to override an existing comment or add as a new comment.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Already implemented in postToLinear command - detects existing Slackoscope comments and shows QuickPick with options: "Update existing comment" or "Add new comment". Also used by claimAndClose command.
<!-- SECTION:NOTES:END -->
