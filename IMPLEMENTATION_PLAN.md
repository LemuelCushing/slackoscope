# Slackoscope Extension Plan - Complete Implementation Guide

**Created**: 2025-11-17
**Status**: Ready for Implementation
**Estimated Effort**: 15-20 agent-hours

---

## Table of Contents

1. [Overview & Strategy](#00-overview--strategy)
2. [Architecture Refactoring](#01-architecture-refactoring)
3. [Feature 1: Inline Message Preview](#10-feature-inline-message-preview)
4. [Feature 2: Thread Reply Support](#20-feature-thread-reply-support)
5. [Feature 3: Channel Name in Hover](#30-feature-channel-name-in-hover)
6. [Feature 4: Channel Name Display](#40-feature-channel-name-display)
7. [Feature 5: Relative Time Display](#50-feature-relative-time-display)
8. [Feature 6: User Name Display](#60-feature-user-name-display)
9. [Feature 7: Linear Integration](#70-feature-linear-integration)
10. [Feature 8: File Attachments](#80-feature-file-attachments)
11. [Feature 9: Message Age Highlighting](#90-feature-message-age-highlighting)
12. [Feature 10: Inline Styling Customization](#100-feature-inline-styling-customization)
13. [Feature 11: 1Password Integration](#110-feature-1password-integration)
14. [Feature 12: Code Actions](#120-feature-code-actions)
15. [Testing Strategy](#testing-strategy)
16. [Migration & Rollout](#migration--rollout)

---

## 00: Overview & Strategy

### Project Goals

Transform Slackoscope from a simple message preview extension into a comprehensive collaboration hub that:
- Provides rich, contextual Slack message information inline
- Integrates with Linear for seamless issue tracking
- Offers extensive customization for individual workflows
- Maintains performance with intelligent caching
- Preserves the lightweight, fast nature of the extension

### Current State Assessment

**Strengths**:
- Clean, minimal codebase (~170 lines total)
- Good TypeScript foundation with strict mode
- Working hover provider and basic caching
- Solid test infrastructure
- Fast build with esbuild

**Limitations**:
- Monolithic structure (all logic in extension.ts)
- Simple in-memory cache (Map) lacks eviction strategy
- No data models for Slack entities
- Single decoration type management
- Configuration is minimal (just token)

### Implementation Strategy

**Phase 1: Foundation (Tickets 1-4)**
- Refactor architecture for extensibility
- Introduce proper data models
- Enhance caching infrastructure
- Implement inline preview system

**Phase 2: Data Enrichment (Tickets 5-8)**
- Thread support
- Channel metadata
- User information
- File attachments

**Phase 3: Integration (Tickets 9-10)**
- Linear API integration
- 1Password secure token management

**Phase 4: Customization (Tickets 11-14)**
- Display customization settings
- Message age highlighting
- Code actions

### Key Technical Decisions

**Decision 1: Modular Architecture**
- Split into logical modules: `types/`, `api/`, `providers/`, `cache/`, `ui/`
- Each module has single responsibility
- Easier testing, maintenance, and future extension

**Decision 2: Rich Data Models**
- Introduce TypeScript interfaces for: `SlackMessage`, `SlackUser`, `SlackChannel`, `LinearIssue`
- Centralize type definitions in `src/types/`
- Enable type-safe API interactions

**Decision 3: Multi-tier Caching**
- Message cache (current): Keep session-based approach
- Add user cache: User info rarely changes, cache longer
- Add channel cache: Channel metadata is stable
- All caches clear on extension reload (keep simple)

**Decision 4: Decoration Strategy**
- Create decoration manager to handle multiple decoration types
- Support simultaneous decorations (inline preview, age highlighting)
- Clean disposal on toggle/reload

**Decision 5: Settings Organization**
```typescript
slackoscope.token                    // Existing
slackoscope.linearToken              // New
slackoscope.inline.enabled           // New - nested structure
slackoscope.inline.position          // New
slackoscope.inline.showTime          // New
slackoscope.inline.useRelativeTime   // New
slackoscope.inline.fontSize          // New
slackoscope.inline.color             // New
slackoscope.inline.fontStyle         // New
slackoscope.hover.showChannel        // New
slackoscope.hover.showFiles          // New
slackoscope.highlighting.enabled     // New
slackoscope.highlighting.todayColor  // New
slackoscope.highlighting.oldDays     // New
slackoscope.highlighting.oldColor    // New
```

### Milestone Plan

**M1: Core Infrastructure (Week 1)**
- Complete architecture refactoring
- Implement inline preview with basic settings
- Thread support foundation

**M2: Rich Context (Week 2)**
- Channel and user name display
- File attachments in hover
- Relative time formatting

**M3: Integrations (Week 3)**
- Linear integration complete
- 1Password token management
- Code actions

**M4: Polish & Customization (Week 4)**
- All customization settings
- Message age highlighting
- Comprehensive testing
- Documentation updates

### Success Metrics

- All 12 features implemented and tested
- Extension bundle size < 100KB (currently ~20KB)
- Hover response time < 200ms (with cache)
- Zero breaking changes to existing functionality
- Test coverage > 80%

---

## 01: Architecture Refactoring

### Motivation

Current codebase has all logic in `extension.ts` (~120 lines). Adding 12 features without refactoring will create unmaintainable code. Need modular structure to support:
- Multiple decoration types
- Multiple API integrations (Slack, Linear)
- Complex caching strategy
- Rich settings management
- Testable components

### New Directory Structure

```
src/
├── extension.ts                 # Entry point - activation/deactivation only
├── types/
│   ├── slack.ts                 # Slack entity interfaces
│   ├── linear.ts                # Linear entity interfaces
│   └── settings.ts              # Configuration interfaces
├── api/
│   ├── slackApi.ts              # Slack API client (refactored)
│   ├── linearApi.ts             # Linear API client
│   └── onePasswordApi.ts        # 1Password integration
├── cache/
│   ├── cacheManager.ts          # Multi-cache orchestration
│   └── cacheTypes.ts            # Cache configuration types
├── providers/
│   ├── hoverProvider.ts         # Hover tooltip logic
│   ├── decorationProvider.ts   # Inline decoration logic
│   └── codeActionProvider.ts   # Code action logic
├── ui/
│   ├── decorationManager.ts    # Decoration type management
│   ├── formatting.ts            # Text formatting utilities
│   └── settingsManager.ts      # Configuration reader
├── commands/
│   ├── toggleInline.ts         # Toggle inline command
│   ├── insertComment.ts        # Insert comment command
│   ├── postToLinear.ts         # Post to Linear command
│   └── clearCache.ts           # Cache management
└── test/
    ├── unit/                    # Unit tests per module
    └── e2e/                     # End-to-end tests
```

### Implementation Tickets

#### Ticket 1.1: Create Type Definitions

**File**: `src/types/slack.ts`

```typescript
export interface SlackMessage {
  text: string
  user: string                    // User ID
  ts: string                      // Timestamp (Slack format)
  threadTs?: string               // Thread parent timestamp
  replyCount?: number
  files?: SlackFile[]
  channel: string                 // Channel ID
}

export interface SlackUser {
  id: string
  name: string
  realName: string
  displayName: string
  avatarUrl?: string
}

export interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
}

export interface SlackFile {
  id: string
  name: string
  mimetype: string
  url: string
  thumb?: string                  // Thumbnail URL for images
  size: number
}

export interface SlackThread {
  parentTs: string
  replies: SlackMessage[]
  replyCount: number
}

export interface ParsedSlackUrl {
  fullUrl: string
  channelId: string
  messageTs: string
  threadTs?: string
}
```

**File**: `src/types/linear.ts`

```typescript
export interface LinearIssue {
  id: string
  identifier: string              // e.g., "ENG-123"
  title: string
  url: string
  state: {
    name: string
    type: string                  // "started", "completed", etc.
  }
}

export interface LinearComment {
  id: string
  body: string
  createdAt: string
}
```

**File**: `src/types/settings.ts`

```typescript
export interface SlackoscopeSettings {
  slackToken: string
  linearToken?: string
  inline: InlineSettings
  hover: HoverSettings
  highlighting: HighlightingSettings
}

export interface InlineSettings {
  enabled: boolean
  position: 'right' | 'above' | 'below'
  showTime: boolean
  useRelativeTime: boolean
  fontSize: number
  color: string
  fontStyle: 'normal' | 'italic'
}

export interface HoverSettings {
  showChannel: boolean
  showFiles: boolean
}

export interface HighlightingSettings {
  enabled: boolean
  todayColor: string
  oldDays: number
  oldColor: string
}
```

**Tests**: Basic type validation tests (ensure interfaces compile)

**Completion Criteria**: All types defined, exported, and compile without errors

---

#### Ticket 1.2: Refactor Slack API

**File**: `src/api/slackApi.ts` (refactor existing)

**Changes**:
1. Return rich `SlackMessage` objects instead of strings
2. Add methods for user/channel fetching
3. Improve error handling with typed errors
4. Add thread support

```typescript
import type {SlackMessage, SlackUser, SlackChannel, ParsedSlackUrl} from '../types/slack'

export const SLACK_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?thread_ts=(\d+\.\d+))?/

export class SlackApi {
  private token: string

  constructor(token: string) {
    if (!token) throw new Error('Slack token is required')
    this.token = token
  }

  parseSlackUrl(url: string): ParsedSlackUrl | null {
    const match = SLACK_URL_REGEX.exec(url)
    if (!match) return null

    const [fullUrl, channelId, rawTs, threadTs] = match
    const messageTs = `${rawTs.slice(0, -6)}.${rawTs.slice(-6)}`

    return {
      fullUrl,
      channelId,
      messageTs,
      threadTs
    }
  }

  async getMessage(channelId: string, ts: string): Promise<SlackMessage> {
    const url = 'https://slack.com/api/conversations.history'
    const body = new URLSearchParams({
      channel: channelId,
      latest: ts,
      inclusive: 'true',
      limit: '1'
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${this.token}`
      },
      body: body.toString()
    })

    const data = await response.json()
    if (!data.ok) throw new Error(data.error || 'Failed to fetch message')
    if (!data.messages?.[0]) throw new Error('Message not found')

    return data.messages[0] as SlackMessage
  }

  async getThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
    const url = 'https://slack.com/api/conversations.replies'
    const params = new URLSearchParams({
      channel: channelId,
      ts: threadTs
    })

    const response = await fetch(`${url}?${params}`, {
      headers: {Authorization: `Bearer ${this.token}`}
    })

    const data = await response.json()
    if (!data.ok) throw new Error(data.error || 'Failed to fetch thread')

    return data.messages || []
  }

  async getUser(userId: string): Promise<SlackUser> {
    const url = `https://slack.com/api/users.info?user=${userId}`
    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${this.token}`}
    })

    const data = await response.json()
    if (!data.ok) throw new Error(data.error || 'Failed to fetch user')

    const user = data.user
    return {
      id: user.id,
      name: user.name,
      realName: user.real_name,
      displayName: user.profile?.display_name || user.real_name,
      avatarUrl: user.profile?.image_72
    }
  }

  async getChannel(channelId: string): Promise<SlackChannel> {
    const url = `https://slack.com/api/conversations.info?channel=${channelId}`
    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${this.token}`}
    })

    const data = await response.json()
    if (!data.ok) throw new Error(data.error || 'Failed to fetch channel')

    const channel = data.channel
    return {
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private || false
    }
  }
}
```

**Breaking Changes**:
- `getMessageContent()` method removed
- Now returns rich objects, not strings
- Callers must be updated

**Tests**:
- Unit tests for URL parsing (multiple formats)
- Mock fetch for API method tests
- Error handling tests

**Completion Criteria**: All methods return typed objects, existing tests updated and passing

---

#### Ticket 1.3: Create Cache Manager

**File**: `src/cache/cacheTypes.ts`

```typescript
export interface CacheConfig<T> {
  name: string
  maxSize?: number                // Optional eviction (for future)
}

export interface Cache<T> {
  get(key: string): T | undefined
  set(key: string, value: T): void
  has(key: string): boolean
  clear(): void
  size: number
}
```

**File**: `src/cache/cacheManager.ts`

```typescript
import type {SlackMessage, SlackUser, SlackChannel} from '../types/slack'
import type {Cache} from './cacheTypes'

class SimpleCache<T> implements Cache<T> {
  private map = new Map<string, T>()

  get(key: string): T | undefined {
    return this.map.get(key)
  }

  set(key: string, value: T): void {
    this.map.set(key, value)
  }

  has(key: string): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

export class CacheManager {
  private messageCache = new SimpleCache<SlackMessage>()
  private userCache = new SimpleCache<SlackUser>()
  private channelCache = new SimpleCache<SlackChannel>()

  // Message cache
  getMessage(key: string): SlackMessage | undefined {
    return this.messageCache.get(key)
  }

  setMessage(key: string, message: SlackMessage): void {
    this.messageCache.set(key, message)
  }

  // User cache
  getUser(userId: string): SlackUser | undefined {
    return this.userCache.get(userId)
  }

  setUser(userId: string, user: SlackUser): void {
    this.userCache.set(userId, user)
  }

  // Channel cache
  getChannel(channelId: string): SlackChannel | undefined {
    return this.channelCache.get(channelId)
  }

  setChannel(channelId: string, channel: SlackChannel): void {
    this.channelCache.set(channelId, channel)
  }

  // Global operations
  clearAll(): void {
    this.messageCache.clear()
    this.userCache.clear()
    this.channelCache.clear()
  }

  getStats(): {messages: number; users: number; channels: number} {
    return {
      messages: this.messageCache.size,
      users: this.userCache.size,
      channels: this.channelCache.size
    }
  }
}
```

**Tests**:
- Cache get/set/has operations
- Cache clearing
- Stats tracking

**Completion Criteria**: Cache manager working, all tests passing

---

#### Ticket 1.4: Create Settings Manager

**File**: `src/ui/settingsManager.ts`

```typescript
import * as vscode from 'vscode'
import type {SlackoscopeSettings, InlineSettings, HoverSettings, HighlightingSettings} from '../types/settings'

export class SettingsManager {
  private config: vscode.WorkspaceConfiguration

  constructor() {
    this.config = vscode.workspace.getConfiguration('slackoscope')
  }

  refresh(): void {
    this.config = vscode.workspace.getConfiguration('slackoscope')
  }

  get slackToken(): string {
    return this.config.get<string>('token') || ''
  }

  get linearToken(): string | undefined {
    return this.config.get<string>('linearToken')
  }

  get inline(): InlineSettings {
    return {
      enabled: this.config.get('inline.enabled', true),
      position: this.config.get('inline.position', 'right'),
      showTime: this.config.get('inline.showTime', true),
      useRelativeTime: this.config.get('inline.useRelativeTime', false),
      fontSize: this.config.get('inline.fontSize', 12),
      color: this.config.get('inline.color', 'rgba(128, 128, 128, 0.6)'),
      fontStyle: this.config.get('inline.fontStyle', 'italic')
    }
  }

  get hover(): HoverSettings {
    return {
      showChannel: this.config.get('hover.showChannel', true),
      showFiles: this.config.get('hover.showFiles', true)
    }
  }

  get highlighting(): HighlightingSettings {
    return {
      enabled: this.config.get('highlighting.enabled', false),
      todayColor: this.config.get('highlighting.todayColor', 'rgba(100, 200, 100, 0.1)'),
      oldDays: this.config.get('highlighting.oldDays', 7),
      oldColor: this.config.get('highlighting.oldColor', 'rgba(200, 100, 100, 0.1)')
    }
  }

  onDidChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('slackoscope')) {
        this.refresh()
        callback()
      }
    })
  }
}
```

**File**: `package.json` (add all settings)

```json
{
  "configuration": {
    "title": "Slackoscope",
    "properties": {
      "slackoscope.token": {
        "type": "string",
        "default": "",
        "description": "Slack API token"
      },
      "slackoscope.linearToken": {
        "type": "string",
        "default": "",
        "description": "Linear API token (optional)"
      },
      "slackoscope.inline.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Show inline message preview next to Slack URLs"
      },
      "slackoscope.inline.position": {
        "type": "string",
        "enum": ["right", "above", "below"],
        "default": "right",
        "description": "Where to display inline preview"
      },
      "slackoscope.inline.showTime": {
        "type": "boolean",
        "default": true,
        "description": "Show timestamp in inline preview"
      },
      "slackoscope.inline.useRelativeTime": {
        "type": "boolean",
        "default": false,
        "description": "Show relative time (e.g., '5 minutes ago') instead of absolute time"
      },
      "slackoscope.inline.fontSize": {
        "type": "number",
        "default": 12,
        "description": "Font size for inline preview (in pixels)"
      },
      "slackoscope.inline.color": {
        "type": "string",
        "default": "rgba(128, 128, 128, 0.6)",
        "description": "Color for inline preview text (CSS color)"
      },
      "slackoscope.inline.fontStyle": {
        "type": "string",
        "enum": ["normal", "italic"],
        "default": "italic",
        "description": "Font style for inline preview"
      },
      "slackoscope.hover.showChannel": {
        "type": "boolean",
        "default": true,
        "description": "Show channel name in hover tooltip"
      },
      "slackoscope.hover.showFiles": {
        "type": "boolean",
        "default": true,
        "description": "Show attached files in hover tooltip"
      },
      "slackoscope.highlighting.enabled": {
        "type": "boolean",
        "default": false,
        "description": "Highlight Slack URLs by message age"
      },
      "slackoscope.highlighting.todayColor": {
        "type": "string",
        "default": "rgba(100, 200, 100, 0.1)",
        "description": "Background color for messages from today"
      },
      "slackoscope.highlighting.oldDays": {
        "type": "number",
        "default": 7,
        "description": "Number of days before a message is considered old"
      },
      "slackoscope.highlighting.oldColor": {
        "type": "string",
        "default": "rgba(200, 100, 100, 0.1)",
        "description": "Background color for old messages"
      }
    }
  }
}
```

**Tests**:
- Settings reading
- Default values
- Change detection

**Completion Criteria**: All settings defined, manager working, tests passing

---

#### Ticket 1.5: Refactor Extension Entry Point

**File**: `src/extension.ts` (complete refactor)

**Goal**: Reduce to ~50 lines - just activation orchestration

```typescript
import * as vscode from 'vscode'
import {SlackApi} from './api/slackApi'
import {CacheManager} from './cache/cacheManager'
import {SettingsManager} from './ui/settingsManager'
import {HoverProvider} from './providers/hoverProvider'
import {DecorationProvider} from './providers/decorationProvider'
import {CodeActionProvider} from './providers/codeActionProvider'
import {registerCommands} from './commands'

let slackApi: SlackApi
let cacheManager: CacheManager
let settingsManager: SettingsManager

export async function activate(context: vscode.ExtensionContext) {
  console.log('Slackoscope is activating...')

  // Initialize managers
  settingsManager = new SettingsManager()
  cacheManager = new CacheManager()

  // Initialize Slack API
  try {
    slackApi = new SlackApi(settingsManager.slackToken)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
    }
    return
  }

  // Register providers
  const hoverProvider = new HoverProvider(slackApi, cacheManager, settingsManager)
  const decorationProvider = new DecorationProvider(slackApi, cacheManager, settingsManager)
  const codeActionProvider = new CodeActionProvider(slackApi, cacheManager)

  context.subscriptions.push(
    vscode.languages.registerHoverProvider('*', hoverProvider),
    vscode.languages.registerCodeActionsProvider('*', codeActionProvider, {
      providedCodeActionKinds: [vscode.CodeActionKind.RefactorInline]
    })
  )

  // Register commands
  registerCommands(context, {slackApi, cacheManager, settingsManager, decorationProvider})

  // Watch for settings changes
  context.subscriptions.push(
    settingsManager.onDidChange(() => {
      // Recreate Slack API with new token
      try {
        slackApi = new SlackApi(settingsManager.slackToken)
        hoverProvider.updateApi(slackApi)
        decorationProvider.updateApi(slackApi)
        codeActionProvider.updateApi(slackApi)
      } catch (error) {
        console.error('Failed to update Slack API:', error)
      }
    })
  )

  console.log('Slackoscope activated successfully')
}

export function deactivate() {
  cacheManager?.clearAll()
}
```

**File**: `src/commands/index.ts` (new)

```typescript
import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {CacheManager} from '../cache/cacheManager'
import type {SettingsManager} from '../ui/settingsManager'
import type {DecorationProvider} from '../providers/decorationProvider'
import {toggleInlineCommand} from './toggleInline'
import {insertCommentCommand} from './insertComment'
import {clearCacheCommand} from './clearCache'

interface CommandContext {
  slackApi: SlackApi
  cacheManager: CacheManager
  settingsManager: SettingsManager
  decorationProvider: DecorationProvider
}

export function registerCommands(context: vscode.ExtensionContext, ctx: CommandContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('slackoscope.toggleInlineMessage', () =>
      toggleInlineCommand(ctx.decorationProvider)
    ),
    vscode.commands.registerCommand('slackoscope.insertCommentedMessage', args =>
      insertCommentCommand(ctx.slackApi, ctx.cacheManager, args)
    ),
    vscode.commands.registerCommand('slackoscope.clearCache', () => clearCacheCommand(ctx.cacheManager))
  )
}
```

**Breaking Changes**:
- Complete restructure
- All existing functionality moved to providers/commands

**Migration Path**:
1. Create all new files first
2. Move logic from extension.ts to new modules
3. Update extension.ts to use new modules
4. Test thoroughly

**Tests**:
- Extension activation
- Command registration
- Settings change handling

**Completion Criteria**: Extension activates, all existing functionality works via new architecture

---

## 10: Feature - Inline Message Preview

### Overview

Display ephemeral first line of Slack message + timestamp next to (or above/below) the URL as an inline decoration. Should be compact, non-intrusive, and fully customizable.

**Priority**: 1 (Highest)
**User Value**: Immediate context without hover
**Complexity**: Medium

### User Experience

**Visual Design**:
```
// Right position (default):
https://slack.com/archives/C123/p456  "Initial message text..." • 2:30 PM

// Above position:
                                       "Initial message text..." • 2:30 PM
https://slack.com/archives/C123/p456

// Below position:
https://slack.com/archives/C123/p456
                                       "Initial message text..." • 2:30 PM
```

**Behavior**:
- Automatically shows when `slackoscope.inline.enabled` is `true`
- Updates on document change (new URLs detected)
- Refreshes when settings change
- Toggleable via command palette
- Max 50 characters for message preview (truncate with "...")
- Gray, slightly transparent by default (customizable)

### Technical Approach

**Decoration Types**:
- Create dynamic decoration type based on settings
- Recreate when position/style settings change
- Use `before` property for "above", `after` for "right"/"below"

**Message Fetching**:
- Scan document for all Slack URLs on activation/change
- Fetch messages concurrently (Promise.all)
- Cache aggressively to avoid repeated API calls
- Handle errors gracefully (show "Error loading message" inline)

**Performance Considerations**:
- Debounce document changes (500ms)
- Limit to visible editors only
- Maximum 100 decorations per document
- Cancel in-flight requests when document changes

### Implementation Tickets

#### Ticket 10.1: Create Formatting Utilities

**File**: `src/ui/formatting.ts`

```typescript
export function formatMessagePreview(text: string, maxLength = 50): string {
  // Remove formatting characters, newlines
  const cleaned = text.replace(/[*_~`]/g, '').replace(/\n/g, ' ').trim()

  if (cleaned.length <= maxLength) return `"${cleaned}"`

  return `"${cleaned.slice(0, maxLength - 3)}..."`
}

export function formatTimestamp(ts: string, useRelative = false): string {
  const timestamp = parseFloat(ts) * 1000
  const date = new Date(timestamp)

  if (useRelative) {
    return formatRelativeTime(date)
  }

  // Format as "2:30 PM" or "Dec 15, 2:30 PM" if not today
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
}

export function getMessageAge(ts: string): 'today' | 'recent' | 'old' {
  const timestamp = parseFloat(ts) * 1000
  const date = new Date(timestamp)
  const now = new Date()

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return 'today'

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  return diffDays < 7 ? 'recent' : 'old'
}
```

**Tests**:
- Message truncation at various lengths
- Timestamp formatting (today, past, future)
- Relative time formatting
- Message age calculation

**Completion Criteria**: All formatting functions tested and working

---

#### Ticket 10.2: Create Decoration Manager

**File**: `src/ui/decorationManager.ts`

```typescript
import * as vscode from 'vscode'
import type {InlineSettings, HighlightingSettings} from '../types/settings'

export interface DecorationData {
  range: vscode.Range
  text: string
}

export class DecorationManager {
  private inlineDecorationType: vscode.TextEditorDecorationType | null = null
  private highlightDecorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map()

  createInlineDecorationType(settings: InlineSettings): vscode.TextEditorDecorationType {
    // Dispose existing
    this.inlineDecorationType?.dispose()

    const baseStyle: vscode.DecorationRenderOptions = {
      color: settings.color,
      fontStyle: settings.fontStyle,
      fontSize: `${settings.fontSize}px`
    }

    let renderOptions: vscode.DecorationRenderOptions
    if (settings.position === 'above') {
      renderOptions = {
        before: {
          ...baseStyle,
          contentText: ''              // Will be set per-decoration
        },
        isWholeLine: false
      }
    } else if (settings.position === 'below') {
      renderOptions = {
        after: {
          ...baseStyle,
          contentText: '',
          margin: '0 0 0 0'
        },
        isWholeLine: true
      }
    } else {
      // Default: right
      renderOptions = {
        after: {
          ...baseStyle,
          contentText: '',
          margin: '0 0 0 1em'
        }
      }
    }

    this.inlineDecorationType = vscode.window.createTextEditorDecorationType(renderOptions)
    return this.inlineDecorationType
  }

  applyInlineDecorations(
    editor: vscode.TextEditor,
    decorations: DecorationData[],
    settings: InlineSettings
  ): void {
    if (!this.inlineDecorationType) {
      this.createInlineDecorationType(settings)
    }

    const decorationOptions = decorations.map(({range, text}) => {
      const renderOptions: vscode.DecorationInstanceRenderOptions =
        settings.position === 'above'
          ? {before: {contentText: text}}
          : {after: {contentText: text}}

      return {range, renderOptions}
    })

    editor.setDecorations(this.inlineDecorationType!, decorationOptions)
  }

  clearInlineDecorations(editor: vscode.TextEditor): void {
    if (this.inlineDecorationType) {
      editor.setDecorations(this.inlineDecorationType, [])
    }
  }

  createHighlightDecorationType(color: string): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      backgroundColor: color,
      isWholeLine: false
    })
  }

  applyHighlightDecorations(
    editor: vscode.TextEditor,
    decorations: Map<string, DecorationData[]>,
    settings: HighlightingSettings
  ): void {
    if (!settings.enabled) return

    // Clear existing highlight decorations
    this.highlightDecorationTypes.forEach(type => type.dispose())
    this.highlightDecorationTypes.clear()

    // Create decoration types for each category
    const todayType = this.createHighlightDecorationType(settings.todayColor)
    const oldType = this.createHighlightDecorationType(settings.oldColor)

    this.highlightDecorationTypes.set('today', todayType)
    this.highlightDecorationTypes.set('old', oldType)

    // Apply decorations
    const todayDecorations = decorations.get('today') || []
    const oldDecorations = decorations.get('old') || []

    editor.setDecorations(todayType, todayDecorations.map(d => d.range))
    editor.setDecorations(oldType, oldDecorations.map(d => d.range))
  }

  dispose(): void {
    this.inlineDecorationType?.dispose()
    this.highlightDecorationTypes.forEach(type => type.dispose())
  }
}
```

**Tests**:
- Decoration type creation with various settings
- Decoration application/clearing
- Multiple decoration types simultaneously
- Disposal

**Completion Criteria**: Decoration manager working, supports all position/style options

---

#### Ticket 10.3: Create Decoration Provider

**File**: `src/providers/decorationProvider.ts`

```typescript
import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {CacheManager} from '../cache/cacheManager'
import type {SettingsManager} from '../ui/settingsManager'
import {DecorationManager, type DecorationData} from '../ui/decorationManager'
import {formatMessagePreview, formatTimestamp, getMessageAge} from '../ui/formatting'

export class DecorationProvider {
  private decorationManager = new DecorationManager()
  private isEnabled = true
  private updateTimeout: NodeJS.Timeout | null = null

  constructor(
    private slackApi: SlackApi,
    private cacheManager: CacheManager,
    private settingsManager: SettingsManager
  ) {
    // Initial update for all visible editors
    vscode.window.visibleTextEditors.forEach(editor => {
      this.updateDecorations(editor)
    })

    // Watch for document/editor changes
    vscode.workspace.onDidChangeTextDocument(e => {
      const editor = vscode.window.activeTextEditor
      if (editor && e.document === editor.document) {
        this.scheduleUpdate(editor)
      }
    })

    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        this.updateDecorations(editor)
      }
    })

    // Watch for settings changes
    settingsManager.onDidChange(() => {
      this.decorationManager.dispose()
      this.decorationManager = new DecorationManager()
      vscode.window.visibleTextEditors.forEach(editor => {
        this.updateDecorations(editor)
      })
    })
  }

  updateApi(api: SlackApi): void {
    this.slackApi = api
  }

  toggle(): void {
    this.isEnabled = !this.isEnabled

    if (this.isEnabled) {
      vscode.window.visibleTextEditors.forEach(editor => {
        this.updateDecorations(editor)
      })
    } else {
      vscode.window.visibleTextEditors.forEach(editor => {
        this.decorationManager.clearInlineDecorations(editor)
      })
    }
  }

  private scheduleUpdate(editor: vscode.TextEditor): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    this.updateTimeout = setTimeout(() => {
      this.updateDecorations(editor)
    }, 500)
  }

  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    if (!this.isEnabled || !this.settingsManager.inline.enabled) {
      this.decorationManager.clearInlineDecorations(editor)
      return
    }

    const document = editor.document
    const text = document.getText()
    const slackUrls = [...text.matchAll(this.slackApi.SLACK_URL_REGEX)]

    if (slackUrls.length === 0) {
      this.decorationManager.clearInlineDecorations(editor)
      return
    }

    // Fetch all messages concurrently
    const decorationPromises = slackUrls.map(async match => {
      try {
        const parsed = this.slackApi.parseSlackUrl(match[0])
        if (!parsed) return null

        const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
        let message = this.cacheManager.getMessage(cacheKey)

        if (!message) {
          message = await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
          this.cacheManager.setMessage(cacheKey, message)
        }

        const preview = formatMessagePreview(message.text)
        const timestamp = this.settingsManager.inline.showTime
          ? formatTimestamp(message.ts, this.settingsManager.inline.useRelativeTime)
          : ''

        const inlineText = timestamp ? `${preview} • ${timestamp}` : preview

        const startPos = document.positionAt(match.index!)
        const endPos = document.positionAt(match.index! + match[0].length)
        const range = new vscode.Range(startPos, endPos)

        return {range, text: inlineText}
      } catch (error) {
        console.error('Failed to fetch message for decoration:', error)
        return null
      }
    })

    const decorations = (await Promise.all(decorationPromises)).filter(
      (d): d is DecorationData => d !== null
    )

    this.decorationManager.applyInlineDecorations(editor, decorations, this.settingsManager.inline)
  }

  dispose(): void {
    this.decorationManager.dispose()
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }
  }
}
```

**Tests**:
- Document scanning for URLs
- Concurrent message fetching
- Decoration application
- Settings changes
- Toggle behavior
- Error handling

**Completion Criteria**: Inline decorations appear for all Slack URLs with correct formatting

---

#### Ticket 10.4: Create Toggle Command

**File**: `src/commands/toggleInline.ts`

```typescript
import * as vscode from 'vscode'
import type {DecorationProvider} from '../providers/decorationProvider'

