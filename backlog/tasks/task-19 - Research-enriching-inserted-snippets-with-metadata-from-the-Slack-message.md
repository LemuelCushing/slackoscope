---
id: TASK-19
title: Research enriching inserted snippets with metadata from the Slack message
status: To Do
assignee: []
created_date: '2026-03-11 10:34'
labels:
  - research
  - snippets
  - slack
dependencies: []
references:
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/vscode/commands/insertComment.ts
  - >-
    /Users/gillabarbanel/code/vscode_extensions/slackoscope/src/linear/detector.ts
  - /Users/gillabarbanel/code/vscode_extensions/slackoscope/README.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate whether Slackoscope can enrich inserted comment/snippet output with structured information derived from the Slack message or thread, such as automatically including a ticket identifier extracted from the message context. The goal is to understand what VS Code snippet and extension APIs allow here, what metadata is reliably available, and whether the UX would be robust enough to ship.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document what metadata is already available at insert-comment time and what additional context could realistically be derived from the Slack message or thread.
- [ ] #2 Assess whether the inserted snippet/comment flow can be enriched with context such as a ticket number without making the command brittle or confusing.
- [ ] #3 Call out technical constraints from the VS Code extension/snippet model that affect this idea.
- [ ] #4 Conclude with a recommendation: feasible to implement now, feasible with constraints, or not worth pursuing.
<!-- AC:END -->
