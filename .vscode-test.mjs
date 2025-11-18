import { defineConfig } from '@vscode/test-cli'

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// Set environment variables before tests run
	env: {
		NODE_ENV: 'test'
	},
	mocha: {
		ui: 'tdd',
		color: true
	}
})
