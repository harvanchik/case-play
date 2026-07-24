<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { updateFilterSearchParams } from '$lib/case-play-filter-state';
	import CasePlayCard from '$lib/components/CasePlayCard.svelte';
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';

	export let data: PageData;

	let searchTerm = data.initialFilters.searchTerm;
	let searchRef: HTMLInputElement;
	let showCreateModal = false;
	let showDifficultyDropdown = false;
	let selectedDifficulties = data.initialFilters.difficulties;
	let navigationTimer: ReturnType<typeof setTimeout> | undefined;
	const websiteStructuredData = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'CasePlay.org',
		url: 'https://caseplay.org/',
		description: 'A searchable case play database and flag football play builder for referee education.',
		author: { '@type': 'Person', name: 'Jake Harvanchik' }
	}).replace(/</g, '\\u003c');

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

	const syncFilterUrl = (resetPage = true) => {
		const url = new URL(window.location.href);
		url.search = updateFilterSearchParams(url.searchParams, searchTerm, selectedDifficulties).toString();
		if (resetPage) url.searchParams.delete('page');
		clearTimeout(navigationTimer);
		navigationTimer = setTimeout(() => {
			void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
		}, 250);
	};

	const handleSearchInput = (event: Event) => {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
		syncFilterUrl();
	};

	$: activeFilterParams = updateFilterSearchParams(new URLSearchParams(), searchTerm, selectedDifficulties);
	$: if (data.pagination.currentPage > 1) activeFilterParams.set('page', String(data.pagination.currentPage));
	$: activeFilterQuery = activeFilterParams.toString();
	const pageHref = (pageNumber: number) => {
		const params = updateFilterSearchParams(new URLSearchParams(), searchTerm, selectedDifficulties);
		if (pageNumber > 1) params.set('page', String(pageNumber));
		return `/${params.size ? `?${params}` : ''}`;
	};

	$: filteredCasePlays = data?.casePlays ?? [];

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
	<title>Flag Football Case Plays and Play Builder | CasePlay.org</title>
	<meta
		name="description"
		content="Study searchable flag football officiating case plays and create shareable diagrams with a field play builder made for referee education."
	/>
	<meta name="author" content="Jake Harvanchik" />
	<meta property="og:title" content="Flag Football Case Plays and Play Builder" />
	<meta property="og:description" content="Study officiating scenarios and build shareable flag football play diagrams." />
	<meta property="og:type" content="website" />
	{@html `<script type="application/ld+json">${websiteStructuredData}<\/script>`}
</svelte:head>

<main class="flex min-h-screen flex-col overflow-hidden bg-stone-100/[97%]">
	<PublicSiteNav />
	<!-- Background -->
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<div class="mt-10 flex w-full flex-col items-center justify-center">
		<h1 class="font-dokdo mx-auto text-5xl font-semibold text-stone-800 select-none text-shadow-md sm:text-7xl sm:text-shadow-lg">CASEPLAY.ORG</h1>
		<p class="font-neucha text-xl text-stone-600 sm:text-2xl">a case play database and play builder created by Jake Harvanchik</p>
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
				<div class="play-builder-launch relative flex shrink-0">
					<span
						class="pointer-events-none absolute -top-2 -right-2 z-10 border border-stone-900 bg-red-600 px-1.5 py-0.5 text-[0.6rem] leading-none font-black tracking-wide text-white"
						aria-hidden="true">NEW</span
					>
					<a
						href="/play-builder"
						class="flex cursor-pointer items-center justify-center border border-stone-300 bg-stone-50 px-4 text-stone-900 transition-colors duration-200 hover:bg-stone-100 hover:text-black focus:ring-2 focus:ring-stone-500"
						title="Open Play Builder"
						aria-label="Open Play Builder — New"
					>
						<Icon icon="material-symbols:construction" class="text-2xl" />
					</a>
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
					<span class="text-stone-600">{data.pagination.total} case plays found</span>

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
					{#each filteredCasePlays as casePlay}
						<CasePlayCard {casePlay} href={`/c/${casePlay.id}${activeFilterQuery ? `?${activeFilterQuery}` : ''}`} />
					{/each}
				</div>
				{#if data.pagination.pageCount > 1}
					<nav class="mt-3 flex items-center justify-center gap-2 text-sm font-semibold" aria-label="Case play pages">
						<a
							href={pageHref(data.pagination.currentPage - 1)}
							aria-disabled={data.pagination.currentPage === 1}
							class="border border-stone-400 bg-white px-3 py-1.5 hover:bg-stone-100 aria-disabled:pointer-events-none aria-disabled:opacity-40"
							>Previous</a
						>
						<span>Page {data.pagination.currentPage} of {data.pagination.pageCount}</span>
						<a
							href={pageHref(data.pagination.currentPage + 1)}
							aria-disabled={data.pagination.currentPage === data.pagination.pageCount}
							class="border border-stone-400 bg-white px-3 py-1.5 hover:bg-stone-100 aria-disabled:pointer-events-none aria-disabled:opacity-40"
							>Next</a
						>
					</nav>
				{/if}
			{:else if data?.casePlays}
				<div>No results found for "{searchTerm}"</div>
			{/if}
		</div>
	</section>
	<!-- END: Search Results -->

	<PublicSiteFooter context="database" />
</main>

<style>
	.play-builder-launch {
		transform-origin: bottom center;
		animation: dock-bounce 2.6s ease-in-out infinite;
	}

	@keyframes dock-bounce {
		0%,
		46%,
		100% {
			transform: translateY(0);
		}
		10% {
			transform: translateY(-0.75rem);
		}
		19% {
			transform: translateY(0);
		}
		27% {
			transform: translateY(-0.4rem);
		}
		34% {
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.play-builder-launch {
			animation: none;
		}
	}
</style>