export function toggleInlineCommand(decorationProvider: DecorationProvider): void {
  decorationProvider.toggle()
  vscode.window.showInformationMessage('Slackoscope: Inline messages toggled')
}
```

**File**: `package.json` (update command)

```json
{
  "contributes": {
    "commands": [
      {
        "command": "slackoscope.toggleInlineMessage",
        "title": "Slackoscope: Toggle Inline Messages"
      }
    ]
  }
}
```

**Tests**:
- Command execution
- Toggle state persistence during session

**Completion Criteria**: Command toggles inline decorations on/off

---

### Acceptance Criteria

- [ ] Inline preview appears next to Slack URLs
- [ ] Shows first ~50 chars of message + timestamp
- [ ] Supports "right", "above", "below" positions
- [ ] Respects all inline.* settings
- [ ] Updates on document changes (debounced)
- [ ] Toggleable via command
- [ ] No performance issues with 50+ URLs in document
- [ ] Error handling for failed fetches

---

## 20: Feature - Thread Reply Support

### Overview

Detect and handle thread URLs, show thread context in hover, allow fetching entire thread.

**Priority**: 2
**User Value**: Essential for following threaded conversations
**Complexity**: Medium

### User Experience

**Thread URL Format**:
```
https://slack.com/archives/C123/p456?thread_ts=789.000
```

**Hover Display**:
```
📧 #general - Thread (5 replies)

