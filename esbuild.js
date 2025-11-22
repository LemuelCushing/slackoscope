// ============================================================================
// ESBUILD.JS - Build Configuration
// ============================================================================
// This file configures esbuild, a fast JavaScript bundler and minifier
//
// Think of this as: Rails asset pipeline or webpacker configuration
// Like: config/webpack/environment.js or Sprockets config
//
// KEY CONCEPTS FOR RAILS DEVELOPERS:
// - Bundler: Combines multiple files into one (like asset pipeline)
// - Minifier: Removes whitespace, shortens names (like uglifier)
// - Watch mode: Auto-rebuild on file changes (like rails server)
// - Source maps: Debug original code, not compiled (like Rails stack traces)
// ============================================================================

// IMPORT ESBUILD
// This is CommonJS require syntax (old Node.js style)
// Like: require 'esbuild' in Ruby (but it's a function, not a statement)
//
// Why CommonJS?
// - Node.js scripts traditionally use require()
// - This file runs directly with Node.js (not in VS Code)
// - package.json doesn't specify "type": "module"
const esbuild = require("esbuild")

// ============================================================================
// COMMAND LINE ARGUMENTS
// ============================================================================
// Check what flags were passed when running the script
// Like: RAILS_ENV=production in Rails
//
// process.argv = array of command line arguments
// [0] = node executable path
// [1] = script path (esbuild.js)
// [2+] = actual arguments (--production, --watch, etc.)
//
// Rails equivalent:
//   ENV['RAILS_ENV'] == 'production'
//   Or: ARGV.include?('--production')

const production = process.argv.includes('--production')
// Check if --production flag was passed
// Like: production = ARGV.include?('--production')
//
// Usage:
//   node esbuild.js              → production = false
//   node esbuild.js --production → production = true
//
// This affects:
// - Minification (smaller file size)
// - Source maps (debugging info)

const watch = process.argv.includes('--watch')
// Check if --watch flag was passed
// Like: watch_mode = ARGV.include?('--watch')
//
// Usage:
//   node esbuild.js         → watch = false (build once and exit)
//   node esbuild.js --watch → watch = true (rebuild on file changes)
//
// Watch mode is like:
//   rails server (auto-reloads on changes)
//   guard (runs tests on changes)

// ============================================================================
// ESBUILD PROBLEM MATCHER PLUGIN
// ============================================================================
// This plugin formats build errors for VS Code
// It helps VS Code's "problem matcher" parse build errors and show them in the UI
//
// Rails equivalent:
//   Like: RSpec formatter that outputs errors in a specific format
//   Or: RuboCop JSON formatter for editor integration
//
// WHY?
// - VS Code's task runner can parse these errors
// - Errors appear in the Problems panel
// - Click error → jump to file/line

/**
 * @type {import('esbuild').Plugin}
 */
// Type annotation comment (JSDoc)
// Tells TypeScript/IDE that this is an esbuild Plugin
// Like: # @type [EsbuildPlugin] in Ruby with YARD
// Provides autocomplete and type checking

const esbuildProblemMatcherPlugin = {
	// This is an esbuild plugin object
	// Like: Rails middleware or Rack app

	name: 'esbuild-problem-matcher',
	// Plugin name (for debugging)

	setup(build) {
		// Setup function - called when esbuild initializes
		// Like: Rails initializer or middleware initialize
		//
		// PARAMETER:
		// - build: esbuild build context (access to hooks)

		// ON START HOOK
		// Called when build starts
		// Like: Rails before_action or RSpec before(:each)
		build.onStart(() => {
			console.log('[watch] build started')
			// Log to console when build starts
			// VS Code's problem matcher watches for this pattern
		})

		// ON END HOOK
		// Called when build finishes (success or failure)
		// Like: Rails after_action or RSpec after(:each)
		build.onEnd((result) => {
			// PARAMETER:
			// - result: Object with errors, warnings, etc.

			// Log all errors in a format VS Code understands
			// forEach = like Ruby's .each
			result.errors.forEach(({ text, location }) => {
				// DESTRUCTURING:
				// { text, location } extracts properties from error object
				// Like: error[:text], error[:location] in Ruby

				// Log error message
				// ✘ = unicode checkmark (VS Code recognizes this)
				console.error(`✘ [ERROR] ${text}`)

				// Log error location (file:line:column)
				// VS Code can parse this and create clickable links
				console.error(`    ${location.file}:${location.line}:${location.column}:`)
			})

			// Log when build finishes
			console.log('[watch] build finished')
		})
	},
}

