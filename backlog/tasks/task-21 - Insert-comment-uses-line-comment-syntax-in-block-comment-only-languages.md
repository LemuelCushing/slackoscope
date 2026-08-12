---
id: task-21
title: Insert comment uses '//' in block-comment-only languages
status: To Do
assignee: []
created_date: '2026-08-12 21:45'
labels:
  - bug
  - editor
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to task-20. `insertComment` builds its comment with the VS Code
snippet variable `${LINE_COMMENT}` and a `//` default. Languages that ship only
a block-comment token — css, scss, html, xml — resolve `LINE_COMMENT` to
nothing, so the default wins and the inserted text is prefixed with `//`, which
is invalid in those documents.

task-20 handled the prose/unidentified case (`plaintext`, `markdown`, `log`)
by inserting plain text. Block-comment-only languages need the message wrapped
in the language's block comment instead, which means a small comment-token table
since VS Code exposes no API for a language's comment configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inserting into a css/scss/html/xml document produces a valid comment in that language.
- [ ] #2 Languages with a line-comment token keep using `${LINE_COMMENT}` and are unaffected.
- [ ] #3 The plain-text fallback from task-20 still applies to plaintext/markdown/log.
- [ ] #4 Tests cover at least one block-comment-only language.
<!-- AC:END -->
