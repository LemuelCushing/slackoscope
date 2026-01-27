---
id: task-16
title: 'redesign the hover interface a little, it''s getting too croweded'
status: Done
assignee: []
created_date: '2026-01-27 08:56'
updated_date: '2026-01-27 11:58'
labels: []
dependencies: []
---

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Completed: Full hover redesign. Replaced threadContext()+linearIssue() with compact metadata() method. Added separator() with deterministic flourishes (𖡹/ᘒ/ↀ/𖡄). Replaced flat actions() with actionRows() using padded separators (𐄁 primary, 𜸅 secondary). Glyph updates: 𐛑 thread, 𐀶 channel, ⨁ insert, ⏎ post, 𖨆 assign, 𜳨 status, 🜃 Linear marker. All 173 tests pass.
<!-- SECTION:NOTES:END -->
