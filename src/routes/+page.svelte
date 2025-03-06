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
	<div class="mt-10 flex w-full">
		<h1 class="mx-auto select-none font-dokdo text-5xl font-semibold uppercase text-stone-800 text-shadow-md sm:text-7xl sm:text-shadow-lg">
			caseplay.org
		</h1>
	</div>

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
									class="line-clamp-2 flex flex-row pb-1 text-xl font-bold leading-tight text-stone-800 transition-colors duration-300 group-hover:text-black sm:text-3xl"
								>
									<p>{casePlay.title}</p>

									<!-- START: YouTube Link -->
									{#if casePlay?.film}
										<a
											href={casePlay?.film}
											target="_blank"
											class="my-auto mb-1.5 ml-4 opacity-85 transition-transform duration-150 hover:scale-110 hover:opacity-100"
										>
											<img class="h-5" src="./../../src/lib/svg/youtube.svg" alt="youtube" />
										</a>
									{/if}
									<!-- END: YouTube Link -->
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
