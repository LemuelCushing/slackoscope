# Slackoscope, Explained for Ruby Devs

This repo is a VS Code extension that turns Slack message URLs in your code into something “alive”:

- Inline previews: show a snippet of the Slack message next to the URL.
- Hover previews: show a rich tooltip with the full message (and files).
- Decorations: replace channel IDs / timestamps inside the URL with human-friendly values.
- Code actions: “Insert as Comment”, and optionally “Post to Linear”.

If you’re coming from Ruby, the best mental model is:

- **`src/extension.ts`** is the equivalent of a Rails engine entrypoint.
- **Providers** are like framework hooks (controllers) called by VS Code.
- **Services** are service objects (pure-ish logic and orchestration).
- **`CacheManager`** is an in-memory store (like a tiny per-session cache).
- **`SlackUrlMatch`** is a value object (PORO) that encapsulates parsing + ranges.

This guide walks the code “in execution order”, starting from activation and following the data flow.

---

## 0) Where to Start: `src/extension.ts`

Open `src/extension.ts`.

This file is the entrypoint VS Code loads when the extension activates. Think: `lib/my_gem.rb` + initialization.

### Activation flow

1. VS Code calls `activate(context)`.
2. `activate()` builds an API factory (real vs mock) via `buildFactoryFor(context)`.
3. It instantiates `SlackoscopeExtension` and calls `extension.init()`.
4. It pushes the extension into `context.subscriptions` so VS Code can dispose it cleanly.

Key pieces to notice:

- `apiFactory` is dependency injection: it keeps production code clean while enabling test mocks.
- `SlackoscopeExtension` is a coordinator object that owns:
  - API clients (`SlackApi`, `LinearApi`)
  - the cache (`CacheManager`)
  - settings (`SettingsManager`)
  - “providers” (hover, decorations, code actions)
  - command registrations

### Lifecycle objects (Ruby analogy)

- `Disposer`: like `ActiveSupport::Callbacks` + a bucket of disposables; it centralizes cleanup.
- `AsyncLock`: a simple “serialize async work” utility to avoid overlapping reconfiguration (similar to a mutex around `reload!`).

### Initialization: `SlackoscopeExtension.init()`

Read `SlackoscopeExtension.init()` top-to-bottom:

1. `initSecrets()` checks whether 1Password CLI is available (skipped in tests).
2. `reconfigureFromSettings()` loads tokens and builds API clients.
3. Providers are constructed:
   - `new HoverProvider(...)`
   - `new DecorationProvider(...)`
   - `new CodeActionProvider(...)`
4. VS Code registrations happen:
   - `registerHoverProvider("*", hover)`
   - `registerCodeActionsProvider("*", codeActions, ...)`
   - `settings.onDidChange(...)` to respond to configuration changes
5. Commands are registered via `registerCommands(...)`.

The extension is now “wired”: VS Code drives the providers; providers call services/APIs; results are rendered via decorations/markdown or inserted via commands.

---

## 1) Configuration & Reconfiguration: `src/ui/settingsManager.ts`

Open `src/ui/settingsManager.ts`.

This class reads VS Code configuration (`slackoscope.*`) and presents it as structured settings objects:

- `inline`: settings for inline preview decorations
- `hover`: settings for hover behavior
- `highlighting`: settings for URL highlighting
- `slackToken`, `linearToken`: credentials

The interesting bit is `onDidChange(callback)`:

- VS Code emits configuration change events.
- `SettingsManager` refreshes the config snapshot.
- It computes a small diff-like event: `{tokensChanged, displayChanged}`.

Ruby analogy: a config object that publishes `tokensChanged?` and `displayChanged?` so your app can do selective reload.

Back in `src/extension.ts`, `handleSettingsChange()` uses that signal:

- if tokens changed ⇒ rebuild API clients (Slack/Linear) and refresh providers
- display changes ⇒ providers read settings on demand, plus DecorationProvider will reinitialize decoration types

---

## 2) The Cache: `src/cache/cacheManager.ts`

Open `src/cache/cacheManager.ts`.

This is a simple in-memory cache used to avoid repeated Slack/Linear requests during a VS Code session.

It stores:

- Slack messages
- Slack threads (parent + replies)
- Slack users
- Slack channels
- Linear issues
- URL metadata (Slack URL → Linear association)

The important design choice here is: **providers and services do not care how cache keys are built**.

For messages you now have:

- `cache.getMessage(channelId, ts)`
- `cache.setMessage(channelId, ts, message)`

That means call sites can stay “semantic” and avoid string-key duplication.

Ruby analogy: instead of `cache["#{channel_id}:#{ts}"]`, you call `cache.message(channel_id, ts)`.

