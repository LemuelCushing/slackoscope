# package.json - Complete Guide for Rails Developers

This file is like a combination of `Gemfile` (dependencies) and `gemspec` (metadata) in Rails.

## Overview

In Rails, you have:
- `Gemfile`: Lists your dependencies
- `gemspec`: Describes your gem (name, version, description, etc.)
- `Rakefile`: Defines build tasks

In Node.js/TypeScript, `package.json` does ALL of these:
- Lists dependencies (like Gemfile)
- Contains metadata (like gemspec)
- Defines scripts (like Rakefile tasks)

---

## Full Annotated package.json

```json
{
  // ============================================================================
  // BASIC METADATA (Like gemspec)
  // ============================================================================

  "name": "slackoscope",
  // The extension ID (must be unique in VS Code Marketplace)
  // Like: spec.name = "slackoscope" in gemspec
  // Naming convention: lowercase, no spaces, hyphens allowed

  "displayName": "Slackoscope",
  // Human-readable name shown in VS Code UI
  // Like: spec.summary in gemspec
  // This is what users see in the Extensions view

  "publisher": "LemuelCushing",
  // Your VS Code Marketplace publisher ID
  // Like: spec.authors in gemspec
  // You must register a publisher before publishing extensions

  "repository": {
    "url": "https://github.com/LemuelCushing/slackoscope"
  },
  // Source code repository
  // Like: spec.homepage in gemspec
  // VS Code shows this as a link in the extension details

  "description": "Take a peek at slack msgs from inside your code. For those with no short term memory",
  // Short description of what the extension does
  // Like: spec.description in gemspec
  // Shown in marketplace search results

  "version": "1.0.0",
  // Semantic versioning: MAJOR.MINOR.PATCH
  // Like: spec.version = "1.0.0" in gemspec
  // Increment when publishing updates:
  //   - MAJOR: Breaking changes (1.0.0 -> 2.0.0)
  //   - MINOR: New features (1.0.0 -> 1.1.0)
  //   - PATCH: Bug fixes (1.0.0 -> 1.0.1)

  // ============================================================================
  // VS CODE COMPATIBILITY
  // ============================================================================

  "engines": {
    "vscode": "^1.91.0"
  },
  // Minimum VS Code version required
  // Like: spec.required_ruby_version = ">= 3.0.0" in gemspec
  // ^1.91.0 means:
  //   - Compatible with 1.91.0 and above
  //   - But NOT 2.0.0 (the ^ limits major version)
  //   - This follows semantic versioning
  // Rails equivalent: gem 'rails', '~> 7.0'

  // ============================================================================
  // EXTENSION CATEGORIES
  // ============================================================================

  "categories": [
    "Other"
  ],
  // Categories for VS Code Marketplace
  // Like: spec.metadata["tags"] in gemspec
  // Options: "Programming Languages", "Snippets", "Linters",
  //          "Themes", "Debuggers", "Formatters", "Testing", etc.
  // "Other" is used when extension doesn't fit standard categories

  // ============================================================================
  // ACTIVATION EVENTS (When to load the extension)
  // ============================================================================

  "activationEvents": [
    "onStartupFinished"
  ],
  // Tells VS Code WHEN to activate your extension
  // Like: Rails initializer config.to_prepare or config.after_initialize
  //
  // "onStartupFinished" = load after VS Code fully starts
  // - Good for performance (doesn't slow down startup)
  // - Extension is ready when user starts working
  //
  // Other options:
  // - "onCommand:myExtension.doThing" = activate when command is run
  // - "onLanguage:javascript" = activate when opening JS files
  // - "onUri" = activate when a URI is opened
  // - "*" = activate on startup (not recommended, slows startup)

  // ============================================================================
  // ENTRY POINT (Main file to run)
  // ============================================================================

  "main": "./dist/extension.js",
  // Path to the compiled extension entry point
  // Like: spec.require_paths = ["lib"] and lib/slackoscope.rb in gemspec
  // This is the COMPILED JavaScript file (not the TypeScript source)
  // VS Code runs this file when activating the extension
  //
  // Build process:
  // 1. Write: src/extension.ts (TypeScript)
  // 2. Build: npm run compile
  // 3. Output: dist/extension.js (JavaScript)
  // 4. VS Code loads: dist/extension.js

  // ============================================================================
  // CONTRIBUTES (Features your extension adds to VS Code)
  // ============================================================================

  "contributes": {
    // This section defines what your extension adds to VS Code
    // Like: Rails engine that adds routes, views, etc.

    // --------------------------------------------------------------------------
    // COMMANDS (User-facing actions)
    // --------------------------------------------------------------------------
    "commands": [
      {
        "command": "slackoscope.toggleInlineMessage",
        // Unique ID for this command
        // Like: Rails route name 'slackoscope_toggle_inline_message'
        // Must match the ID used in registerCommand()

        "title": "Slackoscope: Toggle Inline Message Display"
        // Display name in Command Palette (Ctrl+Shift+P)
        // Convention: prefix with extension name
        // Users can search for this in the Command Palette
      },
      {
        "command": "slackoscope.insertCommentedMessage",
        "title": "Slackoscope: Insert Commented Message",
        "enablement": "false"
        // enablement: "false" = never show in Command Palette
        // This command is only triggered by clicking the hover link
        // Like: Rails before_action that restricts access
        // You can also use expressions: "editorTextFocus && !editorReadonly"
      },
      {
        "command": "slackoscope.clearCache",
        "title": "Slackoscope: Clear Message Cache"
        // This command IS visible in Command Palette
        // Users can manually clear the cache when needed
      }
    ],

    // --------------------------------------------------------------------------
    // CONFIGURATION (User settings)
    // --------------------------------------------------------------------------
    "configuration": {
      // This section defines settings users can configure
      // Like: Rails.application.config or initializer settings

      "title": "Slackoscope",
      // Display name in Settings UI

      "properties": {
        // Each property is a setting users can change

        "slackoscope.token": {
          // Setting key (accessed via: vscode.workspace.getConfiguration("slackoscope").get("token"))
          // Like: ENV['SLACK_TOKEN'] but stored in VS Code settings

          "type": "string",
          // Data type: "string", "number", "boolean", "array", "object"
          // VS Code shows appropriate UI based on type

          "default": "",
          // Default value if user hasn't set it
          // Like: ENV.fetch('SLACK_TOKEN', '') in Rails

          "description": "Slack API Token"
          // Shown in Settings UI to explain what this setting does
          // Users see this when searching settings
        }
      }
    }
  },

  // ============================================================================
  // NPM SCRIPTS (Build tasks)
  // ============================================================================

  "scripts": {
    // Like: Rake tasks in Rakefile
    // Run with: npm run <script-name>

    "vscode:prepublish": "npm run package",
    // Automatically runs before publishing to marketplace
    // Like: Rails task that runs before deployment
    // vscode:prepublish is a special hook recognized by vsce (VS Code extension packager)

    "compile": "npm run check-types && npm run lint && node esbuild.js",
    // Full compilation with type checking and linting
    // Like: rake assets:precompile in Rails
    // && = run commands sequentially (stop if one fails)
    // Breakdown:
    //   1. check-types: Verify TypeScript types
    //   2. lint: Check code style
    //   3. esbuild: Bundle the code

    "watch": "npm-run-all -p watch:*",
    // Development mode: watch for changes and auto-compile
    // Like: rails server with auto-reload
    // npm-run-all -p = run multiple commands in parallel
    // watch:* = run all scripts starting with "watch:"
    // This runs both watch:esbuild and watch:tsc simultaneously

    "watch:esbuild": "node esbuild.js --watch",
    // Watch mode for esbuild (compiles on file changes)
    // Like: webpacker or sprockets in development mode
    // Recompiles JavaScript when you save files

    "watch:tsc": "tsc --noEmit --watch --project tsconfig.json",
    // Watch mode for TypeScript compiler
    // --noEmit = don't output files (esbuild handles that)
    // --watch = watch for file changes
    // Why both watches?
    //   - esbuild: Fast compilation
    //   - tsc: Type checking (esbuild doesn't type check)

    "package": "npm run check-types && npm run lint && node esbuild.js --production",
    // Production build (minified, optimized)
    // Like: RAILS_ENV=production rake assets:precompile
    // --production flag tells esbuild to:
    //   - Minify code (remove whitespace, shorten names)
    //   - Remove source maps
    //   - Optimize for size

    "compile-tests": "tsc -p tsconfig.test.json",
    // Compile test files
    // Like: compiling RSpec test files (if they needed compilation)
    // -p = use specific tsconfig (tsconfig.test.json)
    // Outputs to out/test/ directory

    "watch-tests": "tsc -p tsconfig.test.json -w",
    // Watch mode for test files
    // -w = --watch (recompile tests on changes)

    "pretest": "npm run compile-tests && npm run compile && npm run lint",
    // Runs automatically before "npm test"
    // Like: RSpec before(:suite) hook
    // "pre" prefix is special in npm (auto-runs before main command)
    // Ensures everything is built and linted before running tests

    "check-types": "tsc --noEmit",
    // Type checking only (no output files)
    // Like: rubocop --only Lint in Rails
    // --noEmit = don't generate JavaScript files
    // Just verify that types are correct
    // Fast way to check for type errors

    "lint": "eslint src --ext ts",
    // Code style checking
    // Like: rubocop in Rails
    // eslint = JavaScript/TypeScript linter
    // src = directory to lint
    // --ext ts = check .ts files
    // Uses .eslintrc.json for configuration

    "test": "vscode-test"
    // Run all tests
    // Like: rspec or rake test in Rails
    // vscode-test = special test runner for VS Code extensions
    // - Launches headless VS Code
    // - Runs tests inside VS Code environment
    // - Reports results
    // See .vscode-test.mjs for configuration
  },

  // ============================================================================
  // DEVELOPMENT DEPENDENCIES
  // ============================================================================

  "devDependencies": {
    // Dependencies only needed during development (not in production)
    // Like: group :development, :test in Gemfile
    // These are NOT included in the published extension

    "@types/mocha": "^10.0.7",
    // TypeScript type definitions for Mocha (test framework)
    // @types/* packages provide types for JavaScript libraries
    // Like: gem 'rspec-rails' in Rails
    // Mocha is similar to RSpec (describe, it, etc.)

    "@types/node": "22.x",
    // TypeScript type definitions for Node.js APIs
    // Like: having Ruby stdlib documentation
    // Provides types for: fs, path, http, etc.
    // 22.x = any version 22.0.0 to 22.99.99

    "@types/vscode": "^1.91.0",
    // TypeScript type definitions for VS Code API
    // Essential for extension development
    // Must match the engine version (or be close)
    // Provides IntelliSense for vscode.* APIs

    "@typescript-eslint/eslint-plugin": "^8.47.0",
    // ESLint rules for TypeScript
    // Like: rubocop-rails gem
    // Adds TypeScript-specific linting rules

    "@typescript-eslint/parser": "^8.47.0",
    // Parser that helps ESLint understand TypeScript
    // Like: parser gem for ruby-parse
    // Converts TypeScript to AST for ESLint

    "@vscode/test-cli": "^0.0.9",
    // CLI tool for running VS Code extension tests
    // Like: rspec command-line interface
    // Provides the "vscode-test" command

    "@vscode/test-electron": "^2.4.0",
    // Test runner that launches VS Code (Electron) for testing
    // Like: Capybara for Rails system tests
    // Provides headless VS Code environment for tests

    "@vscode/vsce": "^3.4.2",
    // VS Code Extension packager and publisher
    // Like: gem build and gem push
    // Commands:
    //   - vsce package: Create .vsix file
    //   - vsce publish: Publish to marketplace

    "esbuild": "^0.27.0",
    // Fast JavaScript bundler (replaces Webpack)
    // Like: Rails asset pipeline or webpacker
    // Why esbuild?
    //   - VERY fast (written in Go)
    //   - Simple configuration
    //   - Good enough for most extensions

    "eslint": "^8.57.0",
    // Linter for JavaScript/TypeScript
    // Like: rubocop
    // Checks code style and finds bugs
    // Uses .eslintrc.json for rules

    "eslint-config-prettier": "^10.1.5",
    // Disables ESLint rules that conflict with Prettier
    // Like: rubocop-rspec that extends rubocop
    // Prettier handles formatting, ESLint handles logic

    "npm-run-all": "^4.1.5",
    // Utility to run multiple npm scripts in parallel/sequence
    // Used in "watch" script
    // Like: foreman or overmind in Rails
    // Allows: npm-run-all -p watch:* (run all watch tasks)

    "prettier": "^3.5.3",
    // Code formatter (automatic formatting)
    // Like: rufo or standardrb
    // Formats code consistently
    // Uses .prettierrc for configuration
    // Most editors can auto-format on save

    "typescript": "^5.9.3"
    // TypeScript compiler
    // Like: the Ruby interpreter
    // Does:
    //   - Type checking (tsc --noEmit)
    //   - Compilation to JavaScript (tsc)
    // Version 5.9.3 is latest stable
  },

  // ============================================================================
  // KEYWORDS (For marketplace search)
  // ============================================================================

  "keywords": [
    "slack",
    "vscode",
    "extension"
  ]
  // Search terms for VS Code Marketplace
  // Like: spec.metadata["tags"] in gemspec
  // Users searching these terms will find your extension
  // Best practices:
  //   - Use 3-5 relevant keywords
  //   - Include technology names
  //   - Include use case terms
}
```

