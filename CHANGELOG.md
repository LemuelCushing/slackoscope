# Change Log

All notable changes to the "slackoscope" extension will be documented in this file.

## [Unreleased]

## [1.5.1] - 2026-08-13

### Fixed
- **Hover action links did nothing when clicked**: hover actions were rendered as raw
  HTML `<a href="command:...">` anchors. VS Code only wires up click handling for links
  it generated from markdown, so every hover action — Insert comment, Refresh, and all
  the Linear actions — rendered as a link and then did nothing. They are markdown links
  again, indented instead of centered (markdown inside a raw HTML block is not parsed,
  so the two cannot be combined).
- **Insert comment at end of file**: inserting from a Slack URL on the last line targeted
  a line that does not exist. The comment is now appended below the URL on a new line.
- **Insert comment used the cursor's line, not the URL's**: the hover and quick-fix actions
  now pass the line of the URL you acted on, so the comment lands under it even when the
  cursor is elsewhere.
- **Insert comment in documents with no comment syntax**: `plaintext`, `markdown`, and `log`
  documents no longer get a meaningless `//` prefix. The message is inserted as plain text
  and the status bar explains why.
- **`npm test` could not launch VS Code**: `@vscode/test-cli` 0.0.15 needs
  `@vscode/test-electron` 3.x, which was still pinned to 2.x. VS Code 1.110+ renamed the
  macOS executable, so 2.x looked for a binary that no longer exists and the whole suite
  died with `spawn .../Contents/MacOS/Electron ENOENT` before a single test ran.
- **Moved tests kept running from their old location**: `compile-tests` never cleaned `out/`,
  so the pre-split copies of every relocated test lingered and ran alongside the current
  ones — asserting long-since-changed microcopy and failing. `out/` is now cleaned first.
- **Caching test compared the wrong thing**: hover actions now embed the line they act on,
  so the same message hovered on two lines legitimately renders two different strings. The
  cache assertion compares the message body instead of the chrome around it.
- **Settings tests failed on any machine that had run them before**: `.vscode-test/user-data`
  survives between runs, so a Global setting written by an earlier suite and never restored
  was still there on the next run, and the "defaults to true" assertions read the leftover.
  They now assert against the value package.json contributes (`inspect().defaultValue`),
  which no amount of profile drift can change.

### Added
- `npm run test:unit` — runs the VS Code-independent tests in plain mocha, with no VS Code
  download and no display server. Tests are split into `src/test/unit` and
  `src/test/integration`; `npm test` still runs both.
- `.github/dependabot.yml` — weekly grouped npm updates.
- `mocha` is now a direct devDependency — `test:unit` invokes it, and borrowing the binary
  from `@vscode/test-cli`'s tree meant a dependabot bump could silently take it away.
- `overrides` for `diff` and `serialize-javascript`, mocha's two vulnerable transitive deps.
  No mocha release clears them yet; `npm audit` now reports zero advisories.
- A `vscode` stub (`src/test/unit` runs against it) so settings, commands, code actions and
  hover content can be tested without an editor. Its configuration defaults are read from
  `package.json`, so a default that drifts in the manifest fails the tests too.
- GitHub Actions: `ci.yml` runs both suites on every push and PR — on Ubuntu under `xvfb`,
  where the integration suite really is headless. `publish.yml` releases to the Marketplace
  when a `v*` tag is pushed, refusing to publish if the tag and manifest versions disagree.

### Changed
- `npm test` no longer opens a VS Code window as a side effect of running "the tests".
  `npm run test:unit` is headless and takes under a second; `npm run test:integration` is
  the one that needs a window, and now has to be asked for by name. `npm test` runs both.

## [1.5.0]

### Added
- **Thread support**: View thread replies in hover tooltips with reply count indicators
- **Inline message preview**: Display message content inline next to URLs (ephemeral, customizable)
  - Toggle command: "Slackoscope: Toggle Inline Message Display"
  - Position options: right (default), above, or below URL
  - Show/hide timestamp and user name
  - Relative time display ("5m ago" vs "2:30 PM")
  - Customizable font size (10-24px), color, and style
- **Channel name display**: View channel names in hover tooltips
- **User name display**: Show message authors in hover and inline previews
- **Linear integration**:
  - Detect Linear issues mentioned in Slack threads
  - Post current file as comment to Linear issues
  - Command: "Slackoscope: Post to Linear Issue"
- **File attachments**: View file attachments in hover with image previews
- **Message age highlighting**: Color-code URLs by message age (today vs old)
  - Customizable colors and age threshold
- **Code actions**: Quick action menu (Cmd+.) for "Insert as Comment"
- **1Password integration**: Securely load tokens from 1Password CLI (`op://` references)
- **Enhanced caching**: Multi-tier cache for messages, threads, users, channels, Linear issues

### Changed
- **Major architectural refactoring**: Modular structure with separate directories for API, cache, providers, UI, commands
- **Configuration structure**: New nested settings (inline.*, hover.*, highlighting.*)
- **Activation behavior**: Extension now activates even without Slack token configured
  - Shows helpful warning messages when token is missing
  - All commands and providers register regardless of token state
  - API calls fail gracefully with clear error messages

### Fixed
- **Test Suite Stability**: Fixed unhandled promise rejections in the test suite that were causing excessive stack traces. Replaced unsafe `try...catch` blocks with `assert.rejects` to ensure tests fail gracefully and predictably.
- Extension activation failure when Slack token not configured
- Token validation moved from constructor to API methods for graceful degradation

### Technical
- New directory structure:
  - `src/api/` - SlackApi, LinearApi, OnePasswordApi
  - `src/cache/` - CacheManager and cache implementations
  - `src/providers/` - HoverProvider, DecorationProvider, CodeActionProvider
  - `src/ui/` - SettingsManager, formatting utilities, DecorationManager
  - `src/commands/` - Command implementations
  - `src/types/` - TypeScript interfaces for Slack, Linear, settings
- Full TypeScript strict mode compliance
- Comprehensive test coverage for new features

## [1.0.0] - Initial Release

### Added
- Hover over Slack URLs to preview message content
- Insert Slack messages as comments (language-agnostic)
- Session-based message caching
- Support for public and private channels
- User and Bot token authentication