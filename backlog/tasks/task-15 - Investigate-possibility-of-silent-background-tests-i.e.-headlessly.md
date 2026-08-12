---
id: task-15
title: 'Investigate possibility of silent background tests, i.e. headlessly'
status: Done
assignee: []
created_date: '2026-01-21 10:26'
updated_date: '2026-08-12 21:45'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Find out whether the test suite can run unattended — no VS Code window stealing
focus, no manual interaction — so tests are usable from a watch loop, a CI job,
or an agent.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Findings — there are two separate answers.**

1. `npm test` (`vscode-test`) already runs headlessly on Linux under
   `xvfb-run -a npm test`: it launches a real VS Code in a virtual display, so
   nothing appears on screen and nothing needs clicking. On macOS there is no
   equivalent — Electron always opens a window. What `vscode-test` *cannot* do
   is run offline: it resolves and downloads a VS Code build from
   `update.code.visualstudio.com` on first run, so it needs network egress to
   that host and a warm `.vscode-test` cache afterwards.

2. About a third of the suite never touches the VS Code API at all. Those tests
   run in plain mocha in milliseconds, with no download, no Electron, and no
   display server.

**What changed**

- Tests are split by what they need: `src/test/unit` (no `vscode` import) and
  `src/test/integration` (drives the real editor). Shared helpers — `fixtures`,
  `mocks`, `setup`, `testRegistry`, `testUtils` — stay in `src/test`.
- Added `npm run test:unit`, which compiles and runs `out/test/unit/**` in plain
  mocha. 51 tests, ~15ms, no VS Code involved.
- `npm test` is unchanged and still runs both suites in VS Code.

**Recommendation**: use `test:unit` as the fast inner loop and for any
environment without egress to `update.code.visualstudio.com`; keep the full
`vscode-test` run (under `xvfb-run` on Linux CI) as the gate before merge. If
the split proves useful, more of the integration suite could move down —
`HoverContentBuilder` output, for instance, is nearly pure string building and
only needs `vscode.MarkdownString`.
<!-- SECTION:NOTES:END -->