---

## Key Concepts Explained

### Caret (^) vs Tilde (~) in Versions

```json
"vscode": "^1.91.0"   // Allows: 1.91.0, 1.92.0, 1.99.0 (NOT 2.0.0)
"vscode": "~1.91.0"   // Allows: 1.91.0, 1.91.1, 1.91.9 (NOT 1.92.0)
"vscode": "1.91.0"    // Exact version only
```

Rails equivalent:
```ruby
gem 'rails', '~> 7.0'      # Like ^7.0.0 in npm
gem 'rails', '~> 7.0.0'    # Like ~7.0.0 in npm
gem 'rails', '7.0.0'       # Exact version
```

### devDependencies vs dependencies

- **devDependencies**: Only needed during development (tests, build tools, linters)
- **dependencies**: Needed at runtime (included in published extension)

Rails equivalent:
```ruby
# Gemfile
group :development, :test do
  gem 'rspec'        # devDependencies
end

gem 'httparty'       # dependencies (if we had any)
```

**This extension has NO runtime dependencies** - everything runs using VS Code's built-in Node.js and APIs.

### Scripts Naming Conventions

- **pretest**: Runs BEFORE test automatically
- **posttest**: Runs AFTER test automatically
- **watch**: Convention for development mode
- **build/compile**: Convention for production build

