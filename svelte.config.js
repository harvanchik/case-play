// import adapter from '@sveltejs/adapter-auto';
import adapter from 'svelte-adapter-github';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'docs',
			assets: 'docs',
			fallback: null,
			precompress: false,
			domain: 'caseplay.org',
			jekyll: false
		}),
		alias: {
			$db: './src/db',
			$stores: './src/stores'
		}
	}
};

export default config;
