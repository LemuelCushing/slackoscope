import { defineConfig } from '@vscode/test-cli'

export default defineConfig([
	// Default configuration - verbose output for development
	{
		label: 'default',
		files: 'out/test/**/*.test.js',
		env: {
			NODE_ENV: 'test'
		},
		mocha: {
			ui: 'tdd',
			color: true,
			timeout: 10000,
			slow: 500,
			exit: true
		},
		reuseMachineInstall: true,
		launchArgs: [
			'--disable-extensions',
			'--disable-gpu',
			'--disable-workspace-trust',
			'--disable-telemetry',
			'--skip-welcome',
			'--skip-release-notes',
			'--disable-updates'
		]
	},
	// Silent configuration - minimal output for CI/background
	{
		label: 'silent',
		files: 'out/test/**/*.test.js',
		env: {
			NODE_ENV: 'test',
			SILENT_TESTS: 'true'    // Flag for extension to suppress logs
		},
		mocha: {
			ui: 'tdd',
			color: false,           // No colors for cleaner output
			reporter: 'dot',        // Dot reporter - shows dots + summary
			timeout: 10000,
			slow: 500,
			exit: true
		},
		reuseMachineInstall: true,
		launchArgs: [
			'--disable-extensions',
			'--disable-gpu',
			'--disable-workspace-trust',
			'--disable-telemetry',
			'--skip-welcome',
			'--skip-release-notes',
			'--disable-updates'
			// Note: --log off suppresses test output too, so removed
		]
	}
])
