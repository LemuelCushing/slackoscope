# CLAUDE.md - Slackoscope Codebase Guide for AI Assistants

**Last Updated**: 2025-11-17

This document provides comprehensive guidance for AI assistants working on the Slackoscope VS Code extension codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Structure](#architecture--structure)
3. [Development Setup](#development-setup)
4. [Code Conventions](#code-conventions)
5. [Key Files Reference](#key-files-reference)
6. [Extension Functionality](#extension-functionality)
7. [Testing & Debugging](#testing--debugging)
8. [Git Workflow](#git-workflow)
9. [Common Tasks](#common-tasks)
10. [Important Patterns](#important-patterns)

---

## Project Overview

**Slackoscope** is a VS Code extension that allows developers to view Slack messages inline in their code editor by hovering over Slack URLs.

**Key Features:**
- Hover over Slack URLs to preview message content, threads, and file attachments
- Insert Slack messages as comments with language-agnostic syntax detection
- Toggle inline message display with customizable styling and positioning
- Thread support with reply counts and full conversation views
- Code actions (Cmd+.) for quick message insertion
- Linear integration: detect issues in threads, post files as comments
- 1Password integration for secure token management
- Multi-tier caching to minimize API calls
- Message age highlighting with customizable colors
- Channel and user name display in hover and inline previews

**Technology Stack:**
- TypeScript (strict mode)
- esbuild (fast bundling)
- VS Code Extension API
- Native Node.js Fetch API (no external dependencies)

**Repository**: https://github.com/LemuelCushing/slackoscope

---

## Architecture & Structure

### Directory Layout

```
/home/user/slackoscope/
├── src/                           # Source code (TypeScript)
│   ├── extension.ts               # Main entry point - activation & registration
│   ├── api/                       # API integrations
│   │   ├── slackApi.ts            # Slack API client (messages, threads, users, channels)
│   │   ├── linearApi.ts           # Linear API client (issues, comments)
│   │   └── onePasswordApi.ts      # 1Password CLI integration
│   ├── cache/                     # Caching system
│   │   ├── cacheManager.ts        # Multi-tier cache coordinator
│   │   ├── simpleCache.ts         # In-memory cache implementation
│   │   └── cacheTypes.ts          # Cache interfaces
│   ├── providers/                 # VS Code providers
│   │   ├── hoverProvider.ts       # Hover tooltip provider
│   │   ├── decorationProvider.ts  # Inline decoration provider
│   │   └── codeActionProvider.ts  # Code actions provider (Cmd+.)
│   ├── ui/                        # UI utilities
│   │   ├── settingsManager.ts     # Configuration management
│   │   ├── formatting.ts          # Text formatting utilities
│   │   └── decorationManager.ts   # Decoration type management
│   ├── commands/                  # Command implementations
│   │   ├── index.ts               # Command registration
│   │   ├── toggleInline.ts        # Toggle inline display
│   │   ├── insertComment.ts       # Insert commented message
│   │   ├── clearCache.ts          # Clear cache
│   │   └── postToLinear.ts        # Post to Linear issue
│   ├── types/                     # TypeScript interfaces
│   │   ├── slack.ts               # Slack entity types
│   │   ├── linear.ts              # Linear entity types
│   │   └── settings.ts            # Settings interfaces
│   └── test/                      # Test suite
│       ├── extension.test.ts      # E2E extension tests
│       └── slackApi.test.ts       # Slack API unit tests
├── dist/                          # Compiled output (esbuild)
│   └── extension.js               # Bundled extension (generated)
├── .vscode/                       # VS Code workspace configuration
│   ├── launch.json                # Debug configuration
│   ├── tasks.json                 # Build tasks
│   ├── extensions.json            # Recommended extensions
│   └── settings.json              # Workspace settings
├── package.json                   # Extension manifest
├── tsconfig.json                  # TypeScript configuration
├── esbuild.js                     # Build script
├── .eslintrc.json                 # Linting rules
├── .prettierrc                    # Code formatting rules
├── .gitignore                     # Git ignore patterns
├── .vscodeignore                  # Package ignore patterns
├── .vscode-test.mjs               # Test runner config
└── IMPLEMENTATION_PLAN.md         # Feature implementation plan
```

### Module Responsibilities

**`src/extension.ts`** - Main entry point:
- Extension activation/deactivation lifecycle
- Token loading (including 1Password integration)
- Provider registration (hover, decorations, code actions)
- Command registration
- Settings change handling

**`src/api/`** - External API integrations:
- `slackApi.ts`: Slack REST API client (messages, threads, users, channels, URL parsing)
- `linearApi.ts`: Linear GraphQL API client (issue lookup, comment creation)
- `onePasswordApi.ts`: 1Password CLI integration for secure token loading

**`src/cache/`** - Caching system:
- `cacheManager.ts`: Multi-tier cache coordinator (messages, threads, users, channels, Linear issues)
- `simpleCache.ts`: Generic in-memory Map-based cache
- `cacheTypes.ts`: Cache interfaces

**`src/providers/`** - VS Code provider implementations:
- `hoverProvider.ts`: Hover tooltips with message content, threads, files, Linear issues
- `decorationProvider.ts`: Inline ephemeral decorations with customizable styling
- `codeActionProvider.ts`: Quick action menu for inserting messages as comments

**`src/ui/`** - UI utilities:
- `settingsManager.ts`: Configuration management with validation and change watching
- `formatting.ts`: Message preview, time formatting, Linear issue detection
- `decorationManager.ts`: Decoration type creation and application

**`src/commands/`** - Command implementations:
- `toggleInline.ts`: Toggle inline message display for current file
- `insertComment.ts`: Insert message/thread as multi-line comment
- `clearCache.ts`: Clear all caches
- `postToLinear.ts`: Post current file as Linear comment

**`src/types/`** - TypeScript type definitions:
- `slack.ts`: Slack entities (SlackMessage, SlackUser, SlackChannel, ParsedSlackUrl)
- `linear.ts`: Linear entities (LinearIssue, LinearComment)
- `settings.ts`: Settings interfaces (InlineSettings, HoverSettings, HighlightingSettings)

---

## Development Setup

### Prerequisites

- Node.js 18+ (for native Fetch API)
- VS Code ^1.91.0
- Slack API token (optional for activation, required for Slack features)
  - Extension activates and registers commands even without token
  - Shows helpful warning when attempting API calls without token
- Linear API token (optional, for Linear integration features)
- 1Password CLI (optional, for secure token management)

### Installation

```bash
npm install
```

### Development Workflow

**Watch mode** (continuous compilation):
```bash
npm run watch
# Runs both esbuild watch and TypeScript watch in parallel
```

**Build commands**:
```bash
npm run compile              # Type-check + lint + build
npm run check-types          # TypeScript type checking only
npm run lint                 # ESLint validation
npm run package              # Production build (minified)
```

**Running the extension**:
1. Press `F5` or run "Run Extension" debug configuration
2. New VS Code window opens with extension loaded
3. Make changes in source code
4. Reload extension window (Ctrl/Cmd+R) to test changes

### Environment Setup

**Required configuration**:
- Set `slackoscope.token` in VS Code settings (user or workspace)
- Token must have `channels:history` scope for message fetching

---

## Code Conventions

### TypeScript Style

**Strict Mode Enabled**:
- All TypeScript strict flags are enabled
- Type annotations required on function parameters
- No implicit `any` types
- Proper null/undefined handling

**Naming Conventions**:
- `PascalCase`: Classes (`SlackApi`)
- `camelCase`: Functions, variables (`messageCache`)
- `UPPER_SNAKE_CASE`: Constants (`SLACK_URL_REGEX`)
- Imports: camelCase or PascalCase (enforced by ESLint)

### Code Formatting (Prettier)

```json
{
  "semi": false,                    // No semicolons
  "arrowParens": "avoid",           // x => x (not (x) => x)
  "trailingComma": "none",          // No trailing commas
  "bracketSpacing": false,          // {x} (not { x })
  "printWidth": 120,                // 120 characters max
  "bracketSameLine": true           // > on same line as tag
}
```

**Important**: Always run Prettier before committing. The codebase follows consistent formatting.

### ESLint Rules

**Key rules**:
- `curly: off` - Braces optional for single-statement blocks
- `eqeqeq: warn` - Prefer strict equality (`===`)
- `no-throw-literal: warn` - Throw Error objects, not primitives
- TypeScript recommended rules enabled
- Prettier integration (no style conflicts)

### Async/Await Pattern

**Always use async/await** (never promise chains):
```typescript
// Good
async function fetchMessage(url: string): Promise<string> {
  try {
    const content = await slackApi.getMessageContent(url)
    return content
  } catch (error) {
    console.error('Failed to fetch:', error)
    return 'Error fetching message'
  }
}

// Bad - don't use promise chains
function fetchMessage(url: string): Promise<string> {
  return slackApi.getMessageContent(url)
    .then(content => content)
    .catch(error => 'Error')
}
```

### Error Handling Pattern

**Type-safe error checking**:
```typescript
try {
  // Operation that might fail
} catch (error) {
  if (error instanceof Error) {
    vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
  }
  // Handle non-Error objects if needed
}
```

**Never throw from API functions** - Return error messages instead:
```typescript
// slackApi.ts pattern
async getMessageContent(url: string): Promise<string> {
  try {
    // API call
    return messageText
  } catch (error) {
    console.error('API error:', error)
    return 'Failed to fetch message' // Graceful degradation
  }
}
```

---

## Key Files Reference

### `package.json` (Extension Manifest)

**Commands**:
- `slackoscope.toggleInlineMessage` - Show/hide inline messages (user-facing)
- `slackoscope.insertCommentedMessage` - Insert message as comment (triggered from hover)

**Configuration**:
- `slackoscope.token` (string) - Slack API token

**Activation**:
- `onStartupFinished` - Activates after VS Code fully loads

**Entry Point**:
- `main: "./dist/extension.js"` - Bundled extension file

### `tsconfig.json` (TypeScript Configuration)

**Key settings**:
- `target: "ES2022"` - Modern JavaScript features
- `module: "Node16"` - Node.js ESM/CJS interop
- `strict: true` - All strict type checks enabled
- `noEmit: true` - TypeScript checks only (esbuild bundles)
- `rootDir: "src"` - Source directory
- `skipLibCheck: true` - Faster compilation

### `esbuild.js` (Build Configuration)

**Build settings**:
- Entry: `src/extension.ts`
- Output: `dist/extension.js`
- Format: CommonJS (required by VS Code)
- Platform: Node.js
- Bundle: All dependencies except `vscode` module
- Production: Minified with no source maps
- Development: Source maps enabled
- Watch mode: Custom plugin for error reporting

**Running**:
```bash
node esbuild.js              # Development build
node esbuild.js --watch      # Watch mode
node esbuild.js --production # Production build
```

---

## Extension Functionality

### 1. Hover Provider (`src/extension.ts:21-46`)

**Purpose**: Shows message preview when hovering over Slack URLs

**Flow**:
1. Detects Slack URLs using `SLACK_URL_REGEX`
2. Checks message cache first
3. Fetches from Slack API if not cached
4. Returns hover with:
   - Message text (markdown formatted)
   - "Insert Commented Message" command link

**Implementation detail**:
```typescript
vscode.languages.registerHoverProvider('*', {
  async provideHover(document, position) {
    // Find Slack URL at cursor position
    // Check cache or fetch message
    // Return markdown hover with command link
  }
})
```

### 2. Toggle Inline Messages (`src/extension.ts:48-83`)

**Purpose**: Display all Slack messages inline in the current file

**Flow**:
1. Find all Slack URLs in document using regex
2. Fetch all messages concurrently
3. Create decoration type with after-content rendering
4. Apply decorations at each URL location
5. Toggle clears decorations

**Decoration style**:
- Gray text with opacity 0.6
- Appears after the URL
- Non-obtrusive, read-only

### 3. Insert Commented Message (`src/extension.ts:87-113`)

**Purpose**: Insert Slack message as a comment in the code

**Key feature**: Language-agnostic using VS Code's `$LINE_COMMENT` variable

**Flow**:
1. Triggered from hover command link
2. Splits message by newlines
3. Wraps each line with `$LINE_COMMENT` snippet variable
4. Inserts at current line using `insertSnippet()`

**Snippet mechanism**:
```typescript
const snippetString = new vscode.SnippetString()
messageLines.forEach(line => {
  snippetString.appendText(`\${LINE_COMMENT} ${line}\n`)
})
editor.insertSnippet(snippetString, position)
```

This automatically uses the correct comment syntax for any language (e.g., `//` for JavaScript, `#` for Python, `--` for SQL).

### 4. Slack URL Detection (`src/slackApi.ts:4`)

**Regex pattern**:
```typescript
SLACK_URL_REGEX = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p(\d+)/
```

**Matches**:
- `https://workspace.slack.com/archives/C1234ABCD/p1234567890123456`

**Capture groups**:
1. Channel ID: `C1234ABCD`
2. Message timestamp: `1234567890123456` (converted to `1234567890.123456`)

### 5. Message Fetching (`src/slackApi.ts:16-40`)

**API endpoint**: `slack.com/api/conversations.history`

**Request**:
- Method: POST
- Headers: `Authorization: Bearer {token}`
- Body: `channel={channelId}&latest={timestamp}&inclusive=true&limit=1`

**Response handling**:
- Success: Returns message text
- Error: Returns error message (never throws)
- Logs errors to console

---

## Testing & Debugging

### Test Framework

**Stack**:
- Mocha test framework
- VS Code test runner (`@vscode/test-cli` and `@vscode/test-electron`)
- TypeScript tests compiled to `out/` directory

**Running tests**:
```bash
npm run compile-tests    # Compile tests only
npm run pretest          # Full build + compile tests
npm run test             # Run all tests in headless VS Code environment
```

**Test files**:
- `src/test/slackApi.test.ts` - Unit tests for Slack API module
- `src/test/extension.test.ts` - E2E tests for extension functionality

### Test Coverage

**Unit Tests** (`slackApi.test.ts`):
- Slack URL regex pattern validation
- URL parsing and timestamp conversion
- Multiple URL formats and edge cases
- Invalid URL handling

**E2E Tests** (`extension.test.ts`):
- Extension activation and command registration
- Toggle inline message functionality
- Hover provider registration
- Configuration management
- Multi-language support (JavaScript, Python, TypeScript, Go, Rust)
- Error handling for malformed URLs
- Message caching behavior

### Programmatic Testing (No Manual VS Code Required)

The extension uses `@vscode/test-cli` which allows fully automated testing:

**How it works**:
1. Tests run in a headless VS Code instance (Electron)
2. No manual VS Code window interaction required
3. Perfect for CI/CD pipelines and automated workflows
4. Tests can be run by LLM agents or automation tools

**Key benefits for AI agents**:
- Tests execute via `npm test` command
- Results are captured in terminal output
- No GUI interaction needed
- Exit codes indicate test success/failure

**Configuration** (`.vscode-test.mjs`):
```javascript
import {defineConfig} from '@vscode/test-cli'

export default defineConfig({
  files: 'out/test/**/*.test.js'
})
```

### Writing New Tests

**Unit test pattern** (no VS Code API):
```typescript
import * as assert from "assert"
import {SLACK_URL_REGEX} from "../slackApi"

suite("Unit Tests", () => {
  test("should test pure logic", () => {
    const result = someFunction()
    assert.strictEqual(result, expectedValue)
  })
})
```

**E2E test pattern** (with VS Code API):
```typescript
import * as assert from "assert"
import * as vscode from "vscode"

suite("E2E Tests", () => {
  test("should test extension behavior", async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: "test content",
      language: "javascript"
    })
    await vscode.window.showTextDocument(doc)

    // Test extension functionality
    await vscode.commands.executeCommand("slackoscope.toggleInlineMessage")

    // Clean up
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
  })
})
```

**Best practices**:
- Always clean up resources (close editors, dispose decorations)
- Use async/await for all VS Code API calls
- Group related tests in nested suites
- Test both success and error paths
- Mock external dependencies when possible

### Debug Configuration

**Launch config** (`.vscode/launch.json`):
- Launches new VS Code window with extension
- Pre-build task runs before debugging
- Source maps enabled for breakpoint debugging
- Output: `dist/**/*.js`

**Debugging workflow**:
1. Set breakpoints in TypeScript source
2. Press `F5` or run "Run Extension"
3. Breakpoints hit in source files (not compiled output)
4. Use Debug Console for evaluation

**Logging**:
- Use `console.log()` for debugging (appears in Debug Console)
- Use `console.error()` for errors
- Use `vscode.window.show*Message()` for user-facing messages

---

## Git Workflow

### Branching Strategy

**Development branches**: Feature branches prefixed with `claude/`

**Current branch**: `claude/claude-md-mhyrjtk0ueavmg0z-012iNVfdBV4ti82DFXSEckPf`

**Workflow**:
1. Develop on feature branch
2. Commit with descriptive messages
3. Push to origin with `-u` flag
4. Create PR to main when ready

### Commit Conventions

**Recent commit style** (from git log):
```
Ditch the slack-api package
add prettier and eslint-config-prettier, tidy up esbuild.js
Fix tsconfig
Fix comment insertion; Use snippet mechanism to infer comment symbol; Cache Slack messages
```

**Conventions**:
- Imperative mood ("Fix" not "Fixed")
- Sentence case (capitalize first word)
- No periods at end
- Multiple changes can be semicolon-separated
- Focus on "what" and "why", not "how"

### Pre-commit Checklist

Before committing:
1. Run `npm run check-types` - Ensure type safety
2. Run `npm run lint` - Check code style
3. Test extension manually in debug mode
4. Verify no console errors

### Push Command

**Always use**:
```bash
git push -u origin claude/claude-md-mhyrjtk0ueavmg0z-012iNVfdBV4ti82DFXSEckPf
```

**Retry on network failures**: Up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

---

## Common Tasks

### Adding a New Command

1. **Add to `package.json` contributions**:
```json
{
  "command": "slackoscope.myNewCommand",
  "title": "Slackoscope: My New Command"
}
```

2. **Register in `extension.ts` activate function**:
```typescript
const disposable = vscode.commands.registerCommand(
  'slackoscope.myNewCommand',
  async () => {
    // Command implementation
  }
)
context.subscriptions.push(disposable)
```

3. **Test**: Reload extension window, open command palette (Ctrl/Cmd+Shift+P), search for command

### Adding a New Configuration Option

1. **Add to `package.json` configuration**:
```json
{
  "slackoscope.myOption": {
    "type": "string",
    "default": "defaultValue",
    "description": "Description of the option"
  }
}
```

2. **Read in code**:
```typescript
const config = vscode.workspace.getConfiguration('slackoscope')
const myOption = config.get<string>('myOption')
```

3. **Handle changes** (optional):
```typescript
vscode.workspace.onDidChangeConfiguration(e => {
  if (e.affectsConfiguration('slackoscope.myOption')) {
    // Handle configuration change
  }
})
```

### Modifying the Slack API Integration

**Location**: `src/slackApi.ts`

**To change API endpoint or parameters**:
1. Modify the `getMessageContent()` method
2. Update URL parsing in `parseSlackUrl()` if needed
3. Test with various Slack URLs
4. Handle new error cases gracefully

**To add new Slack API calls**:
1. Add new method to `SlackApi` class
2. Use similar pattern: async, try/catch, return error messages
3. Use native `fetch()` API
4. Add type definitions for response

### Adding New Decorations

**Pattern** (from inline message feature):
```typescript
const decorationType = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: 'decoration text',
    color: 'rgba(128, 128, 128, 0.6)'
  }
})

editor.setDecorations(decorationType, [
  {range: new vscode.Range(line, char, line, char)}
])

// Clean up when done
decorationType.dispose()
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update specific package
npm install package-name@latest --save-dev

# Update all (be careful)
npm update

# After updating, verify:
npm run compile
npm run test
```

**Important**: Always test extension after dependency updates, especially TypeScript and esbuild.

---

## Important Patterns

### 1. Session-Based Message Caching Pattern

**Location**: `src/extension.ts:4-5`

**Implementation**: Simple in-memory Map that clears on extension reload

```typescript
// Simple in-memory cache that clears on extension reload
const messageCache = new Map<string, string>()

// Usage
let messageContent = messageCache.get(slackUrl)
if (!messageContent) {
  messageContent = await slackApi.getMessageContent(slackUrl)
  messageCache.set(slackUrl, messageContent)
}
```

**Key features**:
- **Session-based**: Cache lives only during the current extension session
- **Clears on reload**: Fresh messages after reloading VS Code
- **Simple**: No persistence overhead or expiration logic needed
- **Messages can update**: Reloading extension refreshes all cached messages

**Benefits**:
- Avoids redundant API calls within a session
- Messages stay fresh - cache clears on reload
- API calls every few minutes are cheap enough
- No stale data concerns

**Cache management**:
- Automatically clears when extension is reloaded or VS Code restarts
- Clear cache manually during session: Run "Slackoscope: Clear Message Cache" command
- No configuration needed

### 2. VS Code Disposable Pattern

**All registrations must be pushed to `context.subscriptions`**:

```typescript
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(...)
  context.subscriptions.push(disposable)

  const hoverProvider = vscode.languages.registerHoverProvider(...)
  context.subscriptions.push(hoverProvider)
}
```

**Why**: Ensures proper cleanup when extension is deactivated

### 3. URL Detection in Document

**Pattern** (from hover provider):
```typescript
const line = document.lineAt(position.line)
const matches = line.text.matchAll(slackApi.SLACK_URL_REGEX)

for (const match of matches) {
  const startPos = line.range.start.translate(0, match.index)
  const endPos = startPos.translate(0, match[0].length)
  const range = new vscode.Range(startPos, endPos)

  if (range.contains(position)) {
    const url = match[0]
    // Process URL
  }
}
```

**Key points**:
- Use `matchAll()` to find all URLs on a line
- Translate positions relative to line start
- Check if cursor position is within URL range

### 4. Language-Agnostic Comment Insertion

**Using VS Code snippets** (from comment insertion feature):
```typescript
const snippetString = new vscode.SnippetString()
lines.forEach(line => {
  snippetString.appendText(`\${LINE_COMMENT} ${line}\n`)
})
editor.insertSnippet(snippetString, position)
```

**Why**: VS Code automatically resolves `$LINE_COMMENT` to the correct syntax for the current language (e.g., `//`, `#`, `--`, etc.)

### 5. Error Handling for Extension Activation

**Critical pattern** (from extension.ts:13-18):
```typescript
try {
  slackApi = new SlackApi()
} catch (error) {
  if (error instanceof Error) {
    vscode.window.showErrorMessage(`Slackoscope: ${error.message}`)
  }
  return // Stop activation on error
}
```

**Why**: If Slack token is not configured, extension should show error and not activate partially

---

## Best Practices for AI Assistants

### When Making Changes

1. **Always read files before editing** - Use the Read tool before Edit/Write
2. **Preserve formatting** - Respect Prettier configuration (no semicolons, etc.)
3. **Type safety first** - Add proper TypeScript types for all new code
4. **Test manually** - Run extension in debug mode after changes
5. **Check types and linting** - Run `npm run compile` before committing

### When Adding Features

1. **Keep it simple** - This is a lightweight extension (< 200 lines total)
2. **No external dependencies** - Use native Node.js APIs when possible
3. **Graceful degradation** - Handle errors without crashing
4. **Cache when appropriate** - Minimize API calls
5. **Follow VS Code patterns** - Use proper extension API patterns

### When Debugging Issues

1. **Check Debug Console** - Look for console.log/error output
2. **Verify configuration** - Ensure `slackoscope.token` is set
3. **Test with valid URLs** - Use real Slack message URLs
4. **Check API responses** - Add logging to see Slack API responses
5. **Reload extension** - After code changes, reload extension window

### Code Quality Checklist

Before completing any task:
- [ ] TypeScript types are correct (`npm run check-types`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatting applied (automatic on save if configured)
- [ ] Code follows existing patterns (async/await, error handling, etc.)
- [ ] No console.log statements left in (unless intentional)
- [ ] Extension tested in debug mode
- [ ] Changes are minimal and focused

---

## Quick Reference

### Key Commands
```bash
npm run watch          # Development mode
npm run compile        # Build with checks
npm run package        # Production build
npm test              # Run tests
```

### Key Files
- `src/extension.ts` - Main logic (120 lines)
- `src/slackApi.ts` - API integration (48 lines)
- `package.json` - Extension manifest
- `esbuild.js` - Build configuration

### Key Patterns
- Async/await (not promises)
- Type-safe error handling
- Message caching with Map
- VS Code disposable registration
- Snippet-based comment insertion

### VS Code API Usage
- `vscode.commands.registerCommand()` - Register commands
- `vscode.languages.registerHoverProvider()` - Hover tooltips
- `vscode.window.createTextEditorDecorationType()` - Inline decorations
- `vscode.workspace.getConfiguration()` - Read settings
- `editor.insertSnippet()` - Insert text with variables

---

## Troubleshooting

### Extension Not Activating

**Check**:
1. `activationEvents` in package.json includes `onStartupFinished`
2. No errors in Debug Console during activation
3. Slack token is configured in settings

### Hover Not Working

**Check**:
1. URL matches `SLACK_URL_REGEX` pattern
2. Slack token is valid and has correct permissions
3. Check Debug Console for API errors
4. Verify message cache is working

### Build Errors

**Common issues**:
1. TypeScript errors - Run `npm run check-types` for details
2. ESLint errors - Run `npm run lint` for details
3. Missing dependencies - Run `npm install`
4. Stale dist/ - Delete dist/ and rebuild

### Test Failures

**Check**:
1. Tests are compiled to `out/` directory
2. Extension compiles without errors
3. VS Code test runner is properly configured
4. Test dependencies are installed

---

## Additional Resources

- **VS Code Extension API**: https://code.visualstudio.com/api
- **Slack API Documentation**: https://api.slack.com/methods
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **esbuild Documentation**: https://esbuild.github.io/

---

## Maintenance Notes

### Recent Changes (from git log)

- **945c20b**: Removed `slack-api` npm package, now using native fetch
- **e4df456**: Added Prettier and eslint-config-prettier
- **300f0a5**: Fixed TypeScript configuration
- **e98c768**: Fixed comment insertion with snippet mechanism, added message caching

### Recent Improvements (2025-11-17)

- ✅ **Major architectural refactoring**: Transformed monolithic structure into modular architecture
  - Separated concerns into `api/`, `cache/`, `providers/`, `ui/`, `commands/`, `types/` directories
  - Created 20+ focused modules replacing the original ~170-line monolith
  - Full TypeScript strict mode compliance with comprehensive interfaces
- ✅ **Thread support**: Added full thread conversation viewing with reply counts
- ✅ **Inline message preview**: Customizable ephemeral display next to URLs
  - Position options: right, above, below
  - Configurable styling: font size, color, style
  - Optional user names and timestamps (absolute or relative)
- ✅ **Linear integration**: Detect Linear issues in threads, post files as comments
- ✅ **File attachments**: View and preview file attachments in hover tooltips
- ✅ **Message age highlighting**: Color-code URLs by message age with customizable thresholds
- ✅ **Code actions**: Quick action menu (Cmd+.) for inserting messages as comments
- ✅ **1Password integration**: Secure token loading from 1Password CLI
- ✅ **Multi-tier caching**: Separate caches for messages, threads, users, channels, Linear issues
- ✅ **Graceful activation**: Extension now activates without Slack token
  - Removed early return in activate() function
  - Token validation moved to API methods
  - Shows helpful warnings when features require token
- ✅ **Enhanced settings**: 14+ new configuration options across inline, hover, and highlighting categories

### Recent Improvements (2025-11-14)

- ✅ **Session-based message caching**: Simple in-memory cache that clears on reload (messages can update)
- ✅ **Comprehensive test coverage**: Added unit tests for Slack API and e2e tests for extension
- ✅ **Security updates**: Fixed all npm audit vulnerabilities
- ✅ **Documentation**: Expanded README with detailed Slack bot setup instructions
- ✅ **Testing infrastructure**: Documented programmatic testing approach for AI agents

### Implemented Features (Previously Potential)

- ~~Consider adding message formatting (bold, code blocks, etc.)~~ - Handled via markdown preview
- ~~Support for thread messages~~ - ✅ Implemented (2025-11-17)
- ~~Support for private channels~~ - Already supported via API scopes
- ~~Add support for Slack message reactions display~~ - Defer to future

---

**Document Maintainers**: Update this file when making significant architectural changes, adding new patterns, or changing development workflows.

**Last Updated**: 2025-11-17 by AI Assistant (Major architectural refactoring)
