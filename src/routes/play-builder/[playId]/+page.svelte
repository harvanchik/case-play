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

<main class="relative isolate min-h-screen w-full overflow-x-hidden bg-stone-100 p-4">
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-[url(/svg/graph.svg)]"></div>
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-stone-100/[97%]"></div>
	<div
		class="relative z-10 grid w-full grid-cols-1 items-stretch gap-4 lg:absolute lg:inset-4 lg:w-auto lg:grid-cols-[minmax(0,1fr)_clamp(180px,18vw,300px)]"
		style="min-height: calc(100vh - 2rem);"
	>
		<div class="flex min-w-0 items-center justify-start">
			<div class="min-w-0 lg:relative" style="width: min(100%, calc((100vh - 4rem) * 2.1));">
				<h1
					class="font-dokdo pb-1 text-center text-[4rem] font-semibold tracking-[0.04em] text-stone-800 uppercase select-none text-shadow-md sm:text-[4.25rem] lg:absolute lg:inset-x-0 lg:bottom-full"
				>
					Flag Football Play Builder
				</h1>
				<FlagFootballPlayBuilder initialDocument={data.initialDocument} savedPlayId={data.playId} />
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
