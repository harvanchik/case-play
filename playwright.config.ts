import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/browser',
	fullyParallel: false,
	timeout: 120_000,
	expect: { timeout: 30_000 },
	use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 1100 }, trace: 'retain-on-failure' },
	projects: [
		{ name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
		{ name: 'edge', use: { browserName: 'chromium', channel: 'msedge' } },
		{ name: 'firefox', use: { browserName: 'firefox' } },
		{ name: 'webkit', use: { browserName: 'webkit' } }
	],
	webServer: {
		command: 'node node_modules/tsx/dist/cli.mjs scripts/migrate.ts && node node_modules/vite/bin/vite.js dev --host 127.0.0.1',
		url: 'http://127.0.0.1:5173',
		reuseExistingServer: !process.env.CI,
		timeout: 240_000,
		env: { TURSO_DATABASE_URL: 'file:caseplay-animation-test.db', PLAY_BUILDER_VIDEO_EXPORT_ENABLED: 'false' }
	}
});
