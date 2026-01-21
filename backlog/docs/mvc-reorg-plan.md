# MVC-ish Reorg Plan (VS Code Extension, TypeScript)

This document is a **future implementation plan** for reorganizing and renaming the Slackoscope codebase to be:

- More discoverable (Ruby/Rails-friendly mental model)
- More consistent (clear roles, predictable file locations)
- Less “patched together” (fewer scattered helpers, fewer “where does this live?” moments)
- Still idiomatic and maintainable in TypeScript + VS Code extension conventions

It is intentionally **open-ended** in places where multiple routes are valid. The goal is to decide *one coherent convention* and then apply it consistently.

This plan is based on the repo as it exists now (current file inventory below).

---

## 1) Design Principles (Non-negotiables)

1. **One term = one role**
   - If we use “Provider”, it means a VS Code `*Provider` interface implementation.
   - If we use “Controller”, it means “subscribes to VS Code events; orchestrates updates.”
   - If we use “Renderer”, it means “pure-ish view output; no fetching; no cache mutation.”
2. **Keep parsing/selection logic close to the object**
   - Prefer “a class that knows about itself” over free-floating helpers.
3. **Prefer stable identities for caching**
   - Raw URLs should be inputs for parsing and command arguments, not cache keys for message-derived facts.
4. **Avoid “mystery folders”**
   - Folder names must be self-explanatory to a Ruby dev without architectural jargon.
5. **Minimal behavior changes**
   - This reorg should primarily be “move/rename + boundary cleanup”, not feature changes.

---

## 2) Current Inventory (As of Today)

### Entry / Wiring
- `src/extension.ts`

### External integrations (currently named `api/`)
- `src/api/slackApi.ts`
- `src/api/linearApi.ts`
- `src/api/onePasswordApi.ts`

### State/caching (currently named `cache/`)
- `src/cache/cacheManager.ts`
- `src/cache/cacheTypes.ts`

### VS Code entrypoints / hooks
- Providers:
  - `src/providers/hoverProvider.ts`
  - `src/providers/codeActionProvider.ts`
  - `src/providers/decorationProvider.ts` *(note: not a VS Code Provider interface; it’s an event-driven orchestrator)*
- Commands:
  - `src/commands/index.ts`
  - `src/commands/insertComment.ts`
  - `src/commands/postToLinear.ts`
  - `src/commands/clearCache.ts`
  - `src/commands/toggleInline.ts`

### “UI” (rendering + config)
- `src/ui/decorationManager.ts`
- `src/ui/settingsManager.ts`
- `src/ui/formatting.ts`

### Cross-cutting logic
- `src/services/slackData.ts` (get-or-fetch Slack resources with caching)
- `src/services/linearMetadata.ts` (extract/cached Linear metadata)
- `src/lib/slackUrl.ts` (Slack URL occurrence + selection)
- `src/lib/vscodeRanges.ts` (Range helpers)

### Types & tests
- `src/types/*`
- `src/test/*`

---

## 3) The Core Confusions We’re Fixing

### 3.1 “Provider” means two different things
- `HoverProvider` and `CodeActionProvider` are true VS Code providers.
- `DecorationProvider` behaves like a long-lived orchestrator (subscriptions, timers, refresh), i.e. a **Controller**.

### 3.2 “Manager” means different things
- `DecorationManager` is a **Renderer** (it renders decorations).
- `SettingsManager` is a **Configuration adapter** (reads VS Code settings, emits changes).

### 3.3 “lib/”, “services/”, “ui/” are vague
These folder names are common in JS repos but do not communicate *role* well to Ruby brains.

### 3.4 Discoverability requires “hub” files
Ruby/Rails devs expect:
- a single command registry (like `routes.rb`)
- a single “wiring” file for integrations
- a clear place for “controllers” vs “views”

---

## 4) Proposed Target Mental Model (MVC-ish)

### 4.1 Model
“Model” here means “state + typed data”. In VS Code extensions this is usually:
- an in-memory store (session-level state)
- data types
- identifiers/keys

### 4.2 Controller
Long-lived orchestrators that subscribe to VS Code events and coordinate work.
- Example: the thing currently named `DecorationProvider`.

