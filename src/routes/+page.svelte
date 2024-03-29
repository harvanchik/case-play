<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import Typewriter from 'svelte-typewriter';

	export let data: PageData;

	let searchRef: HTMLInputElement;

	/**
	 * Returns the difficulty of the case play (i.e., Easy, Moderate, Hard)
	 * @param difficulty difficulty number
	 * @returns difficulty in English as string
	 */
	const getDifficulty = (difficulty: number) => {
		switch (difficulty) {
			case 1:
				return 'Easy';
			case 2:
				return 'Moderate';
			case 3:
				return 'Hard';
			default:
				return 'Unknown';
		}
	};

	onMount(() => {
		searchRef.focus();
	});
</script>

<svelte:head>
	<title>Case Plays</title>
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
					caseplay.org
				</h1>
				<form
					method="POST"
					action="?/search"
					use:enhance={() => {
						data.isQuerying = true;
					}}
					class="flex"
				>
					<div class="group relative mx-5 flex w-full items-center focus:w-[37%] sm:mx-auto sm:w-1/3">
						<input
							name="query"
							type="search"
							class="mx-auto h-12 w-full rounded-md border border-stone-400 bg-stone-200 px-3 text-lg shadow-lg transition-colors duration-300 ease-in-out placeholder:text-black/60 group-hover:bg-stone-300/60 group-hover:shadow-xl focus:border-stone-600 focus:bg-stone-300/80 focus:outline-none focus:ring-0 focus:drop-shadow-2xl"
							disabled={data.isQuerying}
							bind:this={searchRef}
							bind:value={data.searchQuery}
						/>
						<div class="pointer-events-none absolute ml-[14px]">
							<Typewriter mode="loopRandom" disabled={!!data.searchQuery} delay={500} interval={60} cursor={false}>
								{#each data.phrases as phrase}
									<span class="cursor-text select-none text-lg text-black/60">{phrase}</span>
								{/each}
							</Typewriter>
						</div>
						<!-- START: Query Input Box Icons -->
						{#if data.isQuerying}
							<!-- Loading Spinner -->
							<Icon icon="mdi:loading" height="25" class="absolute right-0 mx-3 flex animate-spin cursor-wait" />
						{:else}
							<!-- Search Icon -->
							<Icon icon="line-md:search-twotone" height="25" hFlip={true} class="absolute right-0 mx-3 flex cursor-pointer" />
						{/if}
						<!-- END: Query Input Box Icons -->
					</div>
				</form>
			</div>
		</div>
	</section>
	<!-- END: Search Bar -->

	<!-- START: Search Results -->
	<section id="results">
		<div class="mx-5 my-5 flex max-h-[41rem] flex-col sm:mx-auto sm:w-7/12">
			{#if data?.casePlays && data?.casePlays.length > 0}
				<!-- START: Number of Results -->
				<span class="text-stone-600">{data?.casePlays?.length} case plays found</span>
				<!-- END: Number of Results -->
				<div
					class="mt-1 flex flex-col space-y-4 overflow-y-auto border border-stone-400 p-2 scrollbar scrollbar-track-stone-400 scrollbar-thumb-stone-900"
				>
					{#each data.casePlays as casePlay}
						<a
							href="c/{casePlay.id}"
							class="group flex cursor-pointer select-none flex-col space-y-1 border border-stone-300 px-2 py-1 transition-colors duration-300 hover:border-stone-400 hover:backdrop-blur-sm sm:px-4 sm:py-2"
						>
							<div class="flex flex-row items-start justify-between sm:items-center">
								<a
									id="title"
									class="line-clamp-2 pb-1 text-xl font-bold leading-tight text-stone-800 transition-colors duration-300 group-hover:text-black sm:line-clamp-1 sm:text-3xl"
								>
									{casePlay.title}
								</a>
								<div
									class="mt-1 w-max rounded-full bg-opacity-80 px-2 py-0.5 text-xs text-white transition-colors duration-300 group-hover:bg-opacity-100 sm:mt-0 sm:text-sm"
									class:bg-green-600={casePlay.difficulty == 1}
									class:bg-yellow-400={casePlay.difficulty == 2}
									class:!text-black={casePlay.difficulty == 2}
									class:bg-red-600={casePlay.difficulty == 3}
								>
									{getDifficulty(casePlay.difficulty)}
								</div>
							</div>
							<div id="prompt" class="line-clamp-4 text-base leading-tight text-stone-600 sm:line-clamp-3 sm:text-xl sm:leading-snug">
								{casePlay.prompt}
							</div>
						</a>
					{/each}
				</div>
			{:else if data?.casePlays}
				<div>No results</div>
			{/if}
		</div>
	</section>
	<!-- END: Search Results -->
</main>
