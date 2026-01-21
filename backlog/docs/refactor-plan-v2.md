# Slackoscope Refactor Plan v2: Elegant TypeScript for Ruby Minds

This plan builds on `mvc-reorg-plan.md` but pushes further toward truly elegant, self-documenting code. The goal isn't just to reorganize—it's to make this codebase a joy to navigate, where the structure itself tells the story.

---

## Philosophy

### What We're After

1. **Meaning over mechanism** — Code should reveal intent, not implementation details
2. **Types as documentation** — If you need a comment to explain what a type accepts, the type is wrong
3. **Convention over configuration** — Predictable locations, predictable names
4. **Registry patterns** — One place to see the full surface area (like `routes.rb`)
5. **Value objects** — Domain concepts that are immutable and self-validating
6. **Metaprogramming with care** — When it creates clearer interfaces, not when it hides behavior

### What We're Not After

- Cargo-cult MVC — We take Rails' clarity, not its specific folder names
- Over-abstraction — No `AbstractFactoryFactory`. If it's used once, inline it.
- Comments as crutch — If you need a comment, refactor the code first

---

## Current Pain Points

### 1. `SlackApi` Couples URL Parsing with HTTP Client

The regex and `parseSlackUrl()` live on `SlackApi`, but URL parsing is pure—it doesn't need a token or HTTP client. This couples things that shouldn't be coupled.

**Problem**: Every consumer that needs to parse URLs must depend on `ISlackApi`.

### 2. `SlackUrlMatch` Is Half Value Object, Half VS Code Helper

It holds parsed URL data *and* VS Code ranges. These are different concerns:
- The URL data is domain logic (pure)
- The range is editor state (VS Code-specific)

**Problem**: Can't use the URL parsing logic without importing `vscode`.

### 3. Cache Keys Are Stringly-Typed

```typescript
getMessage(channelId: string, ts: string)
```

Nothing prevents calling `getMessage(ts, channelId)` with args swapped.

**Problem**: Silent bugs, no compile-time help.

### 4. Commands Are Registered Imperatively

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('slackoscope.toggleInlineMessage', () => ...),
  vscode.commands.registerCommand('slackoscope.insertCommentedMessage', () => ...),
  // ...
)
```

**Problem**: Have to grep to find all commands. Easy to forget `package.json` sync.

### 5. Naming Confusion

- `DecorationProvider` is not a VS Code provider
- `DecorationManager` is really a renderer
- `SettingsManager` is really a config reader
- `services/` vs `lib/` — what's the distinction?

---

## Target Architecture

```
src/
├── extension.ts                      # Composition root only
│
├── domain/                           # Pure TypeScript, zero VS Code imports
│   ├── slack/
│   │   ├── url.ts                    # SlackUrl value object
│   │   ├── message.ts                # Message types
│   │   └── index.ts
│   ├── linear/
│   │   ├── issue.ts                  # Issue detection, types
│   │   └── index.ts
│   └── index.ts
│
├── integrations/                     # HTTP clients (external world)
│   ├── slack/
│   │   ├── client.ts                 # SlackClient
│   │   └── index.ts
│   ├── linear/
│   │   ├── client.ts                 # LinearClient
│   │   └── index.ts
│   ├── onePassword/
│   │   └── client.ts
│   └── index.ts                      # Integration factory
│
├── store/                            # In-memory state
│   ├── cache.ts                      # Generic typed cache
│   ├── slackStore.ts                 # Slack resource store
│   ├── linearStore.ts                # Linear resource store
│   └── index.ts
│
├── vscode/                           # Everything that imports 'vscode'
│   ├── providers/                    # True VS Code providers
│   │   ├── hover.ts
│   │   ├── codeActions.ts
│   │   └── index.ts                  # Provider registry
│   │
│   ├── controllers/                  # Event-driven orchestrators
│   │   ├── decorations.ts            # DecorationController
│   │   └── index.ts
│   │
│   ├── commands/                     # Command implementations
│   │   ├── registry.ts               # Command registry (the routes.rb)
│   │   ├── toggleInline.ts
│   │   ├── insertComment.ts
│   │   ├── clearCache.ts
│   │   └── postToLinear.ts
│   │
│   ├── renderers/                    # View layer (builds UI output)
│   │   ├── hoverContent.ts           # Markdown builder for hovers
│   │   ├── decorations.ts            # Decoration type builder
│   │   └── formatting.ts             # Time formatting, etc.
│   │
│   ├── editor/                       # Editor document helpers
│   │   ├── urlOccurrence.ts          # SlackUrlOccurrence (URL + Range)
│   │   ├── ranges.ts                 # Range utilities
│   │   └── scanner.ts                # Document scanning
│   │
│   ├── config/                       # Settings
│   │   ├── settings.ts               # Settings reader
│   │   └── index.ts
│   │
│   └── index.ts                      # Public vscode API
│
└── test/                             # Tests mirror src/ structure
    ├── domain/
    ├── integrations/
    ├── store/
    └── vscode/