Original message:
"Let's discuss the API design..."

Latest reply by @alice (2m ago):
"I think we should use REST..."

[View Full Thread] [Insert as Comment]
```

**Inline Display**:
```
https://slack.com/...?thread_ts=...  "Original message..." • 🧵 5 replies
```

### Technical Approach

**URL Parsing**:
- Update `SLACK_URL_REGEX` to capture `thread_ts` parameter
- Parse as optional field in `ParsedSlackUrl`

**Thread Fetching**:
- Use `conversations.replies` API endpoint
- Fetch parent message + all replies
- Cache entire thread together (keyed by thread_ts)

**Hover Enhancement**:
- Detect thread URLs
- Show parent message + reply count
- Show latest reply preview
- Add "View Full Thread" command link

**Inline Enhancement**:
- Add thread icon (🧵) and reply count to inline preview
- Optionally show latest reply instead of parent message (setting?)

### Implementation Tickets

#### Ticket 20.1: Update URL Parsing for Threads

**File**: `src/api/slackApi.ts` (update regex)

```typescript
// Updated regex to capture thread_ts parameter
export const SLACK_URL_REGEX =
  /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)(?:\?thread_ts=(\d+\.\d+))?/
```

**Update**: `parseSlackUrl()` already handles thread_ts (capture group 3)

**Tests**:
- Parse thread URLs
- Parse non-thread URLs
- Validate thread_ts format

**Completion Criteria**: Thread URLs parsed correctly

---

#### Ticket 20.2: Implement Thread Fetching

**File**: `src/api/slackApi.ts` (add method)

```typescript
async getThread(channelId: string, threadTs: string): Promise<{parent: SlackMessage; replies: SlackMessage[]}> {
  const messages = await this.getThreadReplies(channelId, threadTs)

  if (messages.length === 0) {
    throw new Error('Thread not found')
  }

  const parent = messages[0]
  const replies = messages.slice(1)

  return {parent, replies}
}
```

**File**: `src/cache/cacheManager.ts` (add thread cache)

```typescript
private threadCache = new SimpleCache<{parent: SlackMessage; replies: SlackMessage[]}>()

