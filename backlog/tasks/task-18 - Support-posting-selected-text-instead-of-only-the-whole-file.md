---
id: TASK-18
title: Support posting selected text instead of only the whole file
status: To Do
assignee: []
created_date: '2026-03-11 10:34'
labels:
  - feature
  - editor
  - linear
dependencies: []
references:
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/vscode/providers/codeActions.ts
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/vscode/commands/postToLinear.ts
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/test/linearCommands.test.ts
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow Slackoscope’s Linear posting flow to use the user’s current text selection when appropriate, rather than always posting the entire file. This should work naturally from the editor selection and remain clear in the UI when a Slack URL is present in the selected text.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the user has a non-empty selection that includes a Slack URL, Slackoscope can offer a posting action that uses the selected text instead of the full file.
- [ ] #2 If selection-based posting is offered, the action label or surrounding UX makes it clear whether the selection or the whole file will be posted.
- [ ] #3 The existing whole-file posting flow continues to work when there is no qualifying selection.
- [ ] #4 Tests cover the selection-aware behavior and guard against regressions in the current posting command.
<!-- AC:END -->
