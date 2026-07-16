<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { replaceState } from '$app/navigation';
	import { updateFilterSearchParams } from '$lib/case-play-filter-state';
	import CasePlayCard from '$lib/components/CasePlayCard.svelte';
	import LandingPageAd from '$lib/components/LandingPageAd.svelte';

	export let data: PageData;

	let searchTerm = data.initialFilters.searchTerm;
	let searchRef: HTMLInputElement;
	let showCreateModal = false;
	let showDifficultyDropdown = false;
	let selectedDifficulties = data.initialFilters.difficulties;
	let resultColumns = 1;

	onMount(() => {
		const updateResultColumns = () => {
			resultColumns = window.matchMedia('(min-width: 1024px)').matches ? 3 : window.matchMedia('(min-width: 640px)').matches ? 2 : 1;
		};
		updateResultColumns();
		window.addEventListener('resize', updateResultColumns);
		return () => window.removeEventListener('resize', updateResultColumns);
	});

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
		syncFilterUrl();
	};

	const syncFilterUrl = () => {
		const url = new URL(window.location.href);
		url.search = updateFilterSearchParams(url.searchParams, searchTerm, selectedDifficulties).toString();
		replaceState(url, {});
	};

	const handleSearchInput = (event: Event) => {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
		syncFilterUrl();
	};

	$: activeFilterQuery = updateFilterSearchParams(new URLSearchParams(), searchTerm, selectedDifficulties).toString();

	$: filteredCasePlays = data?.casePlays?.filter((play) => {
		const matchesSearch =
			!searchTerm ||
			play.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			play.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
			play.ruleReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			play.edition?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			getDifficulty(play.difficulty).toLowerCase().includes(searchTerm.toLowerCase());

		const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(play.difficulty);

		return matchesSearch && matchesDifficulty;
	});

	$: casePlayGroups = Array.from(
		{ length: Math.ceil((filteredCasePlays?.length ?? 0) / (resultColumns * 2)) },
		(_, index) => (filteredCasePlays ?? []).slice(index * resultColumns * 2, (index + 1) * resultColumns * 2)
	);

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
</svelte:head>

<main class="flex min-h-screen flex-col overflow-hidden bg-stone-100/[97%]">
	<!-- Background -->
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<div class="mt-10 flex w-full flex-col items-center justify-center">
		<h1 class="font-dokdo mx-auto text-5xl font-semibold text-stone-800 uppercase select-none text-shadow-md sm:text-7xl sm:text-shadow-lg">
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
					class="absolute top-4 right-4 cursor-pointer text-stone-500 transition-colors hover:text-stone-800"
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
					<code class="cursor-pointer text-lg font-semibold text-stone-800 select-all">create@caseplay.org</code>
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
						on:input={handleSearchInput}
						type="search"
						id="search"
						class="block w-full border border-stone-300 bg-stone-50 p-4 pl-10 text-sm text-stone-900 focus:border-stone-500 focus:ring-stone-500"
						placeholder="Search case plays..."
						autocomplete="off"
					/>
				</div>
				<a
					href="/play-builder"
					class="flex cursor-pointer items-center justify-center border border-stone-300 bg-stone-50 px-4 text-stone-900 transition-colors duration-200 hover:bg-stone-100 hover:text-black focus:ring-2 focus:ring-stone-500"
					title="Open Play Builder"
					aria-label="Open Play Builder"
				>
					<Icon icon="material-symbols:construction" class="text-2xl" />
				</a>
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

				<div class="mt-1 grid max-h-[calc(100vh-16rem)] grid-cols-1 gap-4 overflow-y-auto border border-stone-400 p-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each casePlayGroups as group, groupIndex}
						{#each group as casePlay}
							<CasePlayCard {casePlay} href={`/c/${casePlay.id}${activeFilterQuery ? `?${activeFilterQuery}` : ''}`} />
						{/each}
						{#if groupIndex < casePlayGroups.length - 1}
							<LandingPageAd />
						{/if}
					{/each}
				</div>
			{:else if data?.casePlays}
				<div>No results found for "{searchTerm}"</div>
			{/if}
		</div>
	</section>
	<!-- END: Search Results -->

	<!-- START: Footer -->
	<footer class="mt-auto w-full py-3 text-center text-stone-600">
		<p class="text-sm">This database was created in 2023 by Jake Harvanchik for the purpose of training intramural officials.</p>
		<div class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
			<span>&copy; {new Date().getFullYear()} caseplay.org</span>
			<button on:click={() => (showCreateModal = true)} class="cursor-pointer font-semibold hover:underline">Contribute</button>
			<a href="mailto:contact@caseplay.org" target="_blank" class="cursor-pointer font-semibold hover:underline">Contact</a>
			<a href="/privacy" class="cursor-pointer font-semibold hover:underline">Privacy</a>
			<a href="/cookie-policy" class="cursor-pointer font-semibold hover:underline">Cookies</a>
		</div>
	</footer>
	<!-- END: Footer -->
</main>