---

## 3) Parsing Slack URLs + Ranges: `src/lib/slackUrl.ts`

Open `src/lib/slackUrl.ts`.

This is one of the highest-leverage abstractions in the repo: it turns a raw regex match into a **value object** that “knows itself”.

### What is `SlackUrlMatch`?

`SlackUrlMatch` bundles:

- the parsed Slack URL (`ParsedSlackUrl`)
- the exact VS Code `Range` where that URL occurs in the document

It also provides helpers:

- `channelIdRange()` ⇒ the sub-range covering just the channel ID portion of the URL
- `timestampRange()` ⇒ the sub-range covering the `p123...` timestamp portion (without the leading `/`)
- `contains(position)` ⇒ “is the cursor inside this URL?”

This is the “Ruby-esque” move: stop recomputing offsets everywhere; make the object answer questions.

### How it finds URLs

- `SlackUrlMatch.allInLine(slackApi, line)` ⇒ find all Slack URLs in a single line.
- `SlackUrlMatch.allInDocument(slackApi, document)` ⇒ find all Slack URLs in the document.

### Cursor behavior: “anywhere on the line”

`pickSlackUrlMatchForLine(slackApi, line, position)`:

- returns the URL under the cursor, if any
- otherwise, if there’s exactly one Slack URL on that line, it returns it anyway

That gives a more forgiving UX (cursor can be “nearby”).

---

## 4) Range helpers: `src/lib/vscodeRanges.ts`

Open `src/lib/vscodeRanges.ts`.

This file exists because VS Code range math is easy to repeat incorrectly:

- `rangeFromLineMatch(line, match)`
- `rangeFromDocumentMatch(document, match)`
- `rangeWithin(baseRange, startOffset, length)`

These are small, composable helpers that keep provider code clean and intention-revealing.

Ruby analogy: tiny helper methods that prevent “string slicing” bugs from spreading.

---

## 5) Slack API Client: `src/api/slackApi.ts`

Open `src/api/slackApi.ts`.

This file defines:

- `SLACK_URL_REGEX`: the canonical regex for Slack URLs.
- `ISlackApi`: the interface used throughout the app (enables mocking).
- `SlackApi`: the real implementation that does network requests to Slack.

Key methods:

- `parseSlackUrl(url)` ⇒ returns `{fullUrl, channelId, messageTs, threadTs?}`
- `getMessage(channelId, ts)` ⇒ fetches the single message by timestamp
- `getThread(channelId, threadTs)` ⇒ returns `{parent, replies}`
- `getUser(userId)`
- `getChannel(channelId)`

You’ll see this pattern throughout the repo:

- **providers/services** depend on the interface (`ISlackApi`)
- **extension wiring** chooses the real implementation or mock

Ruby analogy: an adapter object with a test double.

---

## 6) “Get or fetch” Slack data: `src/services/slackData.ts`

Open `src/services/slackData.ts`.

This is the shared “service layer” for Slack reads:

- `getOrFetchMessage(...)`
- `getOrFetchThread(...)`
- `getOrFetchUser(...)`
- `getOrFetchChannel(...)`

And one orchestrator:

### `getOrFetchMessagesForUrl(parsed)`

Given a parsed Slack URL, it returns:

- `targetMessage`: the message the URL points to
- `messages`: the set of messages you already have in hand (single message or thread)
- `replyCount`: thread reply count (0 for non-thread URLs)

That lets call sites do:

- render previews from `targetMessage`
- extract metadata from `messages` (including thread context)

Ruby analogy: a service object returning a small result struct.

---

## 7) Linear detection + URL metadata: `src/services/linearMetadata.ts`

Open `src/services/linearMetadata.ts`.

This module answers: “Does this Slack message (or thread) mention a Linear issue?”

### Key concepts

- `findLinearIssues(text)` scans for `ABC-123` style identifiers.
- `extractLinearIssueFromMessage(message)` knows about:
  - “Linear Asks” bot messages (issue URL in attachments)
  - normal text mentions

### Caching strategy

- `cacheLinearMetadataFromMessages(url, messages, linearApi, cacheManager)`:
  - computes a stable key for the underlying Slack message/thread
  - if already cached for that key, it returns early
  - otherwise it tries to find a Linear identifier
  - if found and `linearApi` exists, it fetches and caches the Linear issue
  - it stores Slack message/thread → `{linearIssueId, linearIdentifier}` in the cache
  - if nothing is found, it caches `null` so we don’t retry every time

### The “fallback” path: `getOrFetchLinearMetadata(parsed, ...)`

This is used when you have a parsed Slack reference (e.g. from a `SlackUrlMatch`) and don’t already have Slack messages fetched:

