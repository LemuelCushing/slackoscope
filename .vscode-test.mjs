import { defineConfig } from '@vscode/test-cli'

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// Set environment variables before tests run
	env: {
		NODE_ENV: 'test'
	},
	mocha: {
		ui: 'tdd',
		color: true,
		timeout: 10000,  // 10s timeout per test to prevent hanging
		slow: 500        // Mark tests > 500ms as slow
	},
	// Reuse downloaded VS Code to avoid re-downloading
	reuseMachineInstall: true,
	// Launch args to reduce resource usage
	launchArgs: [
		'--disable-extensions',      // Don't load other extensions
		'--disable-gpu',             // Reduce GPU usage
		'--disable-workspace-trust'  // Skip trust prompts
	]
})
