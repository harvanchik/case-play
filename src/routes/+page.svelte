<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData, SubmitFunction } from './$types';
	import Icon from '@iconify/svelte';
	import Typewriter from 'svelte-typewriter';

	export let data: PageData;
	export let form: ActionData;

	let searchRef: HTMLInputElement;
	let searchQuery: string = '';

	export let isQuerying = false;

	const phrases = [
		'flag guarding',
		'roughing the passer',
		'touchdown',
		'fumble',
		'interception',
		'pass interference',
		'holding',
		'illegal forward pass',
		'illegal motion',
		'backward pass',
		'illegal shift',
		'illegal batting',
		'inadvertent whistle'
	];

	const sendQuery: SubmitFunction = (input) => {
		isQuerying = true;
		return async ({ update }) => {
			await update();
			isQuerying = false;
			searchRef.focus();
		};
	};

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
	<!-- START: Search Bar -->
	<section id="search">
		<div class="mt-16 flex flex-col space-y-3">
			<div class="flex flex-col space-y-2">
				<h1 class="mx-auto font-dokdo text-7xl font-semibold uppercase text-stone-800 text-shadow-lg">caseplay.org</h1>
				<form method="POST" action="?/search" use:enhance={sendQuery} class="flex">
					<div class="relative mx-auto flex w-[33%] items-center focus:w-[37%]">
						<input
							name="query"
							type="search"
							class="mx-auto h-12 w-full rounded-md border border-stone-400 bg-stone-200 px-3 text-lg shadow-lg transition-colors duration-300 ease-in-out placeholder:text-black/60 hover:bg-stone-300/60 hover:shadow-xl focus:border-stone-600 focus:bg-stone-300/80 focus:outline-none focus:ring-0 focus:drop-shadow-2xl"
							disabled={isQuerying}
							bind:this={searchRef}
							bind:value={searchQuery}
						/>
						<div class="absolute ml-3">
							<Typewriter mode="loopRandom" disabled={!!searchQuery} delay={500} interval={60} cursor={false}>
								{#each phrases as phrase}
									<span class="text-lg text-black/60">{phrase}</span>
								{/each}
							</Typewriter>
						</div>
						<!-- START: Query Input Box Icons -->
						{#if isQuerying}
							<!-- Loading Spinner -->
							<Icon icon="mdi:loading" height="25" class="absolute right-0 mx-3 flex animate-spin" />
						{:else}
							<!-- Search Icon -->
							<Icon icon="line-md:search-twotone" height="25" hFlip={true} class="absolute right-0 mx-3 flex" />
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
		<div class="mx-auto mt-5 flex max-h-[41rem] w-7/12 flex-col">
			{#if form?.casePlays && form?.casePlays.length > 0}
				<!-- START: Number of Results -->
				<span class="text-stone-600">{form?.casePlays?.length} case plays found</span>
				<!-- END: Number of Results -->
				<div
					class="mt-1 flex flex-col space-y-6 overflow-y-auto border border-stone-400 p-2 scrollbar scrollbar-track-stone-400 scrollbar-thumb-stone-900"
				>
					{#each form.casePlays as casePlay}
						<div
							class="group flex cursor-pointer flex-col space-y-2 border border-stone-300 px-4 py-2 transition-colors duration-300 hover:border-stone-400 hover:backdrop-blur-sm"
						>
							<div class="flex flex-row items-baseline justify-between">
								<a href="" class="line-clamp-1 text-3xl font-bold text-stone-800 transition-colors duration-300 group-hover:text-black"
									>{casePlay.title}</a
								>
								<div
									class="w-max rounded-full bg-opacity-80 px-2 py-0.5 text-sm text-white transition-colors duration-300 group-hover:bg-opacity-100"
									class:bg-green-600={casePlay.difficulty == 1}
									class:bg-yellow-400={casePlay.difficulty == 2}
									class:!text-black={casePlay.difficulty == 2}
									class:bg-red-600={casePlay.difficulty == 3}
								>
									{getDifficulty(casePlay.difficulty)}
								</div>
							</div>
							<div class="line-clamp-3 text-xl text-stone-600">{casePlay.prompt}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</section>
	<!-- END: Search Results -->
</main>
