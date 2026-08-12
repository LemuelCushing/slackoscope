---
id: TASK-20
title: Fix broken "insert comment" link in the hover popup
status: Done
assignee: []
created_date: '2026-03-13 14:13'
updated_date: '2026-08-12 21:45'
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
- [x] #1 Activating the "insert comment" link from the hover popup triggers the expected insertion flow instead of doing nothing or failing silently.
- [x] #2 When the Slack URL is on the last line of the document, the insertion flow still places the generated content correctly on a following line instead of failing or misplacing it.
- [x] #3 For documents whose language is not clearly identified or does not have a usable comment style, the insertion flow has an explicit fallback behavior instead of failing ambiguously.
- [x] #4 The fallback behavior for unknown-language documents is user-comprehensible, whether that means inserting plain text/snippet content directly or surfacing a clear message that explains why comment insertion cannot proceed.
- [x] #5 Tests cover the hover popup action, the end-of-file case, and the unknown-language fallback so regressions in command wiring or insertion behavior are caught.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Expanded scope on 2026-03-13 to include two additional insert-comment edge cases reported by the user: URLs on the final line should still insert onto a new following line, and documents without a clear language/comment syntax need an explicit fallback path instead of ambiguous failure.

**Root cause (AC #1)**: the task-16 hover redesign moved action links into
`<div align="center">` wrappers, which required emitting them as raw HTML
`<a href="command:...">` anchors. VS Code only attaches click handling to links
its own markdown renderer produced — an HTML anchor with a `command:` href
survives sanitization on a trusted MarkdownString, renders as a link, and then
does nothing when clicked. This broke *every* hover action, not just Insert
comment: Refresh and all three Linear actions were dead too.

**Fixes**
- `renderers/hoverContent.ts`: `actionLink()` emits markdown link syntax only;
  the `html` parameter is gone. `actionRows()` indents rows with em-spaces
  instead of wrapping them in a centering `<div>` — markdown inside a raw HTML
  block is not parsed, so centering and working command links are mutually
  exclusive. The decorative `separator()` keeps its `<div>`; it has no links.
- `commands/insertComment.ts` (AC #2): the insert position was always
  `Position(anchorLine + 1, 0)`, which does not exist when the URL is on the
  last line. Now detects end-of-document, appends at the end of the last line,
  and leads the snippet with a newline instead of trailing one.
- `commands/insertComment.ts` (AC #3, #4): `${LINE_COMMENT}` silently fell back
  to `//` for languages with no line-comment token. `plaintext` (also what VS
  Code reports for unidentified files), `markdown`, and `log` now insert the
  message as plain text, with a 5s status-bar note naming the language.
- `providers/hover.ts`, `providers/codeActions.ts`: both now pass
  `lineNumber` from the URL occurrence. Previously the hover passed none, so
  insertion used `editor.selection.active.line` — the comment landed under
  whatever line the cursor happened to be on, not the URL being hovered.

**Tests (AC #5)**: new `Comment Insertion Edge Cases` suite in
`src/test/integration/extension.test.ts` covers the markdown-vs-HTML link
assertion (including a negative assertion that no action renders as an HTML
anchor), the line-number wiring, end-of-file insertion, and the plaintext
fallback.

**Known limitation**: languages with only block comments (css, html, xml) still
get `//` from the `${LINE_COMMENT}` default. Handling those needs a
comment-token table, which is out of scope here — see the follow-up task.
<!-- SECTION:NOTES:END -->
