<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
</script>

<svelte:head>
	<title>Play Builder | caseplay.org</title>
	<meta name="description" content="Build a flag football play on a full-screen field diagram." />
</svelte:head>

<main class="relative isolate min-h-screen w-full overflow-x-hidden bg-stone-100 p-4">
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-[url(/svg/graph.svg)]"></div>
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-stone-100/[97%]"></div>
	<div class="relative z-10 grid w-full grid-cols-1 items-stretch gap-4 lg:absolute lg:inset-4 lg:w-auto lg:grid-cols-[minmax(0,1fr)_clamp(180px,18vw,300px)]" style="min-height: calc(100vh - 2rem);">
		<div class="flex min-w-0 items-center justify-start">
			<div class="min-w-0 lg:relative" style="width: min(100%, calc((100vh - 4rem) * 2.1));">
				<FlagFootballPlayBuilder />
				<div class="lg:absolute lg:inset-x-0 lg:top-full">
					<PlayBuilderAttribution />
				</div>
			</div>
		</div>
		<div class="flex min-w-0 items-center justify-center">
			<PlayBuilderAd />
		</div>
	</div>
</main>