getThread(threadTs: string): {parent: SlackMessage; replies: SlackMessage[]} | undefined {
  return this.threadCache.get(threadTs)
}

setThread(threadTs: string, thread: {parent: SlackMessage; replies: SlackMessage[]}): void {
  this.threadCache.set(threadTs, thread)
}
```

**Tests**:
- Fetch thread with replies
- Fetch parent-only (no replies)
- Cache thread data
- Error handling

**Completion Criteria**: Thread fetching works, cached correctly

---

#### Ticket 20.3: Update Hover Provider for Threads

**File**: `src/providers/hoverProvider.ts` (update)

```typescript
async provideHover(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover | null> {
  const parsed = this.findSlackUrlAtPosition(document, position)
  if (!parsed) return null

  try {
    let markdown = new vscode.MarkdownString()
    markdown.isTrusted = true

    // If thread URL, fetch thread
    if (parsed.threadTs) {
      const cacheKey = parsed.threadTs
      let thread = this.cacheManager.getThread(cacheKey)

      if (!thread) {
        thread = await this.slackApi.getThread(parsed.channelId, parsed.threadTs)
        this.cacheManager.setThread(cacheKey, thread)
      }

      const {parent, replies} = thread

      // Optionally fetch user/channel
      const user = await this.fetchUser(parent.user)
      const channel = await this.fetchChannel(parent.channel)

      // Format thread hover
      markdown.appendMarkdown(`🧵 **#${channel.name}** - Thread (${replies.length} ${replies.length === 1 ? 'reply' : 'replies'})\n\n`)
      markdown.appendMarkdown(`**Original** by **@${user.displayName}**:\n\n`)
      markdown.appendMarkdown(`> ${parent.text}\n\n`)

      if (replies.length > 0) {
        const latestReply = replies[replies.length - 1]
        const replyUser = await this.fetchUser(latestReply.user)
        const replyTime = formatRelativeTime(new Date(parseFloat(latestReply.ts) * 1000))

        markdown.appendMarkdown(`**Latest reply** by **@${replyUser.displayName}** (${replyTime}):\n\n`)
        markdown.appendMarkdown(`> ${latestReply.text}\n\n`)
      }

      markdown.appendMarkdown(`\n[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl, isThread: true}))})`)

      return new vscode.Hover(markdown)
    }

    // Otherwise, regular message hover
    // ... (existing logic)
  } catch (error) {
    console.error('Hover error:', error)
    return null
  }
}
```

**Tests**:
- Hover on thread URL shows parent + replies
- Hover on non-thread URL shows message
- Error handling

**Completion Criteria**: Thread hovers display correctly

---

#### Ticket 20.4: Update Inline Preview for Threads

**File**: `src/providers/decorationProvider.ts` (update)

```typescript
private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
  // ... existing code ...

  const decorationPromises = slackUrls.map(async match => {
    try {
      const parsed = this.slackApi.parseSlackUrl(match[0])
      if (!parsed) return null

      let message: SlackMessage
      let replyCount = 0

      // Check if thread URL
      if (parsed.threadTs) {
        const thread = this.cacheManager.getThread(parsed.threadTs)
        if (thread) {
          message = thread.parent
          replyCount = thread.replies.length
        } else {
          // Fetch thread
          const fetchedThread = await this.slackApi.getThread(parsed.channelId, parsed.threadTs)
          this.cacheManager.setThread(parsed.threadTs, fetchedThread)
          message = fetchedThread.parent
          replyCount = fetchedThread.replies.length
        }
      } else {
        // Regular message
        const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
        message = this.cacheManager.getMessage(cacheKey) ||
                  await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
        this.cacheManager.setMessage(cacheKey, message)
      }

      const preview = formatMessagePreview(message.text)
      const timestamp = this.settingsManager.inline.showTime
        ? formatTimestamp(message.ts, this.settingsManager.inline.useRelativeTime)
        : ''

      const threadIndicator = replyCount > 0 ? ` 🧵 ${replyCount}` : ''
      const inlineText = timestamp
        ? `${preview} • ${timestamp}${threadIndicator}`
        : `${preview}${threadIndicator}`

      const startPos = document.positionAt(match.index!)
      const endPos = document.positionAt(match.index! + match[0].length)
      const range = new vscode.Range(startPos, endPos)

      return {range, text: inlineText}
    } catch (error) {
      console.error('Failed to fetch message for decoration:', error)
      return null
    }
  })

  // ... rest of existing code ...
}
```

**Tests**:
- Inline preview shows thread icon + count
- Fetches thread data correctly
- Caching works

**Completion Criteria**: Thread URLs show "🧵 X" in inline preview

---

### Acceptance Criteria

- [ ] Thread URLs parsed correctly
- [ ] Hover shows parent + latest reply + count
- [ ] Inline preview shows thread icon + reply count
- [ ] Thread data cached
- [ ] Error handling for missing threads

---

## 30: Feature - Channel Name in Hover

### Overview

Fetch and display channel name in hover tooltip instead of just showing the message.

**Priority**: 3
**User Value**: Provides important context about where message was sent
**Complexity**: Low

### User Experience

**Before**:
```
"This is the message text..."

[Insert as Comment]
```

**After**:
```
📧 #general

"This is the message text..."

[Insert as Comment]
```

### Technical Approach

**Channel Fetching**:
- Use `conversations.info` API endpoint
- Cache channel info (rarely changes)
- Handle private channels (show 🔒 icon)

**Hover Update**:
- Fetch channel for message
- Display channel name with appropriate icon
- Make toggleable via `slackoscope.hover.showChannel` setting

### Implementation Tickets

#### Ticket 30.1: Update Hover Provider

**File**: `src/providers/hoverProvider.ts` (update)

```typescript
async provideHover(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover | null> {
  const parsed = this.findSlackUrlAtPosition(document, position)
  if (!parsed) return null

  try {
    const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
    let message = this.cacheManager.getMessage(cacheKey)

    if (!message) {
      message = await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
      this.cacheManager.setMessage(cacheKey, message)
    }

    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true

    // Fetch and show channel name if enabled
    if (this.settingsManager.hover.showChannel) {
      const channel = await this.fetchChannel(parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(`${channelIcon} **#${channel.name}**\n\n`)
    }

    markdown.appendMarkdown(`${message.text}\n\n`)
    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl}))})`
    )

    return new vscode.Hover(markdown)
  } catch (error) {
    console.error('Hover error:', error)
    return null
  }
}

private async fetchChannel(channelId: string): Promise<SlackChannel> {
  let channel = this.cacheManager.getChannel(channelId)
  if (!channel) {
    channel = await this.slackApi.getChannel(channelId)
    this.cacheManager.setChannel(channelId, channel)
  }
  return channel
}
```

