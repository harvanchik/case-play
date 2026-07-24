<script lang="ts">
	import { goto } from '$app/navigation';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let playBuilderId = data.requestedId;
	let selectedPlay = data.activePlayNumber;
	let loadedPreview = `${data.requestedId}:${data.activePlayNumber}`;

	$: if (`${data.requestedId}:${data.activePlayNumber}` !== loadedPreview) {
		loadedPreview = `${data.requestedId}:${data.activePlayNumber}`;
		playBuilderId = data.requestedId;
		selectedPlay = data.activePlayNumber;
	}

	const loadPreview = async () => {
		const params = new URLSearchParams();
		const id = playBuilderId.trim();
		if (id) params.set('id', id);
		params.set('play', String(selectedPlay));
		await goto(`/play-builder/social-preview?${params.toString()}`, { keepFocus: true, noScroll: true });
	};
</script>

<svelte:head>
	<title>Social Image Studio | CasePlay.org</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<PublicSiteNav />
<main class="min-h-screen bg-stone-100 p-4 text-stone-900">
	<div class="mx-auto max-w-[1800px]">
		<header class="mb-4 border-2 border-stone-900 bg-white p-4 shadow-md">
			<h1 class="font-dokdo text-4xl leading-none font-semibold tracking-wide uppercase">Social Image Studio</h1>
			<p class="mt-1 max-w-4xl text-sm text-stone-600">
				Preview the exact PNG renderer used by shared links. Changes to <code>src/lib/server/play-builder-social-image.ts</code> appear here and directly
				affect every generated social image.
			</p>
		</header>

		<form on:submit|preventDefault={loadPreview} class="mb-4 flex flex-wrap items-end gap-3 border-2 border-stone-900 bg-white p-3 shadow-md">
			<label class="min-w-64 flex-1 text-xs font-black tracking-wide uppercase">
				Play Builder ID
				<input
					bind:value={playBuilderId}
					maxlength="12"
					placeholder="Enter a 12-character ID"
					class="mt-1 block h-10 w-full border-2 border-stone-500 px-3 font-mono text-sm normal-case focus:border-stone-950 focus:outline-none"
				/>
			</label>
			<button type="submit" class="h-10 cursor-pointer bg-stone-900 px-5 text-sm font-black text-white hover:bg-stone-700">Load Play</button>
			<a
				href={data.imageUrl}
				target="_blank"
				rel="noreferrer"
				class="flex h-10 items-center border-2 border-stone-900 bg-white px-5 text-sm font-black hover:bg-stone-100"
			>
				Open Actual PNG
			</a>
		</form>

		{#if data.message}
			<p class="mb-4 border-2 border-red-700 bg-red-50 p-3 text-sm font-bold text-red-800">{data.message}</p>
		{/if}

		<section class="border-2 border-stone-900 bg-stone-800 p-3 shadow-lg">
			<div class="mb-2 flex items-center justify-between gap-4 text-white">
				<h2 class="text-sm font-black tracking-wide uppercase">Live 1200 × 630 Preview</h2>
				<label class="flex items-center gap-2 text-xs font-black tracking-wide uppercase">
					Play
					<input
						type="number"
						bind:value={selectedPlay}
						min="1"
						max={Math.max(1, data.playCount)}
						on:change={loadPreview}
						class="h-8 w-20 border-2 border-white bg-white px-2 text-sm text-stone-950 focus:outline-2 focus:outline-white"
					/>
					<span class="text-stone-300">of {data.playCount}</span>
				</label>
			</div>
			<div class="aspect-[1200/630] w-full overflow-hidden border-2 border-white bg-stone-200">
				<img src={data.imageUrl} alt={`Social image preview for play ${data.activePlayNumber}`} class="block h-full w-full object-contain" />
			</div>
		</section>
	</div>
</main>
