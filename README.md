# Slackoscope

View Slack messages inline in VS Code by hovering over message URLs.

## Features

- Hover over Slack URLs to preview message content
- Insert messages as comments (auto-detects language syntax)
- Toggle inline display for all messages in a file
- Session-based caching to minimize API calls

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
4. Reload VS Code

## Usage

Copy a Slack message link (right-click message → **Copy link**), paste in your code:
```javascript
// See: https://workspace.slack.com/archives/C1234ABCD/p1234567890123456
```

Hover over the URL to preview. Click **Insert Commented Message** to add it as a comment.

Toggle inline display: `Ctrl+Shift+P` → **Slackoscope: Toggle Inline Message Display**

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