**Tests**:
- Channel name appears in hover
- Private vs public channel icons
- Setting toggle works
- Caching works

**Completion Criteria**: Channel names display in hover with correct icons

---

### Acceptance Criteria

- [ ] Channel name shows in hover
- [ ] Public channels show 📧 icon
- [ ] Private channels show 🔒 icon
- [ ] Toggleable via setting
- [ ] Channel info cached

---

## 40: Feature - Channel Name Display in URL

### Overview

Visually replace the channel ID in the URL with the channel name without modifying the actual text.

**Example**:
```
Before: https://slack.com/archives/C12345678/p1234567890123456
After:  https://slack.com/archives/#general/p1234567890123456
```

**Priority**: 4
**User Value**: More readable URLs
**Complexity**: Medium-High

### Technical Challenges

**VS Code Limitation**: Cannot modify displayed text without changing document content.

**Possible Approaches**:

1. **Inline Decoration with Opacity** (Recommended):
   - Use decoration to dim the channel ID
   - Add inline decoration showing channel name before/after
   - Creates visual effect of replacement

2. **Complete Replacement Decoration**:
   - Cover channel ID with `textDecoration: 'none; opacity: 0'`
   - Show channel name in same position
   - Complex, fragile

3. **Semantic Highlighting** (Future):
   - Use semantic tokens (VS Code 1.43+)
   - More robust but requires LSP-like infrastructure

### Recommended Implementation: Hybrid Approach

**Visual Effect**:
```
https://slack.com/archives/C12345678/p123...
                         ^^^^^^^^^ (dimmed to 20% opacity)
                         #general (shown in decoration)
```

### Implementation Tickets

#### Ticket 40.1: Create Channel Name Decoration

**File**: `src/ui/decorationManager.ts` (add method)

```typescript
createChannelNameDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    opacity: '0.3'                 // Dim the channel ID
  })
}

applyChannelNameDecorations(
  editor: vscode.TextEditor,
  decorations: Array<{channelIdRange: vscode.Range; channelName: string}>
): void {
  const dimType = this.createChannelNameDecorationType()
  const nameType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: '',
      color: 'inherit',
      fontWeight: 'bold'
    }
  })

  const dimRanges = decorations.map(d => d.channelIdRange)
  const nameDecorations = decorations.map(d => ({
    range: d.channelIdRange,
    renderOptions: {
      after: {
        contentText: `#${d.channelName}`
      }
    }
  }))

  editor.setDecorations(dimType, dimRanges)
  editor.setDecorations(nameType, nameDecorations)
}
```

**Tests**:
- Channel ID dimmed
- Channel name shown inline
- Multiple URLs in document

**Completion Criteria**: Visual replacement working

---

#### Ticket 40.2: Update Decoration Provider

**File**: `src/providers/decorationProvider.ts` (add channel name logic)

```typescript
private async updateChannelNameDecorations(editor: vscode.TextEditor): Promise<void> {
  const document = editor.document
  const text = document.getText()
  const slackUrls = [...text.matchAll(this.slackApi.SLACK_URL_REGEX)]

  const decorations = await Promise.all(
    slackUrls.map(async match => {
      const parsed = this.slackApi.parseSlackUrl(match[0])
      if (!parsed) return null

      const channel = await this.fetchChannel(parsed.channelId)

      // Find channel ID position in URL
      const urlStart = match.index!
      const channelIdStart = match[0].indexOf(parsed.channelId)
      const startPos = document.positionAt(urlStart + channelIdStart)
      const endPos = document.positionAt(urlStart + channelIdStart + parsed.channelId.length)

      return {
        channelIdRange: new vscode.Range(startPos, endPos),
        channelName: channel.name
      }
    })
  )

  const validDecorations = decorations.filter((d): d is NonNullable<typeof d> => d !== null)
  this.decorationManager.applyChannelNameDecorations(editor, validDecorations)
}

private async fetchChannel(channelId: string): Promise<SlackChannel> {
  let channel = this.cacheManager.getChannel(channelId)
  if (!channel) {
    channel = await this.slackApi.getChannel(channelId)
    this.cacheManager.setChannel(channelId, channel)
  }
  return channel
}
```

**Tests**:
- Channel names displayed correctly
- Multiple URLs handled
- Caching works

**Completion Criteria**: Channel names visually replace IDs

---

### Acceptance Criteria

- [ ] Channel IDs visually replaced with names
- [ ] Original URLs unchanged (copy/paste works)
- [ ] Works with multiple URLs in document
- [ ] Channel info cached
- [ ] No performance issues

### Alternative Approaches (If Recommended Fails)

If opacity approach is insufficient:

**Plan B**: Don't implement visual replacement, just show channel name in hover/inline preview.

**Plan C**: Add setting to enable/disable this feature (default: disabled).

---

## 50: Feature - Relative Time Display

### Overview

Show relative timestamps ("5 minutes ago") instead of absolute times ("2:30 PM") in inline previews.

**Priority**: 5
**User Value**: More intuitive time context
**Complexity**: Low

### User Experience

**Absolute Time** (default):
```
https://slack.com/...  "Message text..." • 2:30 PM
```

**Relative Time** (when enabled):
```
https://slack.com/...  "Message text..." • 5m ago
```

### Technical Approach

**Time Formatting**:
- Use `formatRelativeTime()` utility (already implemented in Ticket 10.1)
- Toggle via `slackoscope.inline.useRelativeTime` setting
- Falls back to date for messages >7 days old

**Auto-Update** (Future Enhancement):
- Optionally refresh decorations every minute to update relative times
- Configurable via setting
- Default: disabled (avoid CPU overhead)

### Implementation Tickets

#### Ticket 50.1: Add Setting Toggle

**File**: `package.json` (already added in Ticket 1.4)

Setting already defined:
```json
"slackoscope.inline.useRelativeTime": {
  "type": "boolean",
  "default": false,
  "description": "Show relative time (e.g., '5 minutes ago') instead of absolute time"
}
```

**No code changes needed** - logic already in DecorationProvider (Ticket 10.3):

```typescript
const timestamp = this.settingsManager.inline.showTime
  ? formatTimestamp(message.ts, this.settingsManager.inline.useRelativeTime)
  : ''
```

**Tests**:
- Toggle setting changes time format
- Relative time shown when enabled
- Absolute time shown when disabled

**Completion Criteria**: Setting toggle works

---

#### Ticket 50.2: Add Auto-Refresh (Optional)

**File**: `src/providers/decorationProvider.ts` (add auto-refresh)

```typescript
private refreshInterval: NodeJS.Timeout | null = null

constructor(...) {
  // ... existing code ...

  // Auto-refresh relative times every minute (if enabled)
  if (this.settingsManager.inline.useRelativeTime) {
    this.startAutoRefresh()
  }

  settingsManager.onDidChange(() => {
    if (this.settingsManager.inline.useRelativeTime) {
      this.startAutoRefresh()
    } else {
      this.stopAutoRefresh()
    }
  })
}

private startAutoRefresh(): void {
  this.stopAutoRefresh()
  this.refreshInterval = setInterval(() => {
    vscode.window.visibleTextEditors.forEach(editor => {
      this.updateDecorations(editor)
    })
  }, 60000)                        // Every minute
}

private stopAutoRefresh(): void {
  if (this.refreshInterval) {
    clearInterval(this.refreshInterval)
    this.refreshInterval = null
  }
}

dispose(): void {
  this.stopAutoRefresh()
  // ... existing disposal ...
}
```

**Tests**:
- Auto-refresh updates decorations
- Refresh stops when setting disabled
- Disposal clears interval

**Completion Criteria**: Relative times auto-update every minute

---

### Acceptance Criteria

- [ ] Relative time option in settings
- [ ] Toggles between relative and absolute time
- [ ] Auto-refresh updates times (optional)
- [ ] No performance impact

---

## 60: Feature - User Name Display

### Overview

Fetch and display the user who sent the message in hover and optionally in inline preview.

**Priority**: 6
**User Value**: Important attribution context
**Complexity**: Low

### User Experience

**Hover**:
```
📧 #general

@alice (5 minutes ago):
"This is the message text..."

[Insert as Comment]
```

**Inline** (optional setting):
```
https://slack.com/...  @alice: "Message text..." • 2:30 PM
```

### Technical Approach

**User Fetching**:
- Use `users.info` API endpoint
- Cache user info (stable data)
- Use display name (falls back to real name)

**Display Options**:
- Always show in hover
- Optionally show in inline preview (setting: `slackoscope.inline.showUser`)

### Implementation Tickets

#### Ticket 60.1: Update Hover with User Name

**File**: `src/providers/hoverProvider.ts` (update)

```typescript
async provideHover(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover | null> {
  const parsed = this.findSlackUrlAtPosition(document, position)
  if (!parsed) return null

  try {
    const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
    let message = this.cacheManager.getMessage(cacheKey)

    if (!message) {
      message = await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
      this.cacheManager.setMessage(cacheKey, message)
    }

    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true

    // Channel name
    if (this.settingsManager.hover.showChannel) {
      const channel = await this.fetchChannel(parsed.channelId)
      const channelIcon = channel.isPrivate ? '🔒' : '📧'
      markdown.appendMarkdown(`${channelIcon} **#${channel.name}**\n\n`)
    }

    // User name + timestamp
    const user = await this.fetchUser(message.user)
    const relativeTime = formatRelativeTime(new Date(parseFloat(message.ts) * 1000))
    markdown.appendMarkdown(`**@${user.displayName}** (${relativeTime}):\n\n`)

    markdown.appendMarkdown(`> ${message.text}\n\n`)

    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl}))})`
    )

    return new vscode.Hover(markdown)
  } catch (error) {
    console.error('Hover error:', error)
    return null
  }
}

private async fetchUser(userId: string): Promise<SlackUser> {
  let user = this.cacheManager.getUser(userId)
  if (!user) {
    user = await this.slackApi.getUser(userId)
    this.cacheManager.setUser(userId, user)
  }
  return user
}
```

**Tests**:
- User name appears in hover
- Relative time shown
- User info cached

**Completion Criteria**: Hover shows user name + relative time

---

#### Ticket 60.2: Add Inline User Name (Optional)

**File**: `package.json` (add setting)

```json
"slackoscope.inline.showUser": {
  "type": "boolean",
  "default": false,
  "description": "Show user name in inline preview"
}
```

**File**: `src/types/settings.ts` (update)