### 4.3 View (Renderer)
Pure-ish rendering and presentation: build markdown, apply decorations, build action objects.
- Example: `DecorationManager` is really a view renderer for decorations.

### 4.4 Adapters
VS Code providers + commands are adapters:
- Providers: called by VS Code to provide hovers/code actions.
- Commands: called by VS Code commands palette/context, etc.

---

## 5) Target Folder Layout (Options)

There are multiple valid layouts. Pick ONE and commit to it.

### Option A (Recommended): Explicit “vscode/” + “integrations/” + “state/”

`src/`
- `extension.ts` *(keep entrypoint stable for esbuild)*
- `integrations/` *(external services; currently `api/`)*
- `state/` *(in-memory store; currently `cache/`)*
- `vscode/` *(everything that depends on `vscode` module)*
  - `controllers/`
  - `providers/`
  - `commands/`
  - `renderers/`
  - `editor/` *(document scanning, ranges, occurrences)*
  - `config/` *(defaults, settings adapter)*
- `types/` *(or fold types under the folders that own them)*

Pros:
- Extremely discoverable: “VS Code stuff is in vscode/”
- “Integrations” is a very intuitive folder name
- “state/” reads more clearly than “cache/” in this repo

Cons:
- Some code that is currently “pure” but used by VS Code might end up under `vscode/` if it imports `vscode`.

### Option B: Top-level MVC folders

`src/`
- `controllers/`
- `views/` (or `renderers/`)
- `models/`
- `integrations/`
- `extension.ts`

Pros:
- Rails vibes

Cons:
- VS Code has special concepts (“Providers”, “Commands”) that don’t map perfectly.
- You’ll likely end up reintroducing subfolders that are basically `vscode/` anyway.

### Option C: Keep current top-level folders, rename the confusing bits

Rename and clarify within existing shape:
- `src/providers/decorationProvider.ts` → `src/controllers/decorationController.ts`
- `src/ui/decorationManager.ts` → `src/ui/decorationRenderer.ts`
- `src/services/` → `src/logic/`
- `src/lib/` → `src/editor/`

Pros:
- Smaller diff

Cons:
- Still easier to “get lost” because VS Code-specific and non-VS Code-specific code are mixed.

**Open decision:** Which layout feels most “obvious” when you open the tree cold?

---

## 6) Naming Conventions (Options)

Pick a consistent vocabulary. Suggested set:

- `*Controller`: orchestrates, subscriptions, timers, “when to update”
- `*Provider`: implements VS Code provider interfaces
- `*Renderer`: produces VS Code UI output (decorations, markdown, code actions)
- `*Client`: integration client (SlackClient, LinearClient, OnePasswordClient)
- `*Store`: in-memory state container
- `*Occurrence` / `*Reference`: an “instance in editor text” (range + parsed identity)

### Specific renames (proposed)

| Current | Proposed | Notes |
|---|---|---|
| `DecorationProvider` | `DecorationController` | It’s event-driven orchestration. |
| `DecorationManager` | `DecorationRenderer` | It renders; it doesn’t manage orchestration. |
| `SettingsManager` | `Settings` or `Configuration` | It adapts VS Code settings; “Manager” is vague. |
| `SlackUrlMatch` | `SlackUrlOccurrence` (or `SlackUrlReference`) | “match” sounds like regex; “occurrence” sounds like a thing. |
| `slackData.ts` | `slackLookup.ts` / `slackQueries.ts` / `slackResourceLoader.ts` | “Repository/Store” may feel unnatural; “Lookup/Loader” reads closer to intent. |
| `linearMetadata.ts` | keep or rename to `linearContext.ts` / `linearLinking.ts` | “Metadata” is OK if it truly represents “derived context.” |

**Open decision:** Do we want “Rails words” (Controller/View/Model) everywhere, or keep some TS norms (Provider/Renderer)?

---

## 7) Concrete Mapping Plan (File Moves + Renames)

This section assumes Option A (recommended). If you choose another option, the mapping changes but the step sequence is similar.

### 7.1 Moves (no symbol renames yet)

Move files first (mechanical), then rename symbols (semantic).

