---
id: TASK-20
title: Fix broken "insert comment" link in the hover popup
status: To Do
assignee: []
created_date: '2026-03-13 14:13'
updated_date: '2026-03-13 14:13'
labels:
  - bug
  - editor
  - slack
dependencies: []
references:
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/vscode/providers/hoverProvider.ts
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/vscode/commands/insertComment.ts
  - /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/test
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore the hover popup action that should insert a comment/snippet into the editor. Right now the hover UI presents an "insert comment" link, but activating it does not complete the expected insertion flow. The task should make that action work reliably from the hover surface, handle end-of-file insertion cleanly when the Slack URL sits on the last line, and define a clear fallback for documents whose language does not support or clearly identify a comment syntax.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Activating the "insert comment" link from the hover popup triggers the expected insertion flow instead of doing nothing or failing silently.
- [ ] #2 When the Slack URL is on the last line of the document, the insertion flow still places the generated content correctly on a following line instead of failing or misplacing it.
- [ ] #3 For documents whose language is not clearly identified or does not have a usable comment style, the insertion flow has an explicit fallback behavior instead of failing ambiguously.
- [ ] #4 The fallback behavior for unknown-language documents is user-comprehensible, whether that means inserting plain text/snippet content directly or surfacing a clear message that explains why comment insertion cannot proceed.
- [ ] #5 Tests cover the hover popup action, the end-of-file case, and the unknown-language fallback so regressions in command wiring or insertion behavior are caught.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Expanded scope on 2026-03-13 to include two additional insert-comment edge cases reported by the user: URLs on the final line should still insert onto a new following line, and documents without a clear language/comment syntax need an explicit fallback path instead of ambiguous failure.
<!-- SECTION:NOTES:END -->
