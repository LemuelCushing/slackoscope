# Slackoscope

Peek into Slack messages without leaving your code. View Slack message content inline in VS Code by hovering over message URLs.

## Features

- **Hover preview**: Hover over Slack URLs to see message content instantly
- **Insert as comment**: Click to insert message text as a comment (uses correct syntax for any language)
- **Inline display**: Toggle to show all Slack messages in the current file inline
- **Message caching**: Fetched messages are cached to minimize API calls

## Requirements

- VS Code 1.91.0 or higher
- Node.js 18+ (for native Fetch API support)
- A Slack API token with appropriate permissions

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+P` (or `Cmd+P` on macOS)
3. Type `ext install LemuelCushing.slackoscope`
4. Press Enter

### From VSIX file

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the `...` menu → "Install from VSIX..."
5. Select the downloaded file

## Slack Setup

To use Slackoscope, you need a Slack API token. Here's how to set it up from scratch:

### Option 1: User Token (Simplest - No Bot Required)

**Best for**: Personal use, accessing channels you're already a member of

1. **Go to the Slack API website**:
   - Visit https://api.slack.com/apps
   - Click "Create New App"
   - Choose "From scratch"
   - Give it a name (e.g., "Slackoscope")
   - Select your workspace

2. **Add OAuth Scopes**:
   - In the left sidebar, click "OAuth & Permissions"
   - Scroll to "User Token Scopes"
   - Click "Add an OAuth Scope"
   - Add `channels:history` (to read public channel messages)
   - Add `groups:history` (to read private channel messages, if needed)

3. **Install to Workspace**:
   - Scroll up to "OAuth Tokens for Your Workspace"
   - Click "Install to Workspace"
   - Review permissions and click "Allow"

4. **Copy the User OAuth Token**:
   - After installation, you'll see "User OAuth Token"
   - It starts with `xoxp-`
   - Copy this token

5. **Configure in VS Code**:
   - Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
   - Search for "slackoscope"
   - Paste the token into the "Slackoscope: Token" field

**Note**: With a user token, you can only access messages in channels where you're already a member.

### Option 2: Bot Token (For Team Use)

**Best for**: Team installations, accessing channels the bot is invited to

1. **Create a Slack App** (same as Option 1, steps 1-2, but use "Bot Token Scopes"):
   - Go to https://api.slack.com/apps
   - Create a new app
   - Navigate to "OAuth & Permissions"
   - Under "Bot Token Scopes", add:
     - `channels:history` - Read messages from public channels
     - `groups:history` - Read messages from private channels
     - `im:history` - Read direct messages (optional)
     - `mpim:history` - Read group direct messages (optional)

2. **Install to Workspace**:
   - Click "Install to Workspace"
   - Review permissions and click "Allow"

3. **Copy the Bot OAuth Token**:
   - You'll see "Bot User OAuth Token"
   - It starts with `xoxb-`
   - Copy this token

4. **Invite Bot to Channels**:
   - In Slack, go to each channel you want to read
   - Type `/invite @YourBotName`
   - The bot must be in a channel to read its messages

5. **Configure in VS Code**:
   - Open VS Code Settings
   - Search for "slackoscope"
   - Paste the bot token into the "Slackoscope: Token" field

### Token Security

- **Never commit your token to version control**
- Use workspace settings for shared projects (tokens won't be committed)
- Consider using different tokens for development and production
- You can regenerate tokens at any time from the Slack API dashboard

### Troubleshooting Setup

**"Slack API token not found" error**:
- Check that you've set the token in VS Code settings
- Restart VS Code after setting the token

**"Error fetching Slack message" when hovering**:
- Verify your token has the correct scopes (`channels:history` or `groups:history`)
- For bot tokens: ensure the bot is invited to the channel
- For user tokens: ensure you're a member of the channel
- Check the Debug Console (`Ctrl+Shift+Y`) for detailed error messages

**Messages not appearing**:
- Verify the URL format is correct: `https://workspace.slack.com/archives/C1234ABCD/p1234567890123456`
- Thread replies use a different URL format and may not be supported yet

## Usage

### Basic Usage

1. **Find a Slack message URL**:
   - In Slack, hover over any message
   - Click the "Share" or "..." menu
   - Click "Copy link"
   - The URL looks like: `https://workspace.slack.com/archives/C1234ABCD/p1234567890123456`

2. **Paste the URL in your code**:
   ```javascript
   // Discussion about this feature:
   // https://your-workspace.slack.com/archives/C1234ABCD/p1234567890123456
   ```

3. **Hover over the URL**:
   - Move your cursor over the Slack URL
   - A tooltip will appear showing the message content
   - Click "Insert Commented Message" to add the message text as a comment

### Toggle Inline Display

Show all Slack messages in the current file inline:

1. Open a file with Slack URLs
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type "Slackoscope: Toggle Inline Message Display"
4. Messages will appear inline after each URL (in gray text)
5. Run the command again to hide messages

### Insert Message as Comment

From hover tooltip:
1. Hover over a Slack URL
2. Click "Insert Commented Message" in the tooltip
3. The message will be inserted as a comment at the current cursor position
4. Comment syntax is automatically detected based on file type

## Supported Languages

Slackoscope works with any programming language. Comment insertion automatically uses the correct syntax:

- JavaScript/TypeScript: `//`
- Python/Shell: `#`
- SQL: `--`
- HTML: `<!-- -->`
- And many more...

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `slackoscope.token` | string | `""` | Your Slack API token (starts with `xoxp-` or `xoxb-`) |

## Commands

| Command | Description |
|---------|-------------|
| `Slackoscope: Toggle Inline Message Display` | Show/hide Slack messages inline in the current file |
| `Slackoscope: Insert Commented Message` | Insert a Slack message as a comment (triggered from hover) |

## Known Limitations

- Thread replies are not currently supported
- Only works with message URLs (not channel URLs or user profiles)
- Requires channels:history scope for public channels
- Bot tokens require the bot to be invited to channels

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/LemuelCushing/slackoscope.git
cd slackoscope

# Install dependencies
npm install

# Compile
npm run compile

# Run tests
npm test

# Package extension
npm run package
```

### Running Tests

```bash
npm test                  # Run all tests
npm run compile-tests     # Compile tests only
npm run pretest          # Full build + tests
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm run compile` to check types and linting
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- [GitHub Repository](https://github.com/LemuelCushing/slackoscope)
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=LemuelCushing.slackoscope)
- [Report Issues](https://github.com/LemuelCushing/slackoscope/issues)
- [Slack API Documentation](https://api.slack.com/methods)

## Acknowledgments

Built with the VS Code Extension API and native Node.js Fetch API. No external dependencies for runtime.