#### Integrations
- `src/api/slackApi.ts` → `src/integrations/slack/client.ts`
- `src/api/linearApi.ts` → `src/integrations/linear/client.ts`
- `src/api/onePasswordApi.ts` → `src/integrations/onePassword/client.ts`

#### State
- `src/cache/cacheManager.ts` → `src/state/store.ts` *(or `src/state/cache.ts` if you keep “cache”)*
- `src/cache/cacheTypes.ts` → `src/state/types.ts`

#### VS Code adapters
- `src/providers/hoverProvider.ts` → `src/vscode/providers/hoverProvider.ts`
- `src/providers/codeActionProvider.ts` → `src/vscode/providers/codeActionProvider.ts`
- `src/commands/*` → `src/vscode/commands/*`
  - `src/commands/index.ts` → `src/vscode/commands/registry.ts` *(see registry section below)*

#### Controllers / renderers / config / editor helpers
- `src/providers/decorationProvider.ts` → `src/vscode/controllers/decorationController.ts`
- `src/ui/decorationManager.ts` → `src/vscode/renderers/decorationRenderer.ts`
- `src/ui/settingsManager.ts` → `src/vscode/config/settings.ts`
- `src/ui/formatting.ts` → `src/vscode/renderers/formatting.ts` *(or `src/vscode/presentation/formatting.ts`)*
- `src/lib/slackUrl.ts` → `src/vscode/editor/slackUrlOccurrence.ts`
- `src/lib/vscodeRanges.ts` → `src/vscode/editor/ranges.ts`

#### Types
Two valid routes:
1) Keep `src/types/*` as-is (lowest churn)
2) Move types nearer ownership:
   - Slack types near Slack integration
   - Linear types near Linear integration
   - Settings types near config

**Open decision:** Keep a central `types/` (familiar in TS) or colocate types (familiar in Rails engines)?

### 7.2 Symbol renames (after moves)

After the file moves land and imports compile:

- `class DecorationProvider` → `class DecorationController`
- `class DecorationManager` → `class DecorationRenderer`
- `class SettingsManager` → `class Settings` [ Note: This might conflict with a VS Code global object? Not sure]
- `class SlackUrlMatch` → `class SlackUrlOccurrence`

Then update all imports and call sites.

---

## 8) “Hub Files” for Discoverability (Ruby-ish)

To avoid “search for uses”, create intentional entrypoints:

### 8.1 Commands registry (routes.rb equivalent)

Today commands are registered via `src/commands/index.ts`.

Proposed:
- `src/vscode/commands/registry.ts` exports a single `registerCommands(context, deps)` that registers:
  - `"slackoscope.toggleInlineMessage"`
  - `"slackoscope.insertCommentedMessage"`
  - `"slackoscope.clearCache"`
  - `"slackoscope.postToLinear"`

Optional enhancement (open decision):
- Use a `const COMMANDS = {...} as const` map so adding a command becomes:
  1) implement the handler in `src/vscode/commands/*`
  2) add one line to the registry map

Pros:
- One file to see the whole surface area.

Cons:
- Overuse of indirection can feel “magic” in TS if taken too far.

### 8.2 Providers registry

Instead of registering providers ad-hoc in `extension.ts`, consider:
- `src/vscode/providers/registry.ts`

Exports something like:
- `registerProviders(disposer, {hoverProvider, codeActionProvider})`

This can keep `extension.ts` very small and “composition root only.”

### 8.3 Integrations registry

Optional but powerful:
- `src/integrations/registry.ts`

Exports factory functions and token resolution rules, e.g.:
- Slack client factory
- Linear client factory
- token resolution hook (1Password)

**Open decision:** Keep `apiFactory` in `extension.ts` (simple), or move to `integrations/registry.ts` (discoverable).

---

## 9) Boundaries & Import Rules (Prevent Regression)

Once folders exist, make it hard to violate boundaries:

### Option: ESLint import boundaries
Use `eslint-plugin-import` or `eslint-plugin-boundaries` to enforce:
- `src/vscode/**` may import from `vscode` module
- `src/integrations/**` should not import from `vscode`
- `src/state/**` should not import from `vscode` or integrations (ideally)

