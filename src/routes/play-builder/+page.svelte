<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
</script>

<svelte:head>
	<title>Play Builder | caseplay.org</title>
	<meta name="description" content="Build a flag football play on a full-screen field diagram." />
</svelte:head>

<main class="relative min-h-screen w-full bg-stone-100/[97%] p-4">
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<div class="grid min-h-[calc(100vh-2rem)] w-full grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_clamp(180px,18vw,300px)]">
		<div class="min-w-0 justify-self-start" style="width: min(100%, calc((100vh - 4rem) * 2.1));">
			<FlagFootballPlayBuilder />
			<PlayBuilderAttribution />
		</div>
		<PlayBuilderAd />
	</div>
</main>
