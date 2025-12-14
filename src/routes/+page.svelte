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
	let showDifficultyDropdown = false;
	let selectedDifficulties: number[] = [];

	const difficultyOptions = [
		{ value: 1, label: 'Easy', color: 'bg-green-600' },
		{ value: 2, label: 'Moderate', color: 'bg-yellow-400 text-black' },
		{ value: 3, label: 'Hard', color: 'bg-red-600' }
	];

	const toggleDifficulty = (value: number) => {
		if (selectedDifficulties.includes(value)) {
			selectedDifficulties = selectedDifficulties.filter((d) => d !== value);
		} else {
			selectedDifficulties = [...selectedDifficulties, value];
		}
	};

	$: filteredCasePlays = data?.casePlays?.filter((play) => {
		const matchesSearch =
			!searchTerm ||
			play.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			play.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
			getDifficulty(play.difficulty).toLowerCase().includes(searchTerm.toLowerCase());

		const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(play.difficulty);

		return matchesSearch && matchesDifficulty;
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

<main class="flex min-h-screen flex-col overflow-hidden bg-stone-100/[97%] scrollbar scrollbar-track-stone-800 scrollbar-thumb-black">
	<!-- Background -->
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<div class="mt-10 flex w-full flex-col items-center justify-center">
		<h1 class="mx-auto select-none font-dokdo text-5xl font-semibold uppercase text-stone-800 text-shadow-md sm:text-7xl sm:text-shadow-lg">
			caseplay.org
		</h1>
		<p class="font-neucha text-xl text-stone-600 sm:text-2xl">a case play database created by Jake Harvanchik</p>
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
				class="relative mx-4 flex w-full max-w-lg flex-col border border-stone-400 bg-stone-100 p-6 shadow-2xl"
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

				<div class="mb-6 flex flex-row items-center justify-center space-x-2 bg-stone-200 p-3">
					<Icon icon="material-symbols:mail" class="text-xl text-stone-600" />
					<code class="cursor-pointer select-all text-lg font-semibold text-stone-800">create@caseplay.org</code>
				</div>

				<div class="flex flex-row justify-end space-x-3">
					<button
						class="cursor-pointer border border-stone-300 px-4 py-2 text-stone-700 transition-colors hover:bg-stone-200"
						on:click={() => (showCreateModal = false)}
					>
						Close
					</button>
					<a
						href="mailto:create@caseplay.org"
						target="_blank"
						class="bg-stone-800 px-4 py-2 text-white transition-colors hover:bg-stone-900 focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
					>
						Contact
					</a>
				</div>
			</div>
		</div>
	{/if}
	<!-- END: Create Modal -->

	<!-- START: Search Results -->
	<section id="results" class="flex-grow">
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
						class="block w-full border border-stone-300 bg-stone-50 p-4 pl-10 text-sm text-stone-900 focus:border-stone-500 focus:ring-stone-500"
						placeholder="Search case plays..."
						autocomplete="off"
					/>
				</div>
				<button
					class="flex cursor-pointer items-center justify-center border border-stone-300 bg-stone-50 px-4 text-stone-900 transition-colors duration-200 hover:bg-stone-100 hover:text-black focus:ring-2 focus:ring-stone-500"
					on:click={() => (showCreateModal = true)}
					title="Add Case Play"
				>
					<Icon icon="material-symbols:add" class="text-2xl" />
				</button>
			</div>
			<!-- END: Search Bar -->

			{#if filteredCasePlays && filteredCasePlays.length > 0}
				<!-- START: Results Header -->
				<div class="mb-2 flex flex-row items-center justify-between">
					<span class="text-stone-600">{filteredCasePlays.length} case plays found</span>

					<!-- START: Filter Bar -->
					<div class="relative">
						<button
							class="flex cursor-pointer flex-row items-center space-x-1 border border-stone-300 bg-stone-50 px-2 py-0.5 text-sm text-stone-700 hover:bg-stone-100 focus:ring-2 focus:ring-stone-500"
							on:click={() => (showDifficultyDropdown = !showDifficultyDropdown)}
						>
							<span>Filter Difficulty</span>
							<Icon icon="material-symbols:filter-list" class="text-lg" />
						</button>

						{#if showDifficultyDropdown}
							<div
								class="absolute right-0 z-10 mt-2 w-48 border border-stone-200 bg-white p-2 shadow-lg"
								on:mouseleave={() => (showDifficultyDropdown = false)}
								role="group"
							>
								{#each difficultyOptions as option}
									<button
										class="flex w-full cursor-pointer items-center space-x-2 px-2 py-1.5 hover:bg-stone-100"
										on:click={() => toggleDifficulty(option.value)}
									>
										<div
											class={`flex h-4 w-4 items-center justify-center border ${selectedDifficulties.includes(option.value) ? 'border-stone-600 bg-stone-600' : 'border-stone-400'}`}
										>
											{#if selectedDifficulties.includes(option.value)}
												<Icon icon="material-symbols:check-small" class="text-white" />
											{/if}
										</div>
										<span class={`px-2 py-0.5 text-xs text-white ${option.color} ${option.value === 2 ? '!text-black' : ''}`}>
											{option.label}
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<!-- END: Filter Bar -->
				</div>
				<!-- END: Results Header -->

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
									class="line-clamp-2 flex flex-1 flex-row pb-1 text-xl font-bold leading-tight text-stone-800 transition-colors duration-300 group-hover:text-black sm:text-2xl"
								>
									<p>{casePlay.title}</p>
								</div>

								<div class="ml-2 flex flex-shrink-0 flex-row items-center space-x-2">
									<!-- START: YouTube Link -->
									{#if casePlay?.film}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<!-- svelte-ignore a11y-no-static-element-interactions -->
										<div
											on:click|preventDefault={() => window.open(casePlay.film, '_blank')}
											class="cursor-pointer opacity-85 transition-transform duration-150 hover:scale-110 hover:opacity-100"
										>
											<img class="h-5" src="./../../src/lib/svg/youtube.svg" alt="youtube" />
										</div>
									{/if}
									<!-- END: YouTube Link -->

									<div
										class="w-max bg-opacity-80 px-2 py-0.5 text-xs text-white transition-colors duration-300 group-hover:bg-opacity-100 sm:text-sm"
										class:bg-green-600={casePlay.difficulty == 1}
										class:bg-yellow-400={casePlay.difficulty == 2}
										class:!text-black={casePlay.difficulty == 2}
										class:bg-red-600={casePlay.difficulty == 3}
									>
										{getDifficulty(casePlay.difficulty)}
									</div>
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

	<!-- START: Footer -->
	<footer class="mt-auto w-full py-6 text-center text-stone-600">
		<div class="mb-2">
			<p class="text-sm">This database was created in 2023 for the purpose of training intramural officials.</p>
		</div>
		<div class="flex flex-row justify-center space-x-4 text-sm font-semibold">
			<span>&copy; {new Date().getFullYear()} caseplay.org</span>
			<button on:click={() => (showCreateModal = true)} class="cursor-pointer hover:underline">Contribute</button>
			<a href="mailto:contact@caseplay.org" target="_blank" class="cursor-pointer hover:underline">Contact</a>
		</div>
	</footer>
	<!-- END: Footer -->
</main>