// ============================================================================
// MAIN BUILD FUNCTION
// ============================================================================
// This function configures and runs esbuild
// Like: Rails rake task or Sprockets compile
//
// async = this function returns a Promise (takes time to build)
// Like: def main in Ruby, but asynchronous
async function main() {
	// CREATE BUILD CONTEXT
	// esbuild.context() creates a build configuration
	// Like: Rails.application.config or Sprockets environment
	//
	// await = wait for the context to be created
	// Build context is reusable (for watch mode)
	const ctx = await esbuild.context({
		// ========================================================================
		// ENTRY POINTS
		// ========================================================================
		// Files to start bundling from
		// Like: Rails app/assets/javascripts/application.js manifest

		entryPoints: [
			'src/extension.ts'
			// Main entry point (like Rails application.js)
			// esbuild will:
			// 1. Read this file
			// 2. Follow all imports
			// 3. Bundle everything into one file
			//
			// Dependency tree:
			//   src/extension.ts
			//     ↓ imports
			//   src/slackApi.ts
			//   src/inlineDecorationManager.ts
			//     ↓ all bundled into
			//   dist/extension.js
		],

		// ========================================================================
		// BUNDLING
		// ========================================================================

		bundle: true,
		// Combine all files into one
		// Like: Rails asset pipeline concatenation
		//
		// If false:
		//   src/extension.ts → dist/extension.js
		//   src/slackApi.ts → dist/slackApi.js (NOT what we want)
		//
		// If true:
		//   All files → dist/extension.js (GOOD)
		//
		// WHY bundle?
		// - VS Code loads faster (one file vs many)
		// - Resolves all dependencies automatically
		// - Standard for extensions

		// ========================================================================
		// OUTPUT FORMAT
		// ========================================================================

		format: 'cjs',
		// Output format: CommonJS
		// Like: Rails asset pipeline output format
		//
		// OPTIONS:
		// - 'cjs': CommonJS (require/module.exports)
		// - 'esm': ES Modules (import/export)
		// - 'iife': Immediately Invoked Function Expression (browser)
		//
		// WHY 'cjs'?
		// - VS Code extensions MUST use CommonJS
		// - VS Code runs on Node.js (which uses CommonJS)
		// - Required by VS Code extension API
		//
		// Rails equivalent:
		//   Like: specifying output format for asset pipeline
		//   Or: Rack app returning specific content-type

		// ========================================================================
		// OPTIMIZATION
		// ========================================================================

		minify: production,
		// Minify code if in production mode
		// Like: Rails uglifier in production
		//
		// If true:
		//   function getMessage() { return "Hello" }
		//   → function m(){return"Hello"}
		//
		// Benefits:
		// - Smaller file size (faster loading)
		// - Shorter variable names
		// - Removed whitespace
		//
		// Drawback:
		// - Harder to debug (use source maps!)

		sourcemap: !production,
		// Generate source maps in development (not production)
		// Like: Rails config.assets.debug
		//
		// Source maps link compiled code back to original:
		//   dist/extension.js ← .map file → src/extension.ts
		//
		// WHY !production?
		// - Development: Need debugging info
		// - Production: Smaller package size
		//
		// Rails equivalent:
		//   config.assets.debug = !Rails.env.production?

		sourcesContent: false,
		// Don't include source code in source maps
		// Like: not including full source in Rails error pages
		//
		// If true: Source map contains full TypeScript source
		// If false: Source map only contains mappings
		//
		// WHY false?
		// - Smaller source map files
		// - Original .ts files are available anyway
		// - Just need mappings, not full content

		// ========================================================================
		// PLATFORM
		// ========================================================================

		platform: 'node',
		// Target platform: Node.js (not browser)
		// Like: Rails targeting server-side Ruby (not client-side)
		//
		// OPTIONS:
		// - 'node': Node.js environment
		// - 'browser': Browser environment
		// - 'neutral': Universal code
		//
		// WHY 'node'?
		// - VS Code extensions run in Node.js
		// - Uses Node.js APIs (fs, path, etc.)
		// - Not browser JavaScript
		//
		// This affects:
		// - Module resolution (Node.js style)
		// - Available globals (process, __dirname, etc.)
		// - Polyfills (none needed for Node.js)

		// ========================================================================
		// OUTPUT FILE
		// ========================================================================

		outfile: 'dist/extension.js',
		// Where to write the bundled output
		// Like: Rails public/assets/application.js
		//
		// INPUT:  src/extension.ts (+ all imports)
		// OUTPUT: dist/extension.js (single file)
		//
		// Directory structure:
		//   dist/
		//     extension.js      (bundled code)
		//     extension.js.map  (source map, if sourcemap: true)

		// ========================================================================
		// EXTERNAL DEPENDENCIES
		// ========================================================================

		external: ['vscode'],
		// Don't bundle these modules (VS Code provides them)
		// Like: Rails not including 'rails' gem in vendor/bundle
		//
		// 'vscode' module is special:
		// - Provided by VS Code at runtime
		// - Can't be bundled (it's part of VS Code)
		// - Must be marked as external
		//
		// Without this:
		//   ✗ Error: Could not resolve "vscode"
		//
		// With this:
		//   ✓ import * as vscode from "vscode" → kept as import
		//   ✓ VS Code provides it at runtime
		//
		// Other external examples (if we had them):
		//   external: ['vscode', 'electron', 'child_process']

		// ========================================================================
		// LOGGING
		// ========================================================================

		logLevel: 'silent',
		// Don't log esbuild messages (we use our plugin)
		// Like: Rails logger level
		//
		// OPTIONS:
		// - 'verbose': Log everything
		// - 'debug': Detailed debugging info
		// - 'info': Normal logging
		// - 'warning': Only warnings and errors
		// - 'error': Only errors
		// - 'silent': No logging
		//
		// WHY 'silent'?
		// - We use esbuildProblemMatcherPlugin for logging
		// - Avoids duplicate messages
		// - Better control over output format

		// ========================================================================
		// PLUGINS
		// ========================================================================

		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
			// Add our problem matcher plugin
			// Like: Rails middleware stack or Rack app
			//
			// Plugins run in order:
			// 1. esbuild processes files
			// 2. Our plugin formats errors
			// 3. VS Code parses output
		],
	})

	// ==========================================================================
	// BUILD MODE: WATCH OR ONE-TIME
	// ==========================================================================

	if (watch) {
		// WATCH MODE
		// Continuously watch for file changes and rebuild
		// Like: rails server or guard
		await ctx.watch()
		// This keeps the process running
		// Watches for changes to:
		//   - src/**/*.ts
		//   - Any files imported by entry points
		// On change:
		//   - Rebuilds automatically
		//   - Logs to console
		//   - VS Code Extension Host can auto-reload
	} else {
		// ONE-TIME BUILD
		// Build once and exit
		// Like: RAILS_ENV=production rake assets:precompile

		await ctx.rebuild()
		// Build the code once
		// Like: running webpack once

		await ctx.dispose()
		// Clean up resources and exit
		// Like: closing database connections
		//
		// WHY dispose?
		// - Free memory
		// - Clean exit
		// - Good practice
	}
}

