# Slackoscope

Slack messages in your code editor, hover or inline or inserted as comments, for those with no short term memory and a dislike for alt-tabbing.

𒂷 Now with Linear 𒀱 shoehorned in! 𒉓 

## What it does
- Hover a Slack message URL to view the message, thread, and files
- Show inline previews next to URLs (toggle on/off)
- Insert a message as a language-appropriate comment
- Optional: post the current file to a Linear issue referenced in the thread (“Post to Linear”)

## Linear (optional)
It was kinda purpose built for lazy ass tech-support work, so I got Linear integration in here. It works by spotting the Linear Asks msg and pulling the ticket ref from it. Your milage may vary, but feel free to dig in (The detection lives in `src/linear/detector.ts` - look for `extractLinearIssueFromMessage`) and PR if this can help your day-to-day trudgery.

## Setup
You need a Slack API token.

### Option 1: User token (personal use)
1. Go to https://api.slack.com/apps
2. Create a new app (From scratch) in your workspace
3. OAuth & Permissions → User Token Scopes:
   - `channels:history`
   - `groups:history`
4. Install to Workspace and copy the User OAuth Token (`xoxp-`)

### Option 2: Bot token (team use)
1. Same steps as above
2. OAuth & Permissions → Bot Token Scopes:
   - `channels:history`
   - `groups:history`
   - `im:history` (optional, DMs)
   - `mpim:history` (optional, group DMs)
3. Install to Workspace and copy the Bot User OAuth Token (`xoxb-`)
4. Invite the bot to each channel: `/invite @YourBotName`

### Configure in VS Code
1. Settings → search “slackoscope”
2. Set `slackoscope.token`
3. Optional: set `slackoscope.linearToken`
4. Optional: use 1Password refs like `op://vault/item/field`

## Usage
1. Paste a Slack message link into your code
2. Hover to preview
3. Use Command Palette → “Slackoscope: Insert Commented Message” (or `Cmd+.` on the URL)
4. If a Linear issue is detected, use “Slackoscope: Post Current File to Linear Issue” to post your file as a comment

## Configuration (optional)
| Setting | Type | Values | What it does |
| --- | --- | --- | --- |
| `slackoscope.inline.enabled` | boolean | `true` / `false` | Show inline previews next to Slack URLs |
| `slackoscope.inline.showChannelName` | boolean | `true` / `false` | Replace channel IDs with names (e.g., `C123` → `#general`) |
| `slackoscope.inline.showUser` | boolean | `true` / `false` | Show message author in inline preview |
| `slackoscope.inline.showTime` | boolean | `true` / `false` | Show message timestamp in inline preview |
| `slackoscope.inline.useRelativeTime` | boolean | `true` / `false` | Use relative timestamps (e.g., “5m ago”) |
| `slackoscope.inline.fontSize` | number | `10–24` | Inline preview font size (px) |
| `slackoscope.inline.fontStyle` | string | `normal` / `italic` | Inline preview font style |
| `slackoscope.inline.color` | string | CSS color | Inline preview text color |
| `slackoscope.hover.showChannel` | boolean | `true` / `false` | Show channel name in hover tooltip |
| `slackoscope.hover.showFiles` | boolean | `true` / `false` | Show attachments in hover tooltip |
| `slackoscope.hover.showFileInfo` | boolean | `true` / `false` | Show file type/size in hover tooltip |
| `slackoscope.highlighting.enabled` | boolean | `true` / `false` | Color-code Slack URLs by message age |
| `slackoscope.highlighting.todayColor` | string | CSS color | Background for messages from today |
| `slackoscope.highlighting.oldDays` | number | days | Age threshold for “old” messages |
| `slackoscope.highlighting.oldColor` | string | CSS color | Background for “old” messages |