```

---

## Key Transformations

### 1. Extract `SlackUrl` Value Object

**Before** (coupled to SlackApi):
```typescript
// To parse a URL, you need ISlackApi
const parsed = slackApi.parseSlackUrl(url)
```

**After** (pure domain object):
```typescript
// domain/slack/url.ts
import type {Brand} from '../brand'

// Branded type - can't be confused with plain string
export type SlackUrl = Brand<{
  readonly raw: string
  readonly workspace: string
  readonly channelId: string
  readonly messageTs: string
  readonly threadTs?: string
}, 'SlackUrl'>

// Factory - the ONLY way to create a SlackUrl
export function parseSlackUrl(raw: string): SlackUrl | null {
  const match = SLACK_URL_REGEX.exec(raw)
  if (!match) return null

  const [fullMatch, channelId, rawTs, threadTs] = match
  const workspace = extractWorkspace(raw)
  const messageTs = formatTimestamp(rawTs)

  return {
    raw,
    workspace,
    channelId,
    messageTs,
    threadTs,
  } as SlackUrl
}

// Derived properties as functions (not methods - more composable)
export const isThread = (url: SlackUrl) => url.threadTs !== undefined
export const cacheKey = (url: SlackUrl) => `${url.channelId}:${url.messageTs}`
```

**Why**:
- Pure function, zero dependencies
- Branded type prevents mixing up with strings
- Can be tested without any VS Code setup
- Composable with other functions

### 2. Type-Safe Cache with Branded Keys

**Before** (stringly-typed, error-prone):
```typescript
getMessage(channelId: string, ts: string)  // easy to swap args
```

**After** (type-safe):
```typescript
// store/cache.ts
type CacheKey<T extends string> = string & { readonly __key: T }

function messageCacheKey(channelId: string, ts: string): CacheKey<'message'> {
  return `${channelId}:${ts}` as CacheKey<'message'>
}

class TypedCache<K extends CacheKey<string>, V> {
  private map = new Map<K, V>()

  get(key: K): V | undefined { return this.map.get(key) }
  set(key: K, value: V): void { this.map.set(key, value) }
}

// Usage - can't mix up cache types
const messageCache = new TypedCache<CacheKey<'message'>, SlackMessage>()
messageCache.set(messageCacheKey('C123', '123.456'), message)
```

### 3. Command Registry (The routes.rb Pattern)

**Before** (imperative, scattered):
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('slackoscope.toggleInlineMessage', ...),
  // ... more
)
```

**After** (declarative registry):
```typescript
// vscode/commands/registry.ts

// Command definitions - this IS the documentation
const COMMANDS = {
  toggleInlineMessage: {
    handler: toggleInline,
    inject: ['decorationController'] as const,
  },
  insertCommentedMessage: {
    handler: insertComment,
    inject: ['slackClient', 'store'] as const,
  },
  clearCache: {
    handler: clearCache,
    inject: ['store'] as const,
  },
  postToLinear: {
    handler: postToLinear,
    inject: ['linearClient'] as const,
  },
} as const satisfies CommandRegistry

// Type derived from registry - compile-time safety
export type CommandId = keyof typeof COMMANDS
export type FullCommandId = `slackoscope.${CommandId}`

// Registration - handles all the wiring
export function registerCommands(
  context: vscode.ExtensionContext,
  container: DependencyContainer
) {
  for (const [name, def] of Object.entries(COMMANDS)) {
    const deps = def.inject.map(k => container[k])
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `slackoscope.${name}`,
        (...args) => def.handler(...deps, ...args)
      )
    )
  }
}

// Bonus: Generate package.json commands section
export function generatePackageJsonCommands() {
  return Object.keys(COMMANDS).map(name => ({
    command: `slackoscope.${name}`,
    title: `Slackoscope: ${humanize(name)}`,
  }))
}
```