```typescript
export interface InlineSettings {
  enabled: boolean
  position: 'right' | 'above' | 'below'
  showTime: boolean
  useRelativeTime: boolean
  showUser: boolean              // Add this
  fontSize: number
  color: string
  fontStyle: 'normal' | 'italic'
}
```

**File**: `src/ui/settingsManager.ts` (update)

```typescript
get inline(): InlineSettings {
  return {
    // ... existing ...
    showUser: this.config.get('inline.showUser', false)
  }
}
```

**File**: `src/providers/decorationProvider.ts` (update)

```typescript
private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
  // ... existing code to fetch message ...

  const decorationPromises = slackUrls.map(async match => {
    // ... fetch message ...

    let userName = ''
    if (this.settingsManager.inline.showUser) {
      const user = await this.fetchUser(message.user)
      userName = `@${user.displayName}: `
    }

    const preview = formatMessagePreview(message.text)
    const timestamp = this.settingsManager.inline.showTime
      ? formatTimestamp(message.ts, this.settingsManager.inline.useRelativeTime)
      : ''

    const inlineText = timestamp
      ? `${userName}${preview} • ${timestamp}`
      : `${userName}${preview}`

    // ... return decoration ...
  })
}

private async fetchUser(userId: string): Promise<SlackUser> {
  let user = this.cacheManager.getUser(userId)
  if (!user) {
    user = await this.slackApi.getUser(userId)
    this.cacheManager.setUser(userId, user)
  }
  return user
}
```

**Tests**:
- User name shows in inline when enabled
- Hidden when disabled
- User info cached

**Completion Criteria**: User names display in hover and optionally inline

---

### Acceptance Criteria

- [ ] User name shows in hover with relative time
- [ ] Inline user name toggleable via setting
- [ ] User info cached
- [ ] Display name preferred over real name

---

## 70: Feature - Linear Integration

### Overview

Integrate with Linear to allow posting the current file as a comment on a Linear issue found in a Slack thread.

**Priority**: 7
**User Value**: Seamless cross-tool collaboration
**Complexity**: High

### User Experience

**Workflow**:
1. User has Slack thread discussing Linear issue "ENG-123"
2. User hovers over Slack thread URL
3. Extension detects Linear issue mention in thread
4. Hover shows: `[Post Current File to ENG-123]`
5. User clicks, file content posted as comment on Linear issue

**Hover with Linear Issue**:
```
🧵 #eng-team - Thread (5 replies)

📋 Linear: ENG-123 - "Implement new API endpoint"
Status: In Progress

Original message:
"Let's discuss the API design..."

[Post Current File to ENG-123] [Insert as Comment]
```

### Technical Approach

**Linear API**:
- Use Linear GraphQL API
- Endpoint: `https://api.linear.app/graphql`
- Authentication: Bearer token
- Mutations: `commentCreate`

**Issue Detection**:
- Scan thread messages for Linear issue IDs (pattern: `[A-Z]+-\d+`)
- Fetch issue details from Linear
- Cache issue info

**Comment Posting**:
- Get active editor content
- Create comment on Linear issue via GraphQL mutation
- Show success/failure notification

### Implementation Tickets

#### Ticket 70.1: Create Linear API Client

**File**: `src/api/linearApi.ts`

```typescript
import type {LinearIssue, LinearComment} from '../types/linear'

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{message: string}>
}

export class LinearApi {
  private apiUrl = 'https://api.linear.app/graphql'
  private token: string

  constructor(token: string) {
    if (!token) throw new Error('Linear token is required')
    this.token = token
  }

  async getIssue(issueId: string): Promise<LinearIssue> {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          state {
            name
            type
          }
        }
      }
    `

    const response = await this.request<{issue: LinearIssue}>(query, {id: issueId})
    if (!response.issue) throw new Error('Issue not found')

    return response.issue
  }

  async getIssueByIdentifier(identifier: string): Promise<LinearIssue> {
    const query = `
      query GetIssueByIdentifier($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          state {
            name
            type
          }
        }
      }
    `

    const response = await this.request<{issue: LinearIssue}>(query, {id: identifier})
    if (!response.issue) throw new Error('Issue not found')

    return response.issue
  }

  async createComment(issueId: string, body: string): Promise<LinearComment> {
    const mutation = `
      mutation CreateComment($issueId: String!, $body: String!) {
        commentCreate(input: {issueId: $issueId, body: $body}) {
          success
          comment {
            id
            body
            createdAt
          }
        }
      }
    `

    const response = await this.request<{commentCreate: {success: boolean; comment: LinearComment}}>(mutation, {
      issueId,
      body
    })

    if (!response.commentCreate.success) {
      throw new Error('Failed to create comment')
    }

    return response.commentCreate.comment
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token
      },
      body: JSON.stringify({query, variables})
    })

    const result: GraphQLResponse<T> = await response.json()

    if (result.errors) {
      throw new Error(result.errors[0].message)
    }

    if (!result.data) {
      throw new Error('No data returned from Linear API')
    }

    return result.data
  }
}
```

**Tests**:
- Fetch issue by ID
- Fetch issue by identifier (e.g., "ENG-123")
- Create comment
- Error handling

**Completion Criteria**: Linear API client working

---

#### Ticket 70.2: Detect Linear Issues in Threads

**File**: `src/ui/formatting.ts` (add utility)

```typescript
const LINEAR_ISSUE_REGEX = /\b([A-Z]{2,}-\d+)\b/g

export function findLinearIssues(text: string): string[] {
  const matches = text.matchAll(LINEAR_ISSUE_REGEX)
  const issues = new Set<string>()

  for (const match of matches) {
    issues.add(match[1])
  }

  return Array.from(issues)
}
```

**File**: `src/cache/cacheManager.ts` (add Linear cache)

```typescript
import type {LinearIssue} from '../types/linear'

private linearIssueCache = new SimpleCache<LinearIssue>()

getLinearIssue(identifier: string): LinearIssue | undefined {
  return this.linearIssueCache.get(identifier)
}