Rails equivalent:
```ruby
# Rakefile
task :pretest do
  # Setup before tests
end

task :test do
  # Run tests
end
```

---

## Common Commands

```bash
# Install dependencies (like bundle install)
npm install

# Development mode with auto-reload
npm run watch

# Full build with type checking and linting
npm run compile

# Production build (optimized)
npm run package

# Run tests
npm test

# Type checking only
npm run check-types

# Linting only
npm run lint
```

---

## Comparison with Rails

| Rails | npm/package.json |
|-------|------------------|
| `Gemfile` | `package.json` (dependencies section) |
| `gemspec` | `package.json` (metadata section) |
| `Rakefile` | `package.json` (scripts section) |
| `bundle install` | `npm install` |
| `rake test` | `npm test` |
| `rubocop` | `npm run lint` |
| `rails server` | `npm run watch` |
| `RAILS_ENV=production` | `npm run package --production` |

---

## Next Steps

1. **Modify metadata**: Update name, description, publisher for your extension
2. **Add scripts**: Add custom build tasks as needed
3. **Add dependencies**: Run `npm install --save-dev <package>` for dev dependencies
4. **Version bumping**: Update version before publishing
5. **Keywords**: Add relevant keywords for better discoverability

**Remember**: This file is JSON (no comments allowed), so copy the relevant parts without comments when making changes!
