<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Shared Play | caseplay.org</title>
	<meta name="description" content="View and edit a shared NIRSA flag football play diagram." />
</svelte:head>

<main class="relative flex min-h-screen w-full items-center justify-center bg-stone-100/[97%] p-4 pt-[7.5rem]">
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<div class="absolute right-4 top-4">
		<PlayBuilderAd />
	</div>
	<div class="w-full" style="max-width: min(96vw, calc((100vh - 9.5rem) * 2.1));">
		<FlagFootballPlayBuilder initialDocument={data.initialDocument} savedPlayId={data.playId} />
		<PlayBuilderAttribution />
	</div>
</main>