1. Compute a stable Slack key (message or thread).
2. Check `cacheManager.getLinearMetadata(key)`.
3. If missing, fetch the message/thread via `getOrFetchMessagesForUrl(...)`.
4. Call `cacheLinearMetadataFromMessages(...)`.
5. Return cached metadata (or `null`).

Ruby analogy: `Rails.cache.fetch(key) { expensive_work }`, but with explicit cache storage and “negative caching” (store `{}`).

---

## 8) Providers: VS Code calls these for UI behaviors

Providers are the extension’s “controllers”: VS Code calls them based on editor events.

### 8.1 Hover: `src/providers/hoverProvider.ts`

Open `src/providers/hoverProvider.ts`.

Flow:

1. `provideHover(document, position)` is invoked by VS Code.
2. It calls `findSlackUrlAtPosition(...)`.
3. If it finds a Slack URL:
   - it constructs a `MarkdownString`
   - if it’s a thread URL ⇒ `buildThreadHover(...)`
   - else ⇒ `buildMessageHover(...)`
4. It returns `new vscode.Hover(markdown)`

Important details:

- URL finding uses `pickSlackUrlMatchForLine(...)`, so the hover logic is consistent with code actions.
- Data retrieval is through `getOrFetchMessage/getOrFetchThread/getOrFetchUser/getOrFetchChannel`.
- After it has messages, it calls `cacheLinearMetadataFromMessages(parsed.fullUrl, allMessages, ...)` so code actions later can be instant.

Ruby analogy: build a “view model” and render it, but in Markdown.

### 8.2 Decorations: `src/providers/decorationProvider.ts`

Open `src/providers/decorationProvider.ts`.

This is the most “always-on” piece; it tracks editor changes and applies decorations.

High-level responsibilities:

- scan the document for Slack URLs
- decorate those URLs with:
  - inline preview text (optional)
  - highlight background (optional)
  - channel name replacement + timestamp replacement (optional)

#### Event wiring & cleanup

In the constructor:

- it updates visible editors immediately
- it subscribes to:
  - `onDidChangeTextDocument` ⇒ schedule a refresh (debounced)
  - `onDidChangeActiveTextEditor` ⇒ refresh
  - `settingsManager.onDidChange` ⇒ recreate decoration types and refresh
- it keeps those disposables and releases them in `dispose()`

This is a core VS Code best practice: **anything you register must be disposed**.

#### The main loop: `updateDecorations(editor)`

1. `SlackUrlMatch.allInDocument(...)` collects all Slack URLs + ranges.
2. If there are none ⇒ clear decorations and return.
3. If channel-name replacement is enabled:
   - call `updateChannelNameAndTimestampDecorations(editor, slackUrls)`
4. If inline previews are disabled via toggle ⇒ clear inline/highlights and return.
5. Otherwise, for each Slack URL:
   - fetch message(s) via `getOrFetchMessagesForUrl(...)`
   - cache Linear metadata via `cacheLinearMetadataFromMessages(...)`
   - build the inline preview string (user + preview + timestamp + thread count)
6. Apply:
   - inline decorations
   - highlight decorations (today vs old based on settings)

#### Channel name + timestamp replacement

`updateChannelNameAndTimestampDecorations(editor, slackUrls)`:

- uses `SlackUrlMatch.channelIdRange()` / `timestampRange()`
- fetches the channel name once per channel (cached)
- passes ranges + strings to `DecorationManager.applyChannelNameAndTimestampDecorations(...)`

This is the key “elegance” payoff of `SlackUrlMatch`: no repeated offset arithmetic.

### 8.3 Code Actions: `src/providers/codeActionProvider.ts`

Open `src/providers/codeActionProvider.ts`.

Flow:

1. VS Code calls `provideCodeActions(document, rangeOrSelection)`.
2. It identifies the relevant Slack URL via `pickSlackUrlMatchForLine(...)`.
3. It always offers:
   - “Slackoscope: Insert as Comment”
4. It optionally offers:
   - “Slackoscope: Post to XYZ-123” (Linear)
   - but only if `getOrFetchLinearMetadata(...)` finds cached/fetchable Linear metadata

Ruby analogy: “actions are just objects” and the provider decides which ones to show.

---

## 9) Rendering: `src/ui/decorationManager.ts` and `src/ui/formatting.ts`

### Decorations: `src/ui/decorationManager.ts`

This class is “drawing” primitives:

- create and apply inline decorations
- create and apply highlight decorations
- apply channel-name/timestamp “replacement” (by hiding the original text and rendering a `before` value)

Notable shape:

- highlight decorations use a typed structure:
  - `HighlightDecorations = { today: Range[], old: Range[] }`

