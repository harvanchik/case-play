/** Bundled at build time, then executed inside the export sandbox (never in an HTTP request). */
import { readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
import { animationDuration, evaluateAnimation, evaluateAnimationClock } from '../play-builder-animation';
import { decodePlayBuilderDocument } from '../play-builder-scene';
import { renderPlayBuilderDiagramSvg, playBuilderSocialRenderOptions } from './play-builder-social-image';

export async function renderVideo(input: string, output: string, progressPath: string, ffmpeg = 'ffmpeg') {
	const document = decodePlayBuilderDocument(JSON.parse(readFileSync(input, 'utf8')));
	const active = document.plays[document.activePlayIndex];
	const duration = animationDuration(active.animation);
	if (!active.animation || duration <= 0 || duration > 60) throw new Error('Video requires an animation between 0.1 and 60 seconds.');
	// Include the terminal pose, sampling at the same timestamps as 30 fps playback.
	const frames = Math.ceil(duration * 30) + 1;
	const log = createWriteStream(output + '.log');
	const encoder = spawn(
		ffmpeg,
		[
			'-hide_banner',
			'-loglevel',
			'error',
			'-y',
			'-f',
			'image2pipe',
			'-vcodec',
			'png',
			'-framerate',
			'30',
			'-i',
			'pipe:0',
			'-an',
			'-c:v',
			'libx264',
			'-preset',
			'fast',
			'-crf',
			'20',
			'-pix_fmt',
			'yuv420p',
			'-movflags',
			'+faststart',
			output
		],
		{ stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true }
	);
	encoder.stderr.pipe(log);
	let encoderError: Error | undefined;
	encoder.on('error', (error) => {
		encoderError = error;
	});
	encoder.stdin.on('error', (error) => {
		encoderError = error;
	});
	const exited = new Promise<number | null>((resolve) => encoder.on('close', resolve));
	const font = playBuilderSocialRenderOptions().font;
	try {
		for (let i = 0; i < frames; i++) {
			if (encoderError) throw encoderError;
			const time = Math.min(duration, i / 30);
			const scene = evaluateAnimation(active, time);
			const clock = evaluateAnimationClock(active.settings.gameClockSeconds, time);
			const svg = renderPlayBuilderDiagramSvg(
				{
					activePlayIndex: 0,
					plays: [{ ...active, animation: undefined, scene, settings: { ...active.settings, gameClockSeconds: clock.seconds } }]
				},
				{ clockVisible: clock.visible }
			);
			const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#292524"/><svg x="0" y="75" width="1920" height="930" viewBox="0 0 1000 484">${svg}</svg></svg>`;
			const png = new Resvg(frame, { font }).render().asPng();
			if (!encoder.stdin.write(png))
				await Promise.race([
					once(encoder.stdin, 'drain'),
					exited.then(() => {
						throw new Error('Video encoder stopped.');
					})
				]);
			if (i % 15 === 0) writeFileSync(progressPath, JSON.stringify({ progress: Math.floor((i / frames) * 95), done: false }));
		}
		encoder.stdin.end();
		if ((await exited) !== 0 || encoderError) throw new Error('Video encoder failed.');
		writeFileSync(progressPath, JSON.stringify({ progress: 100, done: true }));
	} catch (error) {
		encoder.kill();
		writeFileSync(progressPath, JSON.stringify({ progress: 0, done: true, error: 'Unable to render this video.' }));
		throw error;
	} finally {
		log.end();
	}
}

if (process.argv[2] && process.argv[3] && process.argv[4])
	renderVideo(process.argv[2], process.argv[3], process.argv[4], process.env.FFMPEG_PATH).catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