setLinearIssue(identifier: string, issue: LinearIssue): void {
  this.linearIssueCache.set(identifier, issue)
}
```

**Tests**:
- Extract Linear issue IDs from text
- Multiple issues detected
- Invalid patterns ignored

**Completion Criteria**: Linear issue detection working

---

#### Ticket 70.3: Update Hover with Linear Issue

**File**: `src/providers/hoverProvider.ts` (update for threads)

```typescript
async provideHover(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover | null> {
  const parsed = this.findSlackUrlAtPosition(document, position)
  if (!parsed) return null

  try {
    // ... existing hover logic ...

    // If thread URL, check for Linear issues
    if (parsed.threadTs) {
      const thread = await this.fetchThread(parsed.channelId, parsed.threadTs)
      const allMessages = [thread.parent, ...thread.replies]
      const allText = allMessages.map(m => m.text).join(' ')

      const linearIssues = findLinearIssues(allText)

      if (linearIssues.length > 0 && this.linearApi) {
        // Fetch first Linear issue
        const issueId = linearIssues[0]
        let issue = this.cacheManager.getLinearIssue(issueId)

        if (!issue) {
          try {
            issue = await this.linearApi.getIssueByIdentifier(issueId)
            this.cacheManager.setLinearIssue(issueId, issue)
          } catch (error) {
            console.error('Failed to fetch Linear issue:', error)
          }
        }

        if (issue) {
          markdown.appendMarkdown(`\n📋 **Linear**: [${issue.identifier}](${issue.url}) - "${issue.title}"\n`)
          markdown.appendMarkdown(`Status: ${issue.state.name}\n\n`)

          markdown.appendMarkdown(
            `[Post Current File to ${issue.identifier}](command:slackoscope.postToLinear?${encodeURIComponent(JSON.stringify({issueId: issue.id, identifier: issue.identifier}))})\n`
          )
        }
      }
    }

    return new vscode.Hover(markdown)
  } catch (error) {
    console.error('Hover error:', error)
    return null
  }
}
```

**Tests**:
- Linear issue detected in thread
- Issue info displayed in hover
- Command link appears

**Completion Criteria**: Linear issues show in thread hovers

---

#### Ticket 70.4: Implement Post to Linear Command

**File**: `src/commands/postToLinear.ts`

```typescript
import * as vscode from 'vscode'
import type {LinearApi} from '../api/linearApi'

export async function postToLinearCommand(
  linearApi: LinearApi | null,
  args: {issueId: string; identifier: string}
): Promise<void> {
  if (!linearApi) {
    vscode.window.showErrorMessage('Slackoscope: Linear integration not configured. Set slackoscope.linearToken.')
    return
  }

  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('Slackoscope: No active editor')
    return
  }

  const document = editor.document
  const fileName = document.fileName.split('/').pop() || 'Untitled'
  const fileContent = document.getText()
  const language = document.languageId

  const commentBody = `
## ${fileName}

\`\`\`${language}
${fileContent}
\`\`\`

_Posted from VS Code via Slackoscope_
  `.trim()

  try {
    await linearApi.createComment(args.issueId, commentBody)
    vscode.window.showInformationMessage(`Slackoscope: Posted file to ${args.identifier}`)
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: Failed to post to Linear: ${error.message}`)
    }
  }
}
```

**File**: `src/commands/index.ts` (update)

```typescript
import {postToLinearCommand} from './postToLinear'

export function registerCommands(context: vscode.ExtensionContext, ctx: CommandContext) {
  context.subscriptions.push(
    // ... existing commands ...
    vscode.commands.registerCommand('slackoscope.postToLinear', args =>
      postToLinearCommand(ctx.linearApi, args)
    )
  )
}
```

**File**: `src/extension.ts` (update to pass LinearApi)

```typescript
// Initialize Linear API (optional)
let linearApi: LinearApi | null = null
if (settingsManager.linearToken) {
  try {
    linearApi = new LinearApi(settingsManager.linearToken)
  } catch (error) {
    console.warn('Linear API not available:', error)
  }
}

// Pass to providers/commands
const hoverProvider = new HoverProvider(slackApi, cacheManager, settingsManager, linearApi)

registerCommands(context, {slackApi, cacheManager, settingsManager, decorationProvider, linearApi})
```

**File**: `package.json` (add command)

```json
{
  "commands": [
    {
      "command": "slackoscope.postToLinear",
      "title": "Slackoscope: Post Current File to Linear Issue"
    }
  ]
}
```

**Tests**:
- Command posts file content to Linear
- Markdown formatting correct
- Error handling

**Completion Criteria**: Full Linear integration working

---

### Acceptance Criteria

- [ ] Linear API client implemented
- [ ] Linear issues detected in Slack threads
- [ ] Hover shows Linear issue info
- [ ] Command posts file to Linear
- [ ] Success/error notifications shown
- [ ] Linear data cached

---

## 80: Feature - File Attachments in Hover

### Overview

Display files attached to Slack messages in hover tooltip, with image previews and download links.

**Priority**: 8
**User Value**: See shared files without leaving editor
**Complexity**: Medium

### User Experience

**Hover with Files**:
```
📧 #general

@alice (5 minutes ago):
"Here's the design mockup"

📎 Files:
  🖼️ design-mockup.png (125 KB)
  [View] [Download]

[Insert as Comment]
```

**With Image Preview** (if enabled):
```
📧 #general

@alice (5 minutes ago):
"Here's the design mockup"

📎 Files:
  [Image preview thumbnail]
  design-mockup.png (125 KB)
  [View] [Download]

[Insert as Comment]
```

### Technical Approach

**File Info**:
- Files included in `conversations.history` response
- Extract file metadata: name, size, mimetype, URL
- Filter by mimetype for image detection

**Image Previews**:
- Use VS Code's image support in MarkdownString
- Embed thumbnail URL (if available)
- Fallback to file icon for non-images

**Download Links**:
- Link to Slack file URL
- Opens in browser

### Implementation Tickets

#### Ticket 80.1: Update Hover with Files

**File**: `src/providers/hoverProvider.ts` (update)

```typescript
async provideHover(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.Hover | null> {
  const parsed = this.findSlackUrlAtPosition(document, position)
  if (!parsed) return null

  try {
    // ... existing message fetch ...

    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    // ... existing channel/user display ...

    markdown.appendMarkdown(`> ${message.text}\n\n`)

    // Show files if present and enabled
    if (this.settingsManager.hover.showFiles && message.files && message.files.length > 0) {
      markdown.appendMarkdown(`\n📎 **Files**:\n\n`)

      for (const file of message.files) {
        // Image preview
        if (file.mimetype.startsWith('image/') && file.thumb) {
          markdown.appendMarkdown(`![${file.name}](${file.thumb})\n\n`)
        }

        // File info
        const sizeKb = Math.round(file.size / 1024)
        const icon = file.mimetype.startsWith('image/') ? '🖼️' : '📄'
        markdown.appendMarkdown(`${icon} **${file.name}** (${sizeKb} KB)\n`)
        markdown.appendMarkdown(`[View](${file.url})\n\n`)
      }
    }

    markdown.appendMarkdown(
      `[Insert as Comment](command:slackoscope.insertCommentedMessage?${encodeURIComponent(JSON.stringify({url: parsed.fullUrl}))})`
    )

    return new vscode.Hover(markdown)
  } catch (error) {
    console.error('Hover error:', error)
    return null
  }
}
```

**Tests**:
- Files displayed in hover
- Image previews shown
- File size formatted
- Toggle setting works

**Completion Criteria**: Files display in hover with previews

---

### Acceptance Criteria

- [ ] Files shown in hover
- [ ] Image previews for image files
- [ ] File metadata (name, size) shown
- [ ] Links to view/download
- [ ] Toggleable via setting

---

## 90: Feature - Message Age Highlighting

### Overview

Highlight Slack URLs with subtle background colors based on message age (today, recent, old).

**Priority**: 9
**User Value**: Quick visual indication of message relevance
**Complexity**: Medium

### User Experience

**Visual Design**:
- Today's messages: Light green background
- Recent messages (< 7 days): No highlight
- Old messages (> 7 days): Light red background

**Customizable**:
- Enable/disable highlighting
- Customize colors
- Customize "old" threshold

### Technical Approach

**Decoration Strategy**:
- Create separate decoration types for each age category
- Apply decorations simultaneously with inline previews
- Use subtle, transparent backgrounds

**Age Calculation**:
- Parse message timestamp
- Compare to current date
- Categorize as today/recent/old

### Implementation Tickets

#### Ticket 90.1: Update Decoration Provider for Highlighting

**File**: `src/providers/decorationProvider.ts` (update)

```typescript
private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
  // ... existing inline decoration logic ...

  // Add highlighting decorations
  if (this.settingsManager.highlighting.enabled) {
    await this.updateHighlightDecorations(editor)
  }
}

private async updateHighlightDecorations(editor: vscode.TextEditor): Promise<void> {
  const document = editor.document
  const text = document.getText()
  const slackUrls = [...text.matchAll(this.slackApi.SLACK_URL_REGEX)]

  const highlightDecorations = new Map<string, DecorationData[]>()
  highlightDecorations.set('today', [])
  highlightDecorations.set('old', [])

  for (const match of slackUrls) {
    try {
      const parsed = this.slackApi.parseSlackUrl(match[0])
      if (!parsed) continue

      const cacheKey = `${parsed.channelId}:${parsed.messageTs}`
      let message = this.cacheManager.getMessage(cacheKey)

      if (!message) {
        message = await this.slackApi.getMessage(parsed.channelId, parsed.messageTs)
        this.cacheManager.setMessage(cacheKey, message)
      }

      const age = getMessageAge(message.ts)
      const settings = this.settingsManager.highlighting

      const startPos = document.positionAt(match.index!)
      const endPos = document.positionAt(match.index! + match[0].length)
      const range = new vscode.Range(startPos, endPos)

      if (age === 'today') {
        highlightDecorations.get('today')!.push({range, text: ''})
      } else if (age === 'old') {
        // Check if older than threshold
        const timestamp = parseFloat(message.ts) * 1000
        const date = new Date(timestamp)
        const now = new Date()
        const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)

        if (diffDays >= settings.oldDays) {
          highlightDecorations.get('old')!.push({range, text: ''})
        }
      }
    } catch (error) {
      console.error('Failed to fetch message for highlighting:', error)
    }
  }

  this.decorationManager.applyHighlightDecorations(editor, highlightDecorations, this.settingsManager.highlighting)
}
```

**Tests**:
- Today's messages highlighted green
- Old messages highlighted red
- Recent messages not highlighted
- Custom threshold works
- Toggle setting works

**Completion Criteria**: Message age highlighting working

---

### Acceptance Criteria

- [ ] Messages highlighted by age
- [ ] Colors customizable
- [ ] Threshold customizable
- [ ] Toggleable via setting
- [ ] Works with inline decorations

---

## 100: Feature - Inline Styling Customization

### Overview

Allow users to customize inline preview font size, color, and style via settings.

**Priority**: 10
**User Value**: Personalization for individual workflows
**Complexity**: Low

### User Experience

**Settings**:
- `slackoscope.inline.fontSize`: 10-24 (default: 12)
- `slackoscope.inline.color`: Any CSS color (default: "rgba(128, 128, 128, 0.6)")
- `slackoscope.inline.fontStyle`: "normal" | "italic" (default: "italic")

### Technical Approach

**Settings Already Defined**: All settings added in Ticket 1.4

**Implementation**: Already handled in DecorationManager (Ticket 10.2)

**Only Remaining Work**: Validation and documentation

### Implementation Tickets

#### Ticket 100.1: Add Setting Validation

**File**: `src/ui/settingsManager.ts` (update)

```typescript
get inline(): InlineSettings {
  const fontSize = this.config.get('inline.fontSize', 12)
  const validatedFontSize = Math.max(10, Math.min(24, fontSize))  // Clamp 10-24

  return {
    enabled: this.config.get('inline.enabled', true),
    position: this.config.get('inline.position', 'right'),
    showTime: this.config.get('inline.showTime', true),
    useRelativeTime: this.config.get('inline.useRelativeTime', false),
    showUser: this.config.get('inline.showUser', false),
    fontSize: validatedFontSize,
    color: this.config.get('inline.color', 'rgba(128, 128, 128, 0.6)'),
    fontStyle: this.config.get('inline.fontStyle', 'italic')
  }
}
```

**Tests**:
- Font size clamped to valid range
- Invalid values fall back to defaults

**Completion Criteria**: Setting validation working

---

### Acceptance Criteria

- [ ] Font size customizable (10-24)
- [ ] Color customizable (CSS colors)
- [ ] Font style toggleable (normal/italic)
- [ ] Invalid values handled gracefully
- [ ] Changes apply immediately

---

## 110: Feature - 1Password Integration

### Overview

Use 1Password VS Code integration to securely load Slack and Linear API tokens instead of storing in settings.

**Priority**: 11
**User Value**: Enhanced security for API tokens
**Complexity**: Medium

### User Experience

**Setup**:
1. User stores tokens in 1Password
2. User installs 1Password VS Code extension
3. User configures Slackoscope to use 1Password references
4. Tokens loaded securely from 1Password

**Settings**:
```json
{
  "slackoscope.token": "op://vault/item/field",
  "slackoscope.linearToken": "op://vault/item/field"
}
```

### Technical Approach

**1Password CLI Integration**:
- Detect if 1Password CLI is available
- Parse `op://` references
- Use `op read` command to fetch secrets
- Cache in memory (never persist)

**Fallback**:
- If 1Password not available, use plain text tokens
- Show warning in output channel

### Implementation Tickets

#### Ticket 110.1: Create 1Password API Client

**File**: `src/api/onePasswordApi.ts`

```typescript
import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)

export class OnePasswordApi {
  private cache = new Map<string, string>()

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('op --version')
      return true
    } catch {
      return false
    }
  }

  async readSecret(reference: string): Promise<string> {
    if (!reference.startsWith('op://')) {
      // Not a 1Password reference, return as-is
      return reference
    }

    // Check cache
    const cached = this.cache.get(reference)
    if (cached) return cached

    try {
      const {stdout} = await execAsync(`op read "${reference}"`)
      const value = stdout.trim()

      // Cache in memory
      this.cache.set(reference, value)

      return value
    } catch (error) {
      throw new Error(`Failed to read from 1Password: ${error}`)
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}
```

**Tests**:
- Detect 1Password availability
- Read secret reference
- Handle plain text values
- Error handling

**Completion Criteria**: 1Password client working

---

#### Ticket 110.2: Update Extension to Use 1Password

**File**: `src/extension.ts` (update activation)

```typescript
import {OnePasswordApi} from './api/onePasswordApi'

export async function activate(context: vscode.ExtensionContext) {
  console.log('Slackoscope is activating...')

  // Initialize managers
  settingsManager = new SettingsManager()
  cacheManager = new CacheManager()

  // Initialize 1Password API
  const onePasswordApi = new OnePasswordApi()
  const has1Password = await onePasswordApi.isAvailable()

  if (!has1Password) {
    console.warn('1Password CLI not available, using plain text tokens')
  }

  // Load tokens (with 1Password if available)
  let slackToken = settingsManager.slackToken
  let linearToken = settingsManager.linearToken

  try {
    if (has1Password) {
      slackToken = await onePasswordApi.readSecret(slackToken)
      if (linearToken) {
        linearToken = await onePasswordApi.readSecret(linearToken)
      }
    }
  } catch (error) {
    console.error('Failed to load tokens from 1Password:', error)
    vscode.window.showErrorMessage('Slackoscope: Failed to load tokens from 1Password')
    return
  }

  // Initialize APIs with loaded tokens
  try {
    slackApi = new SlackApi(slackToken)
    if (linearToken) {
      linearApi = new LinearApi(linearToken)
    }
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
    }
    return
  }

  // ... rest of activation ...
}
```

**File**: `package.json` (add documentation)

```json
{
  "configuration": {
    "properties": {
      "slackoscope.token": {
        "type": "string",
        "default": "",
        "markdownDescription": "Slack API token. Can be a plain text token or a 1Password reference (e.g., `op://vault/item/field`). See [1Password documentation](https://developer.1password.com/docs/vscode/) for details."
      },
      "slackoscope.linearToken": {
        "type": "string",
        "default": "",
        "markdownDescription": "Linear API token (optional). Can be a plain text token or a 1Password reference (e.g., `op://vault/item/field`). See [1Password documentation](https://developer.1password.com/docs/vscode/) for details."
      }
    }
  }
}
```

**Tests**:
- Load tokens from 1Password
- Fallback to plain text
- Error handling

**Completion Criteria**: 1Password integration working

---

### Acceptance Criteria

- [ ] 1Password CLI detection
- [ ] Load tokens from `op://` references
- [ ] Fallback to plain text tokens
- [ ] Cache tokens in memory
- [ ] Documentation updated

