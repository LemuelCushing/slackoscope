---
id: TASK-17
title: Improve Slackoscope microcopy across commands and settings
status: To Do
assignee: []
created_date: '2026-03-11 10:34'
labels:
  - ux
  - copy
dependencies: []
references:
  - /Users/gillabarbanel/code/vscode_extensions/slackoscope/package.json
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/vscode/providers/codeActions.ts
  - /Users/gillabarbanel/code/vscode_extensions/slackoscope/README.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the extension’s user-facing text and make the intent of Slackoscope actions clearer, especially around command titles, code actions, and settings descriptions. The current wording makes some actions sound ambiguous, such as whether an action inserts inline text, inserts a comment, or posts content elsewhere.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Audit the current user-facing copy for command titles, code action labels, settings descriptions, and obvious error/help text surfaces.
- [ ] #2 Ambiguous wording around Slack actions is replaced with language that makes the action outcome clear at the call site.
- [ ] #3 Updated copy stays consistent across command palette entries, quick fixes, and configuration text.
- [ ] #4 README usage text is updated if the implemented wording changes user-facing terminology or expectations.
<!-- AC:END -->
