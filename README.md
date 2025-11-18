# Slackoscope

View Slack messages inline in VS Code by hovering over message URLs.

## Features

### Core Features
- **Hover preview**: Hover over Slack URLs to preview message content, threads, and file attachments
- **Inline display**: Toggle inline message previews next to URLs (customizable position, styling, and content)
- **Smart comments**: Insert messages as comments with auto-detected language syntax
- **Thread support**: View full thread conversations with reply counts
- **Code actions**: Quick action menu (Cmd+.) for inserting messages as comments

### Enhancements
- **Channel names**: Display channel names in hover tooltips
- **User names**: Show message authors in hover and inline previews
- **Relative time**: Display timestamps as "5m ago" instead of absolute times
- **Message age highlighting**: Color-code URLs by message age (today vs old)
- **File attachments**: View and preview file attachments in hover tooltips
- **Linear integration**: Detect Linear issues in threads and post files as comments
- **1Password integration**: Securely load tokens from 1Password CLI
- **Multi-tier caching**: Minimize API calls with intelligent caching

## Slack Setup

You need a Slack API token to use this extension.

### Option 1: User Token (Personal Use)

Use this if you just want to access channels you're already in.

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Give it a name (e.g., "Slackoscope") and select your workspace
4. In the sidebar, click **OAuth & Permissions**
5. Scroll to **User Token Scopes** and add:
   - `channels:history` (read public channel messages)
   - `groups:history` (read private channel messages)
6. Scroll up and click **Install to Workspace**
7. Click **Allow**
8. Copy the **User OAuth Token** (starts with `xoxp-`)

### Option 2: Bot Token (Team Use)

Use this for team installations. Bot must be invited to each channel.

1. Follow steps 1-4 above
2. Under **Bot Token Scopes** (not User Token Scopes), add:
   - `channels:history`
   - `groups:history`
   - `im:history` (optional, for DMs)
   - `mpim:history` (optional, for group DMs)
3. Click **Install to Workspace** → **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
5. In each Slack channel you want to read, type: `/invite @YourBotName`

### Configure in VS Code

1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "slackoscope"
3. Paste your token into **Slackoscope: Token**
4. (Optional) Configure Linear token for Linear integration
5. (Optional) Use 1Password references (e.g., `op://vault/item/field`) for secure token storage

## Configuration

All settings are optional and have sensible defaults.

### Inline Message Display
- `slackoscope.inline.enabled` - Enable inline message preview (default: true)
- `slackoscope.inline.position` - Position: "right", "above", or "below" (default: "right")
- `slackoscope.inline.showTime` - Show timestamp (default: true)
- `slackoscope.inline.useRelativeTime` - Use relative time like "5m ago" (default: false)
- `slackoscope.inline.showUser` - Show message author (default: false)
- `slackoscope.inline.fontSize` - Font size in pixels, 10-24 (default: 12)
- `slackoscope.inline.color` - Text color (default: "rgba(128, 128, 128, 0.6)")
- `slackoscope.inline.fontStyle` - Font style: "normal" or "italic" (default: "italic")

### Hover Tooltips
- `slackoscope.hover.showChannel` - Show channel name in hover (default: true)
- `slackoscope.hover.showFiles` - Show file attachments in hover (default: true)

### Message Age Highlighting
- `slackoscope.highlighting.enabled` - Enable message age color-coding (default: false)
- `slackoscope.highlighting.todayColor` - Color for today's messages (default: green tint)
- `slackoscope.highlighting.oldDays` - Age threshold in days for "old" messages (default: 7)
- `slackoscope.highlighting.oldColor` - Color for old messages (default: red tint)

### Integration Tokens
- `slackoscope.token` - Slack API token (required)
- `slackoscope.linearToken` - Linear API token (optional, for Linear integration)

## Usage

### Basic Workflow

1. Copy a Slack message link (right-click message → **Copy link**)
2. Paste it in your code:
```javascript
// See: https://workspace.slack.com/archives/C1234ABCD/p1234567890123456
```
3. Hover over the URL to preview message content, threads, and attachments
4. Click **Insert Commented Message** to add it as a comment
5. Or use code actions: Place cursor on URL → press `Cmd+.` → select "Insert as Comment"

### Commands

All commands are available via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Slackoscope: Toggle Inline Message Display** - Show/hide inline previews for all Slack URLs in the current file
- **Slackoscope: Insert Commented Message** - Insert message as a multi-line comment
- **Slackoscope: Clear Message Cache** - Clear all cached messages (force refresh)
- **Slackoscope: Post to Linear Issue** - Post current file as a comment to a Linear issue (when Linear issues are detected in Slack threads)

### Tips

- **Thread support**: Paste thread URLs (with `?thread_ts=...`) to view full conversations
- **Inline display**: Toggle inline preview to see all messages at a glance
- **Age highlighting**: Enable `highlighting.enabled` to color-code URLs by message age
- **Linear workflow**: When Linear issues (e.g., "ENG-123") are mentioned in Slack threads, use the Post to Linear command to attach your code as a comment

## Development

### Quick Start

```bash
npm install              # Install dependencies
npm run watch            # Auto-compile on changes (keep this running)
```

Press **F5** to launch the Extension Development Host (new VS Code window with extension loaded).

Make changes, then reload the Extension Development Host with **Ctrl+R** (Cmd+R on Mac).

Debug output appears in the Debug Console of your main VS Code window.

### Testing

**Manual testing**: Press **F5** and test interactively in the Extension Development Host window.

**Automated tests**: Run `npm test` (spawns a headless VS Code instance and runs all tests).

### Build & Package

```bash
npm run compile          # Type-check + lint + build (verify before publishing)
npm run package          # Build production .vsix file
```

### Publishing

Install `vsce` if you haven't:
```bash
npm install -g @vscode/vsce
```

Package and publish:
```bash
vsce package             # Creates .vsix file
vsce publish             # Publishes to VS Code Marketplace
```

Or publish a specific version:
```bash
vsce publish patch       # Bumps patch version (1.0.0 → 1.0.1)
vsce publish minor       # Bumps minor version (1.0.0 → 1.1.0)
vsce publish major       # Bumps major version (1.0.0 → 2.0.0)
```

You'll need a Personal Access Token from Azure DevOps. See: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