Pros:
- Keeps the tree clean.

Cons:
- Adds lint config complexity.

**Open decision:** Add boundary linting now or later?

### Option: Path aliases
Add TS path aliases (e.g. `@vscode/*`, `@integrations/*`) to reduce `../../..` imports.

Pros:
- Much more readable imports.

Cons:
- Requires configuring esbuild to understand TS paths (or using relative imports).

**Open decision:** Path aliases now (more setup) or later (keep relative)?

---

## 10) Step-by-Step Implementation Sequence (Minimize Pain)

This is the recommended incremental order to keep diffs reviewable and avoid giant broken states.

### Phase 0 — Preparation
1. Confirm current branch is green:
   - `npm run check-types`
   - `npm run lint`
   - `npm run compile-tests`
2. (Optional) Add/refresh docs links:
   - `docs/for-ruby-devs.md` should point to new paths after reorg.

### Phase 1 — Introduce new folders and move files (mechanical)
1. Create the new directory structure under `src/`.
2. Move a small vertical slice first (low risk):
   - `lib/` → `vscode/editor/`
   - update imports accordingly
3. Move `ui/` → `vscode/config` + `vscode/renderers`
4. Move providers/commands into `vscode/`
5. Move integrations (`api/`) into `integrations/`
6. Move `cache/` into `state/`

After each step:
- run `npm run check-types` + `npm run lint`

### Phase 2 — Rename symbols (semantic)
Rename classes after file paths are stable:
- `DecorationProvider` → `DecorationController`
- `DecorationManager` → `DecorationRenderer`
- `SettingsManager` → `Settings`
- `SlackUrlMatch` → `SlackUrlOccurrence`

Again:
- run `npm run check-types` + `npm run lint`

### Phase 3 — Add “hub files” (registry)
1. `src/vscode/commands/registry.ts`
2. (Optional) `src/vscode/providers/registry.ts`
3. (Optional) `src/integrations/registry.ts`

### Phase 4 — Tighten boundaries
Pick one:
- Add import boundary linting
- Add TS path aliases (+ esbuild support)
- Or do nothing now, but document the conventions

### Phase 5 — Documentation pass
Update:
- `docs/for-ruby-devs.md`
- `README.md` if it references old paths (optional)

---

## 11) Open Questions / Decisions to Make (Explicit List)

1. Folder naming:
   - `state/` vs `store/` vs keep `cache/`
2. Keep `src/extension.ts` at root (recommended) vs move to `src/vscode/extension.ts`
   - If moved: update `esbuild.js` entryPoints
3. Type placement:
   - Keep `src/types/` vs colocate under integrations/config
4. Registry “magic” level:
   - Simple explicit registration vs mapped registry object vs auto-discovery
5. Import style:
   - Relative imports everywhere vs path aliases
6. Boundary enforcement:
   - Add lint rules now vs later
7. Naming of “logic layer”:
   - Keep `linearMetadata.ts` / `slackData.ts` naming vs rename to “Lookup/Resolver”

---

## 12) Acceptance Criteria (What “Done” Looks Like)

1. A new contributor can find:
   - VS Code entrypoints (providers/commands/controllers) without searching
   - integrations without searching
   - state/store without searching
2. No ambiguous role naming:
   - “Provider” only means VS Code provider
   - “Controller” only means orchestrator
   - “Renderer” only means presentation output
3. `npm run check-types` and `npm run lint` pass
4. `npm run compile-tests` passes
5. No behavior regressions intended (manual spot-check recommended):
   - hover still works
   - code actions still show
   - decorations still apply

---

## 13) Suggested “Small PR” Breakdown (If Doing This Incrementally)

1. Move `lib/` → `vscode/editor/` (no renames)
2. Move `ui/` → `vscode/config` + `vscode/renderers`
3. Move providers/commands into `vscode/`
4. Move integrations `api/` → `integrations/`
5. Move `cache/` → `state/`
6. Rename symbols (Controller/Renderer/Settings/Occurrence)
7. Add registries (commands/providers/integrations)
8. Add boundary rules / path aliases (optional)
9. Docs update pass

Each step should be individually shippable with green typecheck/lint.

