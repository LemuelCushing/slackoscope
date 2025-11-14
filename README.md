# Slackoscope

View Slack messages inline in VS Code by hovering over message URLs.

## Features

- Hover over Slack URLs to preview message content
- Insert messages as comments (auto-detects language syntax)
- Toggle inline display for all messages in a file
- Session-based caching to minimize API calls

## Setup

1. **Get a Slack API token**:
   - Go to https://api.slack.com/apps → Create New App → From scratch
   - Under "OAuth & Permissions", add scopes:
     - User token: `channels:history`, `groups:history` (access channels you're in)
     - Bot token: same scopes, but must invite bot to channels with `/invite @botname`
   - Install to workspace and copy the token (`xoxp-` or `xoxb-`)

2. **Configure in VS Code**:
   - Open Settings (`Ctrl+,`)
   - Search "slackoscope"
   - Paste token into "Slackoscope: Token"

## Usage

Copy a Slack message link (right-click message → Copy link), paste it in your code:
```javascript
// See: https://workspace.slack.com/archives/C1234ABCD/p1234567890123456
```

Hover over the URL to see the message. Click "Insert Commented Message" to add it as a comment.

Toggle inline display: `Ctrl+Shift+P` → "Slackoscope: Toggle Inline Message Display"

## Local Development & Testing

### Manual Testing (Extension Development Host)

The easiest way to test changes:

1. Open the project in VS Code
2. Press **F5** (or Run → Start Debugging)
3. A new VS Code window opens with the extension loaded
4. Make changes to the code in the original window
5. In the Extension Development Host window, press **Ctrl+R** (Cmd+R on Mac) to reload
6. Test your changes

Debug output appears in the Debug Console of the original window.

### Build Commands

```bash
npm run watch            # Auto-compile on file changes (recommended for dev)
npm run compile          # Type-check + lint + build (production-ready check)
npm run check-types      # TypeScript type checking only
npm run lint             # ESLint only
```

### Test Commands

```bash
npm test                 # Run all tests (automated, headless VS Code instance)
npm run compile-tests    # Compile TypeScript tests to out/ directory
npm run pretest          # Runs: compile-tests + compile + lint (prepares for testing)
```

**What each does**:
- `compile-tests`: Compiles `src/test/**/*.ts` → `out/test/**/*.js`
- `pretest`: Full build pipeline before running tests (ensures everything is ready)
- `test`: Runs compiled tests using `@vscode/test-cli` (spawns headless VS Code)

### Packaging

```bash
npm run package          # Build minified .vsix file for distribution
```

Install the `.vsix` manually: Extensions view → `...` menu → Install from VSIX

## Contributing

1. Fork the repo
2. Make changes
3. Run `npm run compile` to verify
4. Submit a PR

## Links

- [GitHub](https://github.com/LemuelCushing/slackoscope)
- [Issues](https://github.com/LemuelCushing/slackoscope/issues)
