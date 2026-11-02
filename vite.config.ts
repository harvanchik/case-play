import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import { buildVideoRendererSource } from './scripts/video-renderer-plugin';

export default defineConfig(async ({ command, mode }) => {
	await buildVideoRendererSource();
	// Animation editing does not need a local Workflow runtime while video export is disabled.
	const videoEnabled = loadEnv(mode, process.cwd(), '').PLAY_BUILDER_VIDEO_EXPORT_ENABLED === 'true';
	const workflows = command === 'build' || videoEnabled ? [(await import('workflow/sveltekit')).workflowPlugin()] : [];
	return {
		plugins: [sveltekit(), ...workflows],
		optimizeDeps: {
			include: ['@iconify/svelte', 'mark.js']
		}
	};
});
