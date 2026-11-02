import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { buildVideoRendererSource } from '../scripts/video-renderer-plugin';
import { createAnimation, insertAnimationStep } from '../src/lib/play-builder-animation';
import { defaultPlayBuilderFieldSettings, encodePlayBuilderDocument, type PlayBuilderScene } from '../src/lib/play-builder-scene';

test('the production renderer produces a decodable 1080p H.264 MP4', { skip: !process.env.FFMPEG_PATH }, async () => {
	await buildVideoRendererSource();
	const source = (await import(pathToFileURL(resolve('.svelte-kit/video-renderer-source.js')).href)).default;
	const renderer = resolve('.svelte-kit/video-renderer-local-check.mjs');
	await writeFile(renderer, source);
	const directory = await mkdtemp(join(tmpdir(), 'caseplay-video-'));
	const scene: PlayBuilderScene = {
		markers: [{ id: 1, kind: 'team-a', x: 300, y: 240, label: 'A-1' }],
		guides: [],
		paths: [],
		freeStrokes: [],
		layerOrder: [{ type: 'marker', id: 1 }]
	};
	const animation = insertAnimationStep(createAnimation(scene), 0);
	animation.transitions[0].duration = 0.2;
	animation.steps[1].poses[0].x = 600;
	const input = join(directory, 'input.json'),
		output = join(directory, 'output.mp4'),
		progress = join(directory, 'progress.json');
	await writeFile(
		input,
		JSON.stringify(
			encodePlayBuilderDocument({
				activePlayIndex: 0,
				plays: [{ name: 'Video Check', scene, animation, settings: defaultPlayBuilderFieldSettings() }]
			})
		)
	);
	const render = spawnSync(process.execPath, [renderer, input, output, progress], {
		encoding: 'utf8',
		timeout: 120_000,
		env: process.env,
		windowsHide: true
	});
	assert.equal(render.status, 0, render.stderr);
	assert.equal(JSON.parse(await readFile(progress, 'utf8')).done, true);
	const bytes = await readFile(output);
	assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
	const probe = spawnSync(process.env.FFMPEG_PATH!, ['-i', output, '-f', 'null', '-'], { encoding: 'utf8', timeout: 30_000, windowsHide: true });
	assert.equal(probe.status, 0, probe.stderr);
	assert.match(probe.stderr, /Video: h264/);
	assert.match(probe.stderr, /1920x1080/);
	assert.match(probe.stderr, /30 fps/);
});
