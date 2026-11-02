import { sleep } from 'workflow';
import { Sandbox } from '@vercel/sandbox';
import { put, del } from '@vercel/blob';
import rendererSource from '../../../.svelte-kit/video-renderer-source.js';
import { getExportJob, markExportExpired, updateExportJob } from './db/repositories/play-builder-exports';
import { readServerEnv } from './env';

export async function renderPlayBuilderVideo(jobId: string) {
	'use workflow';
	console.log('video-export:start', jobId);
	let sandboxName: string | undefined;
	try {
		sandboxName = await launchVideoRender(jobId);
		let finished = false;
		for (let attempt = 0; attempt < 120; attempt++) {
			await sleep('5s');
			if (await checkVideoRender(jobId, sandboxName)) {
				finished = true;
				break;
			}
		}
		if (!finished) throw new Error('Video render timed out.');
		await storeRenderedVideo(jobId, sandboxName);
	} catch (error) {
		console.error('video-export:failed', jobId, error);
		await failVideoRender(jobId);
	} finally {
		try {
			await stopVideoSandbox(jobId, sandboxName);
		} catch (error) {
			console.error('video-export:cleanup-failed', jobId, error);
		}
	}
	await sleep('24h');
	await expireVideoOutput(jobId);
}

async function launchVideoRender(jobId: string): Promise<string> {
	'use step';
	console.log('video-export:launch', jobId);
	const job = await getExportJob(jobId);
	if (!job || !['queued', 'rendering'].includes(job.status)) throw new Error('Export is no longer active.');
	// Stable names make retries reuse the running sandbox rather than starting duplicate renders.
	const name = `play-video-${jobId}`;
	const snapshotId = readServerEnv('PLAY_BUILDER_VIDEO_SANDBOX_SNAPSHOT_ID');
	const options = { name, persistent: false, timeout: 12 * 60_000, resources: { vcpus: 2 } };
	const sandbox = snapshotId
		? await Sandbox.getOrCreate({ ...options, source: { type: 'snapshot', snapshotId } })
		: await Sandbox.getOrCreate(options);
	await updateExportJob(jobId, { sandboxName: sandbox.name, status: 'rendering', progress: 1 });
	// Replay after a lost response must not launch a second FFmpeg process.
	if (await sandbox.readFileToBuffer({ path: '/vercel/sandbox/render.started' })) return sandbox.name;
	try {
		if (!snapshotId) {
			for (const command of [
				{ cmd: 'apt-get', args: ['update'], sudo: true },
				{ cmd: 'apt-get', args: ['install', '-y', 'ffmpeg'], sudo: true },
				{ cmd: 'npm', args: ['install', '--no-save', '--ignore-scripts', '@resvg/resvg-js@2.6.2'], cwd: '/vercel/sandbox' }
			]) {
				const result = await sandbox.runCommand(command);
				if (result.exitCode !== 0) throw new Error('Unable to prepare the video renderer.');
			}
		}
		await sandbox.writeFiles([
			{ path: '/vercel/sandbox/render.mjs', content: Buffer.from(rendererSource) },
			{ path: '/vercel/sandbox/input.json', content: Buffer.from(job.snapshotJson) },
			{ path: '/vercel/sandbox/render.started', content: Buffer.from('started') }
		]);
		await sandbox.runCommand({
			cmd: 'node',
			args: ['/vercel/sandbox/render.mjs', '/vercel/sandbox/input.json', '/vercel/sandbox/output.mp4', '/vercel/sandbox/progress.json'],
			cwd: '/vercel/sandbox',
			detached: true
		});
		return sandbox.name;
	} catch (error) {
		await sandbox.stop();
		throw error;
	}
}

async function checkVideoRender(jobId: string, name: string) {
	'use step';
	const job = await getExportJob(jobId);
	if (!job || !['queued', 'rendering'].includes(job.status)) throw new Error('Export is no longer active.');
	const sandbox = await Sandbox.get({ name });
	const buffer = await sandbox.readFileToBuffer({ path: '/vercel/sandbox/progress.json' });
	if (!buffer) return false;
	let progress: { progress: number; done: boolean; error?: string };
	try {
		progress = JSON.parse(buffer.toString('utf8'));
	} catch {
		return false;
	}
	if (progress.error) throw new Error(progress.error);
	await updateExportJob(jobId, { progress: Math.min(99, Math.max(1, progress.progress)) });
	return progress.done;
}

async function storeRenderedVideo(jobId: string, name: string) {
	'use step';
	console.log('video-export:store', jobId);
	const job = await getExportJob(jobId);
	if (!job || job.status !== 'rendering') return;
	const sandbox = await Sandbox.get({ name });
	const bytes = await sandbox.readFileToBuffer({ path: '/vercel/sandbox/output.mp4' });
	if (!bytes || !bytes.length) throw new Error('Rendered video is missing.');
	const pathname = `play-builder-exports/${job.id}.mp4`;
	await put(pathname, bytes, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'video/mp4' });
	const updated = await updateExportJob(jobId, {
		status: 'completed',
		progress: 100,
		outputPath: pathname,
		expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString()
	});
	if (!updated.length) await del(pathname);
}

async function failVideoRender(jobId: string) {
	'use step';
	await updateExportJob(jobId, { status: 'failed', snapshotJson: '', error: 'Unable to export this video. Please try again.' });
}

async function stopVideoSandbox(jobId: string, name?: string) {
	'use step';
	const job = await getExportJob(jobId);
	const sandboxName = name ?? job?.sandboxName;
	if (sandboxName) {
		const sandbox = await Sandbox.get({ name: sandboxName });
		await sandbox.stop();
	}
}

async function expireVideoOutput(jobId: string) {
	'use step';
	console.log('video-export:expire', jobId);
	const job = await getExportJob(jobId);
	// A deleted account cascades its jobs; the deterministic key still permits scheduled cleanup.
	const pathname = job?.outputPath ?? (!job ? `play-builder-exports/${jobId}.mp4` : null);
	if (pathname) await del(pathname);
	await markExportExpired(jobId);
}
