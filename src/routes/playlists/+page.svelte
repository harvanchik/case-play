<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Playlists</title>
	<meta name="description" content="Sports case play database for referee education" />
	<meta
		name="keywords"
		content="case,play,plays,db,database,sports,intramural,extramural,official,referee,education,learning,training,flag,tackle,football,basketball,baseball,soccer,volleyball,ice,roller,hockey,flash,cards,coach,player,umpire,ref,ump,zebra,stripes,whistle,rule,rules,interpretation,rule book,edition,spoiler,tool"
	/>
	<meta name="author" content="Jake Harvanchik" />
	<script src="https://code.iconify.design/iconify-icon/1.0.3/iconify-icon.min.js"></script>
</svelte:head>

<main class="min-h-screen overflow-hidden bg-stone-100/[97%] scrollbar scrollbar-track-stone-800 scrollbar-thumb-black">
	<!-- Background -->
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<!-- START: Search Bar -->
	<section id="search">
		<div class="mt-10 flex flex-col space-y-3 sm:mt-16">
			<div class="flex flex-col space-y-2">
				<h1 class="mx-auto select-none font-dokdo text-5xl font-semibold uppercase text-stone-800 text-shadow-md sm:text-7xl sm:text-shadow-lg">
					playlists
				</h1>
			</div>
		</div>
	</section>
	<!-- END: Search Bar -->

	<!-- START: Search Results -->
	<section id="results">
		<div class="mx-5 my-5 flex max-h-[41rem] flex-col sm:mx-auto sm:w-7/12">
			{#if data?.playlists && data?.playlists.length > 0}
				<!-- START: Number of Results -->
				<span class="text-stone-600">{data?.playlists?.length} case plays found</span>
				<!-- END: Number of Results -->
				<div
					class="mt-1 flex flex-col space-y-4 overflow-y-auto border border-stone-400 p-2 scrollbar scrollbar-track-stone-400 scrollbar-thumb-stone-900"
				>
					{#each data.playlists as playlist}
						<a
							href="c/{playlist.id}"
							class="group flex cursor-pointer select-none flex-col space-y-1 border border-stone-300 px-2 py-1 transition-colors duration-300 hover:border-stone-400 hover:backdrop-blur-sm sm:px-4 sm:py-2"
						>
							<div class="flex flex-row items-start justify-between sm:items-center">
								<span
									id="title"
									class="line-clamp-2 pb-1 text-xl font-bold leading-tight text-stone-800 transition-colors duration-300 group-hover:text-black sm:line-clamp-1 sm:text-3xl"
								>
									{playlist.title}
								</span>
							</div>
						</a>
					{/each}
				</div>
			{:else if data?.playlists}
				<div>No results</div>
			{/if}
		</div>
	</section>
	<!-- END: Search Results -->
</main>
