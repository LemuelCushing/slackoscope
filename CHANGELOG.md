# Change Log

All notable changes to the "slackoscope" extension will be documented in this file.

## [Unreleased]

### Added
- **Thread support**: View thread replies in hover tooltips with reply count indicators
- **Inline message preview**: Display message content inline next to URLs (ephemeral, customizable)
  - Toggle command: "Slackoscope: Toggle Inline Message Display"
  - Position options: right (default), above, or below URL
  - Show/hide timestamp and user name
  - Relative time display ("5m ago" vs "2:30 PM")
  - Customizable font size (10-24px), color, and style
- **Channel name display**: View channel names in hover tooltips
- **User name display**: Show message authors in hover and inline previews
- **Linear integration**:
  - Detect Linear issues mentioned in Slack threads
  - Post current file as comment to Linear issues
  - Command: "Slackoscope: Post to Linear Issue"
- **File attachments**: View file attachments in hover with image previews
- **Message age highlighting**: Color-code URLs by message age (today vs old)
  - Customizable colors and age threshold
- **Code actions**: Quick action menu (Cmd+.) for "Insert as Comment"
- **1Password integration**: Securely load tokens from 1Password CLI (`op://` references)
- **Enhanced caching**: Multi-tier cache for messages, threads, users, channels, Linear issues

### Changed
- **Major architectural refactoring**: Modular structure with separate directories for API, cache, providers, UI, commands
- **Configuration structure**: New nested settings (inline.*, hover.*, highlighting.*)
- **Activation behavior**: Extension now activates even without Slack token configured
  - Shows helpful warning messages when token is missing
  - All commands and providers register regardless of token state
  - API calls fail gracefully with clear error messages

### Fixed
- **Test Suite Stability**: Fixed unhandled promise rejections in the test suite that were causing excessive stack traces. Replaced unsafe `try...catch` blocks with `assert.rejects` to ensure tests fail gracefully and predictably.
- Extension activation failure when Slack token not configured
- Token validation moved from constructor to API methods for graceful degradation

### Technical
- New directory structure:
  - `src/api/` - SlackApi, LinearApi, OnePasswordApi
  - `src/cache/` - CacheManager and cache implementations
  - `src/providers/` - HoverProvider, DecorationProvider, CodeActionProvider
  - `src/ui/` - SettingsManager, formatting utilities, DecorationManager
  - `src/commands/` - Command implementations
  - `src/types/` - TypeScript interfaces for Slack, Linear, settings
- Full TypeScript strict mode compliance
- Comprehensive test coverage for new features

## [1.0.0] - Initial Release

### Added
- Hover over Slack URLs to preview message content
- Insert Slack messages as comments (language-agnostic)
- Session-based message caching
- Support for public and private channels
- User and Bot token authentication