**Why**:
- One file to see ALL commands
- Adding a command = one object literal
- Type system enforces consistency
- Can generate `package.json` contributions

### 4. Separate `SlackUrlOccurrence` from Domain

**Before** (mixed concerns):
```typescript
// SlackUrlMatch has both parsed URL AND vscode.Range
class SlackUrlMatch {
  private constructor(
    private readonly parsedUrl: ParsedSlackUrl,  // domain
    public readonly range: vscode.Range          // editor state
  ) {}
}
```

**After** (separated):
```typescript
// domain/slack/url.ts — pure
export type SlackUrl = { /* ... */ }
export function parseSlackUrl(raw: string): SlackUrl | null

// vscode/editor/urlOccurrence.ts — VS Code specific
export class SlackUrlOccurrence {
  private constructor(
    public readonly url: SlackUrl,      // domain object
    public readonly range: vscode.Range // editor state
  ) {}

  static scan(document: vscode.TextDocument): SlackUrlOccurrence[] {
    return [...document.getText().matchAll(SLACK_URL_REGEX)]
      .map(match => {
        const url = parseSlackUrl(match[0])
        if (!url) return null
        const range = rangeFromMatch(document, match)
        return new SlackUrlOccurrence(url, range)
      })
      .filter(Boolean)
  }

  static at(document: vscode.TextDocument, position: vscode.Position): SlackUrlOccurrence | null {
    const line = document.lineAt(position.line)
    return this.scan({ getText: () => line.text, /* ... */ })
      .find(occ => occ.range.contains(position)) ?? null
  }
}
```

### 5. Hover Content Builder (View Layer)

**Before** (markdown string building mixed with logic):
```typescript
// In hoverProvider.ts - 200+ lines of markdown.appendMarkdown() calls
markdown.appendMarkdown(`${channelIcon} **#${channel.name}**\n\n`)
markdown.appendMarkdown(`**@${user.displayName}** (${relativeTime}):\n\n`)
// ... etc
```

**After** (fluent builder):
```typescript
// vscode/renderers/hoverContent.ts
export class HoverContentBuilder {
  private sections: string[] = []

  channel(channel: SlackChannel): this {
    const icon = channel.isPrivate ? '🔒' : '📧'
    this.sections.push(`${icon} **#${channel.name}**`)
    return this
  }

  author(user: SlackUser, timestamp: Date): this {
    const time = formatRelativeTime(timestamp)
    this.sections.push(`**@${user.displayName}** (${time}):`)
    return this
  }

  message(text: string): this {
    this.sections.push(`> ${text}`)
    return this
  }

  linearIssue(issue: LinearIssue): this {
    this.sections.push(`📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"`)
    this.sections.push(`Status: ${issue.state.name}`)
    return this
  }

  action(label: string, command: string, args: object): this {
    const encoded = encodeURIComponent(JSON.stringify(args))
    this.sections.push(`[${label}](command:${command}?${encoded})`)
    return this
  }

  build(): vscode.MarkdownString {
    const md = new vscode.MarkdownString(this.sections.join('\n\n'))
    md.isTrusted = true
    md.supportHtml = true
    return md
  }
}

// Usage in hover provider - clean and readable
const content = new HoverContentBuilder()
  .channel(channel)
  .author(user, message.timestamp)
  .message(message.text)
  .linearIssue(issue)
  .action('Insert as Comment', 'slackoscope.insertCommentedMessage', {url})
  .build()
