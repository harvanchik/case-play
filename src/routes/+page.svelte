<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import Typewriter from 'svelte-typewriter';

	export let data: PageData;

	let searchTerm = '';
	let searchRef: HTMLInputElement;
	let showCreateModal = false;

	$: filteredCasePlays = data?.casePlays?.filter((play) => {
		if (!searchTerm) return true;
		const term = searchTerm.toLowerCase();
		return (
			play.title.toLowerCase().includes(term) ||
			play.prompt.toLowerCase().includes(term) ||
			getDifficulty(play.difficulty).toLowerCase().includes(term)
		);
	});

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

	<!-- START: Create Modal -->
	{#if showCreateModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm transition-opacity"
			on:click|self={() => (showCreateModal = false)}
			on:keydown={(e) => e.key === 'Escape' && (showCreateModal = false)}
			role="button"
			tabindex="0"
		>
			<div
				class="relative mx-4 flex w-full max-w-lg flex-col rounded-lg border border-stone-400 bg-stone-100 p-6 shadow-2xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<button
					class="absolute right-4 top-4 cursor-pointer text-stone-500 transition-colors hover:text-stone-800"
					on:click={() => (showCreateModal = false)}
					aria-label="Close modal"
				>
					<Icon icon="material-symbols:close" class="text-2xl" />
				</button>

				<h2 id="modal-title" class="mb-4 text-2xl font-bold text-stone-800">Contribute</h2>

				<p class="mb-6 text-lg text-stone-700">
					In order to add a case play to this database, please contact Jake Harvanchik. Your contribution is greatly appreciated!
				</p>

				<div class="mb-6 flex flex-row items-center justify-center space-x-2 rounded-md bg-stone-200 p-3">
					<Icon icon="material-symbols:mail" class="text-xl text-stone-600" />
					<code class="cursor-pointer select-all text-lg font-semibold text-stone-800">create@caseplay.org</code>
				</div>

				<div class="flex flex-row justify-end space-x-3">
					<button
						class="cursor-pointer rounded-md border border-stone-300 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-200"
						on:click={() => (showCreateModal = false)}
					>
						Close
					</button>
					<a
						href="mailto:create@caseplay.org"
						target="_blank"
						class="rounded-md bg-stone-800 px-4 py-2 text-white transition-colors hover:bg-stone-900 focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
					>
						Contact
					</a>
				</div>
			</div>
		</div>
	{/if}
	<!-- END: Create Modal -->

	<!-- START: Search Results -->
	<section id="results">
		<div class="mx-5 my-5 flex max-h-[41rem] flex-col sm:mx-auto sm:w-11/12">
			<!-- START: Search Bar -->
			<div class="mb-4 flex flex-row space-x-2">
				<div class="relative flex w-full flex-row items-center">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<Icon icon="material-symbols:search" class="text-2xl text-stone-500" />
					</div>
					<input
						bind:this={searchRef}
						bind:value={searchTerm}
						type="search"
						id="search"
						class="block w-full rounded-lg border border-stone-300 bg-stone-50 p-4 pl-10 text-sm text-stone-900 focus:border-stone-500 focus:ring-stone-500"
						placeholder="Search case plays..."
						autocomplete="off"
					/>
				</div>
				<button
					class="flex cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-stone-50 px-4 text-stone-900 transition-colors duration-200 hover:bg-stone-100 hover:text-black focus:ring-2 focus:ring-stone-500"
					on:click={() => (showCreateModal = true)}
					title="Add Case Play"
				>
					<Icon icon="material-symbols:add" class="text-2xl" />
				</button>
			</div>
			<!-- END: Search Bar -->

			{#if filteredCasePlays && filteredCasePlays.length > 0}
				<!-- START: Number of Results -->
				<span class="mb-2 text-stone-600">{filteredCasePlays.length} case plays found</span>
				<!-- END: Number of Results -->
				<div
					class="mt-1 grid max-h-[calc(100vh-16rem)] grid-cols-1 gap-4 overflow-y-auto border border-stone-400 p-2 scrollbar scrollbar-track-stone-400 scrollbar-thumb-stone-900 sm:grid-cols-2 lg:grid-cols-3"
				>
					{#each filteredCasePlays as casePlay}
						<a
							href="c/{casePlay.id}"
							class="group flex cursor-pointer select-none flex-col space-y-1 border border-stone-300 px-2 py-1 transition-colors duration-300 hover:border-stone-400 hover:backdrop-blur-sm sm:px-4 sm:py-2"
						>
							<div class="flex flex-row items-start justify-between sm:items-center">
								<div
									id="title"
									class="line-clamp-2 flex flex-row pb-1 text-xl font-bold leading-tight text-stone-800 transition-colors duration-300 group-hover:text-black sm:text-2xl"
								>
									<p>{casePlay.title}</p>

									<!-- START: YouTube Link -->
									{#if casePlay?.film}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<div
											on:click|preventDefault={() => window.open(casePlay.film, '_blank')}
											class="my-auto mb-1.5 ml-4 cursor-pointer opacity-85 transition-transform duration-150 hover:scale-110 hover:opacity-100"
										>
											<img class="h-5" src="./../../src/lib/svg/youtube.svg" alt="youtube" />
										</div>
									{/if}
									<!-- END: YouTube Link -->
								</div>
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
							<div id="prompt" class="line-clamp-6 text-base leading-tight text-stone-600 sm:line-clamp-5 sm:text-lg sm:leading-snug">
								{casePlay.prompt}
							</div>
						</a>
					{/each}
				</div>
			{:else if data?.casePlays}
				<div>No results found for "{searchTerm}"</div>
			{/if}
		</div>
	</section>
	<!-- END: Search Results -->
</main>
