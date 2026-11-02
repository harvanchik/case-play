<script lang="ts">
	import { onMount } from 'svelte';
	import type { SerializedPlayBuilderDocument } from '$lib/play-builder-scene';
	import HoverTooltip from '../HoverTooltip.svelte';
	export let document: SerializedPlayBuilderDocument;
	export let signedIn: boolean;
	export let csrfToken: string | null;
	export let onsignin: () => Promise<void>;
	type Job = { id: string; status: string; progress: number; error?: string | null; expiresAt: string | null };
	let enabled = false;
	let job: Job | null = null;
	let busy = false;
	let message = '';
	let timer: ReturnType<typeof setTimeout>;
	let disposed = false;
	let generation = 0;
	async function refresh(jobId?: string) {
		const currentGeneration = generation;
		try {
			const response = await fetch(jobId ? `/api/play-builder-exports/${jobId}` : '/api/play-builder-exports');
			if (!response.ok || disposed || currentGeneration !== generation) return;
			const result = await response.json();
			if (!jobId) enabled = result.enabled;
			job = result.job;
		} catch {
			/* Keep editing when status is temporarily unavailable. */
		}
		if (!disposed && currentGeneration === generation && (job?.status === 'queued' || job?.status === 'rendering'))
			timer = setTimeout(() => refresh(job!.id), 3000);
	}
	async function exportVideo() {
		busy = true;
		message = '';
		generation++;
		clearTimeout(timer);
		try {
			const response = await fetch('/api/play-builder-exports', {
				method: 'POST',
				headers: { 'content-type': 'application/json', ...(csrfToken ? { 'x-caseplay-csrf': csrfToken } : {}) },
				body: JSON.stringify({ document })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.message || 'Unable to export video.');
			job = result.job;
			clearTimeout(timer);
			if (job?.status === 'queued' || job?.status === 'rendering') timer = setTimeout(() => refresh(job!.id), 1500);
		} catch (error) {
			message = (error as Error).message;
		} finally {
			busy = false;
		}
	}
	onMount(() => {
		if (signedIn) void refresh();
		return () => {
			disposed = true;
			clearTimeout(timer);
		};
	});
	$: running = job?.status === 'queued' || job?.status === 'rendering';
	$: tooltip = !signedIn ? 'Sign in to download an MP4' : !enabled ? 'Video export is not available yet' : '1080p MP4 · authored timing at 1×';
</script>

<div data-animation-ui class="video-actions">
	<HoverTooltip text={tooltip} shortcutKeys={[]} wrapperClass="flex">
		{#if !signedIn}<button
				type="button"
				disabled={busy}
				on:click={async () => {
					busy = true;
					try {
						await onsignin();
					} finally {
						busy = false;
					}
				}}>MP4 ↗</button
			>{:else}<button type="button" disabled={!enabled || busy || running || !document.p[document.a]?.[3]} on:click={exportVideo}
				>{busy ? 'Preparing…' : running ? `${job?.status === 'queued' ? 'Queued' : 'Rendering'} ${job?.progress ?? 0}%` : 'Export MP4'}</button
			>{/if}
	</HoverTooltip>
	{#if job?.status === 'completed' && job.expiresAt && Date.parse(job.expiresAt) > Date.now()}<a href={`/api/play-builder-exports/${job.id}/download`}
			>Download MP4 ↓</a
		>{/if}
	<span role="status">{message || (job?.status === 'failed' ? job.error || 'Video export failed. Try again.' : '')}</span>
</div>

<style>
	.video-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-top: 1px solid #44403c;
		background: #292524;
		font-family: Inter, sans-serif;
		font-size: 11px;
		color: #e7e5e4;
	}
	button,
	a {
		display: inline-block;
		padding: 4px 8px;
		border: 1px solid #78716c;
		color: #292524;
		background: #e7e5e4;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible {
		outline: 2px solid #facc15;
		outline-offset: 2px;
	}
</style>