```

### 6. Rename for Clarity

| Current | Proposed | Reason |
|---------|----------|--------|
| `DecorationProvider` | `DecorationController` | It orchestrates, not provides |
| `DecorationManager` | `DecorationRenderer` | It renders decorations |
| `SettingsManager` | `Settings` | It's a config reader, not a manager |
| `SlackUrlMatch` | `SlackUrlOccurrence` | "Match" sounds like regex; this is a thing in the editor |
| `slackData.ts` | `slackLoader.ts` | It loads/fetches Slack resources |
| `linearMetadata.ts` | `linearDetector.ts` | It detects Linear issues in messages |

---

## Implementation Phases

### Phase 0: Preparation (PR #1)
- [ ] Ensure all tests pass
- [ ] Add `domain/brand.ts` for branded types utility
- [ ] Document the target architecture in this file

### Phase 1: Extract Domain Layer (PR #2)
- [ ] Create `domain/slack/url.ts` with `SlackUrl` value object
- [ ] Create `domain/linear/issue.ts` with issue detection
- [ ] Move regex and parsing out of `SlackApi`
- [ ] Update all consumers to use domain objects
- [ ] Add unit tests for domain layer

### Phase 2: Reorganize Store (PR #3)
- [ ] Create `store/` with typed cache
- [ ] Move `CacheManager` → `store/slackStore.ts` + `store/linearStore.ts`
- [ ] Use branded cache keys
- [ ] Update all consumers

### Phase 3: Reorganize Integrations (PR #4)
- [ ] Move `api/` → `integrations/`
- [ ] Rename `SlackApi` → `SlackClient`
- [ ] Rename `LinearApi` → `LinearClient`
- [ ] Create `integrations/index.ts` factory

### Phase 4: Reorganize VS Code Layer (PR #5)
- [ ] Create `vscode/` structure
- [ ] Move providers, commands, controllers
- [ ] Separate `SlackUrlOccurrence` from domain
- [ ] Create barrel exports

### Phase 5: Add Registries (PR #6)
- [ ] Create `vscode/commands/registry.ts`
- [ ] Create `vscode/providers/registry.ts`
- [ ] Simplify `extension.ts` to composition root only

### Phase 6: Rename Symbols (PR #7)
- [ ] `DecorationProvider` → `DecorationController`
- [ ] `DecorationManager` → `DecorationRenderer`
- [ ] `SettingsManager` → `Settings`
- [ ] Update all imports

### Phase 7: View Layer Cleanup (PR #8)
- [ ] Create `HoverContentBuilder`
- [ ] Extract markdown building from providers
- [ ] Create `DecorationBuilder` if needed

### Phase 8: Polish (PR #9)
- [ ] Add path aliases (`@domain/`, `@store/`, etc.)
- [ ] Add ESLint boundary rules
- [ ] Update all documentation
- [ ] Final test pass

---

## Open Decisions

### 1. Path Aliases?

**Option A**: Use path aliases (`@domain/slack/url`)
- Pro: Clean imports
- Con: Need to configure esbuild

**Option B**: Keep relative imports
- Pro: Zero config
- Con: `../../../domain/slack/url` noise

**Recommendation**: Yes, add path aliases. The import clarity is worth the one-time config.

### 2. Test Colocation?

**Option A**: Tests next to source (`url.ts` + `url.test.ts`)
- Pro: Easy to find, Ruby-ish
- Con: VS Code test runner expects `src/test/`

**Option B**: Separate test tree mirroring src
- Pro: Works with VS Code test runner out of box
- Con: Tests far from source

**Recommendation**: Keep separate tree for now. VS Code extension testing has constraints.

### 3. Barrel Export Depth?

**Option A**: Deep barrels (`domain/index.ts` re-exports everything)
- Pro: One import for all domain stuff
- Con: Can lead to circular dependencies

**Option B**: Shallow barrels (each subfolder has `index.ts`)
- Pro: Explicit imports, no cycles
- Con: More import lines

**Recommendation**: Shallow barrels. Import from `domain/slack` not just `domain`.

---

## Success Criteria

1. **Navigability**: A new contributor can find any concept in < 30 seconds
2. **No mixed concerns**: `domain/` has zero `vscode` imports
3. **Type safety**: Can't mix up cache keys or pass wrong arguments
4. **Self-documenting**: No comments needed to understand what a file does
5. **All tests pass**: No regressions
6. **Clean imports**: No `../../../` chains

---

## Appendix: Branded Types Utility

```typescript
// domain/brand.ts
declare const __brand: unique symbol
export type Brand<T, B extends string> = T & { readonly [__brand]: B }
```

This enables:
```typescript
type UserId = Brand<string, 'UserId'>
type ChannelId = Brand<string, 'ChannelId'>

function getUser(id: UserId): Promise<User>

// Compile error: can't pass ChannelId where UserId expected
getUser(channelId)  // ❌ Type error
getUser(userId)     // ✅ Works
```