---

## 120: Feature - Code Actions

### Overview

Add "Insert as Comment" as a code action (accessible via `Cmd+.` / `Ctrl+.`) when cursor is on a Slack URL.

**Priority**: 12
**User Value**: Faster workflow for common action
**Complexity**: Low

### User Experience

**Before**: User must hover and click command link

**After**:
1. Place cursor on Slack URL
2. Press `Cmd+.` (or `Ctrl+.`)
3. Select "Slackoscope: Insert as Comment"
4. Message inserted

### Technical Approach

**Code Action Provider**:
- Register for all file types
- Detect Slack URLs at cursor
- Provide "Insert as Comment" action
- Kind: `CodeActionKind.RefactorInline`

### Implementation Tickets

#### Ticket 120.1: Create Code Action Provider

**File**: `src/providers/codeActionProvider.ts`

```typescript
import * as vscode from 'vscode'
import type {SlackApi} from '../api/slackApi'
import type {CacheManager} from '../cache/cacheManager'

export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(
    private slackApi: SlackApi,
    private cacheManager: CacheManager
  ) {}

  updateApi(api: SlackApi): void {
    this.slackApi = api
  }

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = []

    // Check if cursor is on a Slack URL
    const position = range.start
    const line = document.lineAt(position.line)
    const matches = line.text.matchAll(this.slackApi.SLACK_URL_REGEX)

    for (const match of matches) {
      const startPos = line.range.start.translate(0, match.index!)
      const endPos = startPos.translate(0, match[0].length)
      const urlRange = new vscode.Range(startPos, endPos)

      if (urlRange.contains(position)) {
        const action = new vscode.CodeAction(
          'Slackoscope: Insert as Comment',
          vscode.CodeActionKind.RefactorInline
        )

        action.command = {
          title: 'Insert Slack Message as Comment',
          command: 'slackoscope.insertCommentedMessage',
          arguments: [{url: match[0]}]
        }

        actions.push(action)
        break
      }
    }

    return actions
  }
}
```

**File**: `src/extension.ts` (already registered in Ticket 1.5)

**Tests**:
- Code action appears on Slack URL
- Code action executes command
- No action when not on URL

**Completion Criteria**: Code actions working

---

### Acceptance Criteria

- [ ] Code action appears when cursor on Slack URL
- [ ] Action inserts message as comment
- [ ] Accessible via `Cmd+.` / `Ctrl+.`
- [ ] Works in all file types

---

## Testing Strategy

### Unit Testing Approach

**Test Organization**:
```
src/test/unit/
├── slackApi.test.ts
├── linearApi.test.ts
├── cacheManager.test.ts
├── formatting.test.ts
├── settingsManager.test.ts
└── onePasswordApi.test.ts
```

**Coverage Goals**:
- API clients: 100% (all methods, error paths)
- Utilities: 100% (all edge cases)
- Managers: 90%+

**Mock Strategy**:
- Mock `fetch()` for API tests
- Mock VS Code API minimally
- Use real implementations where possible

### E2E Testing Approach

**Test Organization**:
```
src/test/e2e/
├── extension.test.ts          # Activation, commands
├── hoverProvider.test.ts      # Hover functionality
├── decorationProvider.test.ts # Inline decorations
└── codeActions.test.ts        # Code actions
```

**Test Scenarios**:
- Extension activation with/without tokens
- Hover on various URL types (message, thread)
- Inline decorations with different settings
- Toggle commands
- Insert comment command
- Code actions
- Settings changes

**Test Data**:
- Create fixture files with sample Slack URLs
- Mock API responses with realistic data

### Integration Testing

**Key Integrations to Test**:
1. **Slack API**: Real API calls (optional, with test token)
2. **Linear API**: Real API calls (optional, with test token)
3. **1Password**: Manual testing (requires 1Password CLI)

**CI/CD Considerations**:
- Skip integration tests by default
- Enable with environment variable (e.g., `RUN_INTEGRATION_TESTS=1`)
- Use test tokens stored in CI secrets

### Manual Testing Checklist

**Before Release**:
- [ ] Test with real Slack workspace
- [ ] Test with real Linear workspace
- [ ] Test with 1Password CLI
- [ ] Test all settings combinations
- [ ] Test large documents (100+ URLs)
- [ ] Test performance (no lag when typing)
- [ ] Test multi-language support
- [ ] Test error scenarios (invalid tokens, network errors)

### Performance Testing

**Benchmarks**:
- Hover response time: < 200ms (with cache)
- Decoration update time: < 500ms (100 URLs)
- Extension activation time: < 1s
- Memory usage: < 50MB (typical workload)

**Profiling**:
- Use VS Code's built-in profiler
- Monitor API call frequency
- Check for memory leaks (long sessions)

---

## Migration & Rollout

### Breaking Changes

**None** - All changes are additive:
- New settings added (with defaults)
- New commands added
- Existing functionality preserved

### Migration Path

**For Users**:
1. Update extension
2. Optionally configure new settings
3. All existing functionality works as before

**For Developers**:
1. Pull latest code
2. Run `npm install` (no new dependencies)
3. Run `npm run compile` to verify build
4. Run `npm test` to verify tests

### Rollout Plan

**Phase 1: Core Features (M1)**
- Release with inline preview, threads, channel names
- Monitor for bugs/performance issues
- Gather user feedback

**Phase 2: Integrations (M2)**
- Add Linear integration
- Add 1Password integration
- Update documentation

**Phase 3: Customization (M3)**
- Add all styling options
- Add highlighting
- Polish UX

**Phase 4: Final Release (M4)**
- Code actions
- Complete documentation
- Publish to marketplace

### Documentation Updates

**README.md**:
- Update feature list
- Add screenshots/GIFs
- Document all settings
- Add Linear/1Password setup guides

**CHANGELOG.md**:
- Document all new features
- Note any behavioral changes
- Credit contributors

**CLAUDE.md**:
- Update architecture section
- Document new modules
- Update file tree
- Add new patterns

---

## Appendix: Technical Reference

### VS Code API Usage

**Decorations**:
- `window.createTextEditorDecorationType()`
- `editor.setDecorations()`
- `DecorationRenderOptions`
- `DecorationInstanceRenderOptions`

**Providers**:
- `languages.registerHoverProvider()`
- `languages.registerCodeActionsProvider()`
- `HoverProvider` interface
- `CodeActionProvider` interface

**Commands**:
- `commands.registerCommand()`
- `commands.executeCommand()`

**Configuration**:
- `workspace.getConfiguration()`
- `workspace.onDidChangeConfiguration()`

**Text Editing**:
- `editor.insertSnippet()`
- `SnippetString`
- `$LINE_COMMENT` variable

### Slack API Reference

**Endpoints**:
- `conversations.history` - Fetch messages
- `conversations.replies` - Fetch thread
- `users.info` - Fetch user
- `conversations.info` - Fetch channel

**Rate Limits**:
- Tier 3: 50+ requests/minute
- Handle 429 responses with retry

**Scopes Required**:
- `channels:history`
- `groups:history` (for private channels)
- `users:read`

### Linear API Reference

**GraphQL Endpoint**:
- `https://api.linear.app/graphql`

**Queries**:
- `issue(id: String!)` - Fetch issue
- `issues(filter: IssueFilter!)` - Search issues

**Mutations**:
- `commentCreate(input: CommentCreateInput!)` - Create comment

**Authentication**:
- Header: `Authorization: {token}` (no "Bearer" prefix)

### 1Password CLI Reference

**Commands**:
- `op --version` - Check availability
- `op read "op://vault/item/field"` - Read secret

**Reference Format**:
- `op://vault/item/field`
- Example: `op://Personal/Slack/token`

**Setup**:
- Install 1Password CLI
- Run `op signin` to authenticate
- VS Code extension auto-detects CLI

---

## Summary

This plan provides a complete roadmap for implementing all 12 requested features in Slackoscope. The implementation is structured in phases, with clear tickets, acceptance criteria, and testing strategies.

**Key Highlights**:
- **Modular architecture** enables clean separation of concerns
- **Rich data models** provide type safety and extensibility
- **Multi-tier caching** optimizes API usage
- **Extensive customization** empowers users
- **Integration-ready** design supports future extensions

**Estimated Timeline**:
- Architecture refactoring: 2-3 hours
- Core features (inline, threads): 4-5 hours
- Data enrichment (users, channels): 3-4 hours
- Integrations (Linear, 1Password): 4-5 hours
- Customization & polish: 2-3 hours
- Testing & documentation: 3-4 hours

**Total**: 18-24 agent-hours

**Next Steps**:
1. Review and approve plan
2. Begin implementation with Ticket 1.1
3. Execute tickets sequentially or in parallel (where independent)
4. Test continuously
5. Iterate based on feedback

---

**End of Implementation Plan**
