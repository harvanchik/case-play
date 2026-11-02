import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function buildVideoRendererSource() {
	const result = await build({
		entryPoints: ['src/lib/server/play-builder-video-renderer.ts'],
		bundle: true,
		write: false,
		platform: 'node',
		format: 'esm',
		external: ['@resvg/resvg-js'],
		plugins: [
			{
				name: 'inline-social-assets',
				setup(builder) {
					builder.onResolve({ filter: /\?inline$/ }, (args) => ({
						path: resolve(args.resolveDir, args.path.replace(/\?inline$/, '')),
						namespace: 'video-asset'
					}));
					builder.onLoad({ filter: /.*/, namespace: 'video-asset' }, async (args) => ({ contents: await readFile(args.path), loader: 'dataurl' }));
				}
			}
		]
	});
	await mkdir('.svelte-kit', { recursive: true });
	await writeFile('.svelte-kit/video-renderer-source.js', `export default ${JSON.stringify(result.outputFiles[0].text)};\n`);
}