Ruby analogy: the view layer that knows how to paint, not how to fetch.

### Formatting helpers: `src/ui/formatting.ts`

Small pure functions:

- `formatMessagePreview(text)`
- `formatTimestamp(ts, useRelative)`
- `formatRelativeTime(date)`

These help keep providers from doing presentation formatting inline.

---

## 10) Commands: `src/commands/*`

Commands are explicit user-invoked operations. They’re registered in `src/commands/index.ts`.

### `slackoscope.insertCommentedMessage`: `src/commands/insertComment.ts`

Flow:

1. Parse the URL.
2. Fetch the target message via `getOrFetchMessagesForUrl(...)`.
3. Convert message text to a commented snippet (`$LINE_COMMENT ...`).
4. Find the line containing the URL and insert the snippet after it (fallback: insert at cursor).

### `slackoscope.postToLinear`: `src/commands/postToLinear.ts`

Flow:

1. Read current file text.
2. Wrap it in a fenced code block.
3. `linearApi.createComment(issueId, body)`

### `slackoscope.toggleInlineMessage`: `src/commands/toggleInline.ts`

Just toggles DecorationProvider’s inline rendering on/off.

### `slackoscope.clearCache`: `src/commands/clearCache.ts`

Clears the in-memory caches and shows a stats summary.

Ruby analogy: Rake tasks / CLI commands exposed as VS Code commands.

---

## 11) Types: `src/types/*`

Types are plain TS interfaces that mirror external API payloads, e.g.:

- `src/types/slack.ts` defines `SlackMessage`, `SlackChannel`, etc.
- `src/types/linear.ts` defines `LinearIssue`, etc.
- `src/types/settings.ts` defines configuration shapes used by UI.

Ruby analogy: value structs / POROs that document shapes.

---

## 12) Tests & Mocks: `src/test/*`

This repo uses VS Code’s extension test runner. The important structure:

- `src/test/mocks.ts` provides `MockSlackApi` and `MockLinearApi` implementing the same interfaces as prod.
- tests can run without network by swapping the factory in `src/extension.ts`.

If you’re diagnosing behavior, start with:

- `src/test/slackApi.test.ts`
- `src/test/settings.test.ts`
- `src/test/linear.test.ts`

---

## 13) Build & Packaging: `package.json` and `esbuild.js`

The extension runs compiled JS:

- `src/*` is TypeScript source
- `dist/extension.js` is the built entrypoint referenced in `package.json` (`"main": "./dist/extension.js"`)

Commands you’ll use:

- `npm run check-types` (tsc noEmit)
- `npm run lint`
- `npm run package` (production build)
- `npm test` (VS Code integration runner)

---

## 14) A “Follow the Request” Trace (end-to-end)

Here’s a concrete trace you can keep in your head:

### When you open a file with a Slack URL

1. VS Code activates extension ⇒ `src/extension.ts`.
2. `DecorationProvider` scans the document ⇒ `SlackUrlMatch.allInDocument(...)`.
3. For each URL:
   - fetch Slack message/thread (cached) ⇒ `src/services/slackData.ts`
   - build inline preview text ⇒ `src/ui/formatting.ts`
   - decorate the editor ⇒ `src/ui/decorationManager.ts`

### When you hover the URL

1. VS Code calls `HoverProvider.provideHover(...)`.
2. It finds the URL match on that line.
3. It fetches Slack data (cached), renders markdown, and returns a Hover.
4. It caches Linear metadata for later code actions.

### When you open code actions on that line

1. VS Code calls `CodeActionProvider.provideCodeActions(...)`.
2. It picks the URL on the line (even if you’re not exactly on it).
3. It always offers “Insert as Comment”.
4. It calls `getOrFetchLinearMetadata(...)` and, if Linear info exists, offers “Post to LINEAR-123”.

---

## 15) “Ruby-esque” Reading Tips

If you want to read this like a Ruby codebase:

- Treat **providers** as thin controllers.
- Treat `src/services/*` as service objects doing orchestration.
- Treat `SlackUrlMatch` as a value object: push logic into it so call sites read like prose.
- Treat `CacheManager` as a boundary: call semantic methods, not string-key manipulation.

---

## 16) Next Refactors That Fit This Style (Optional)

If you want to keep pushing toward “clean Ruby”:

- Introduce a small `Result`-style helper for fallible parsing/fetch paths (instead of `null` + exceptions).
- Create a dedicated `SlackUrlRepository` (or `SlackMessageRepository`) that owns `getOrFetchMessagesForUrl` + caching rules.
- Make highlight logic a pure function that returns `{today, old}` ranges for testability.
- Consider normalizing quote style and imports in touched files (Prettier mostly handles this already).
