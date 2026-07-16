<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
</script>

<svelte:head>
	<title>Play Builder | caseplay.org</title>
	<meta name="description" content="Build a flag football play on a full-screen field diagram." />
</svelte:head>

<main class="relative flex min-h-screen w-full items-center justify-center bg-stone-100/[97%] p-4 pt-[7.5rem]">
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<div class="absolute right-4 top-4">
		<PlayBuilderAd />
	</div>
	<div class="w-full" style="max-width: min(96vw, calc((100vh - 9.5rem) * 2.1));">
		<FlagFootballPlayBuilder />
		<PlayBuilderAttribution />
	</div>
</main>
