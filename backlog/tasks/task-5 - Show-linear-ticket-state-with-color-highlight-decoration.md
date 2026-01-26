---
id: task-5
title: Show linear ticket state with color/highlight/decoration
status: Done
assignee: []
created_date: '2026-01-20 23:51'
updated_date: '2026-01-26 22:39'
labels:
  - linear
  - ux
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Display the Linear ticket state in hover or inline preview. Optionally color-code or highlight URLs differently if the linked ticket is done.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented warning decorations: ⚠️ DONE (green) for completed tickets, ⚠️ OLD (orange) for stale tickets. Uses `linear.doneStateTypes` setting (default: ["completed"]) and `highlighting.oldDays` for age threshold. Controlled by `linear.showTicketWarnings` setting.
<!-- SECTION:NOTES:END -->