// ============================================================================
// EXECUTE MAIN FUNCTION
// ============================================================================
// Run the main function and handle errors
// Like: Rails bin/rails script error handling

main().catch(e => {
	// CATCH ERRORS
	// If main() fails, catch the error
	// Like: rescue StandardError => e in Ruby

	// Log error to console
	console.error(e)

	// Exit with error code
	// Like: exit 1 in Ruby
	//
	// WHY exit(1)?
	// - 0 = success
	// - 1 = error
	// - npm will see this and report failure
	// - CI/CD will fail the build
	process.exit(1)
})

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// DEVELOPMENT MODE:
//   npm run watch
//   → Runs: node esbuild.js --watch
//   → Continuously rebuilds on changes
//   → Source maps enabled
//   → Not minified
//
// PRODUCTION BUILD:
//   npm run package
//   → Runs: node esbuild.js --production
//   → Builds once
//   → Minified
//   → No source maps
//   → Smaller file size
//
// QUICK BUILD:
//   npm run compile
//   → Runs: node esbuild.js
//   → Builds once
//   → Source maps enabled
//   → Not minified
//
// ============================================================================
// PERFORMANCE
// ============================================================================
//
// esbuild is EXTREMELY fast:
// - Written in Go (compiled, not interpreted)
// - Parallel processing
// - Efficient bundling algorithm
//
// Comparison (for large projects):
//   webpack: 10-30 seconds
//   esbuild: 0.1-1 second
//
// For this project:
//   esbuild: ~50ms
//   TypeScript tsc: ~2s (type checking only)
//
// Rails equivalent:
//   esbuild ≈ Sprockets on steroids
//   Much faster than webpacker/webpack
//
// ============================================================================
// KEY TAKEAWAYS
// ============================================================================
//
// 1. Entry point: src/extension.ts
// 2. Output: dist/extension.js (single bundled file)
// 3. Watch mode: Rebuilds automatically on changes
// 4. Production mode: Minified, no source maps
// 5. External: 'vscode' module provided by VS Code
// 6. Platform: Node.js (not browser)
// 7. Format: CommonJS (required by VS Code)
//
// ============================================================================
