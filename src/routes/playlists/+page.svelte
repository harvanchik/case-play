<script lang="ts">
	import type { PageData } from './$types';
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>Officiating Case-Play Playlists | caseplay.org</title>
	<meta name="description" content="Browse curated playlists of related officiating case plays for training sessions, clinics, and rules study." />
	<meta name="author" content="Jake Harvanchik" />
	<meta property="og:title" content="Officiating Case-Play Playlists" />
	<meta property="og:description" content="Browse curated groups of related case plays for officiating education." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen overflow-hidden bg-stone-100/[97%]">
	<PublicSiteNav />
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<section id="search">
		<div class="mt-10 flex flex-col space-y-3 sm:mt-16">
			<div class="flex flex-col space-y-2">
				<h1 class="font-dokdo mx-auto text-5xl font-semibold text-stone-800 uppercase select-none text-shadow-md sm:text-7xl sm:text-shadow-lg">
					playlists
				</h1>
			</div>
		</div>
	</section>

	<section id="results">
		<div class="mx-5 my-5 flex max-h-[41rem] flex-col sm:mx-auto sm:w-7/12">
			{#if data?.playlists && data?.playlists.length > 0}
				<span class="text-stone-600">{data?.playlists?.length} playlists found</span>
				<div class="mt-1 flex flex-col space-y-4 overflow-y-auto border border-stone-400 p-2">
					{#each data.playlists as playlist}
						<section class="group flex flex-col space-y-3 border border-stone-300 px-2 py-2 select-none sm:px-4 sm:py-3">
							<div class="flex flex-row items-start justify-start">
								<span
									id="title"
									class="line-clamp-2 pb-1 text-xl leading-tight font-bold text-stone-800 transition-colors duration-300 group-hover:text-black sm:line-clamp-1 sm:text-3xl"
								>
									{playlist.title}
								</span>
							</div>
							<p class="text-sm text-stone-600">{playlist.casePlays.length} case plays</p>
							{#if playlist.casePlays.length > 0}
								<ol class="space-y-2">
									{#each playlist.casePlays as casePlay}
										<li class="flex items-center justify-between border border-stone-200 bg-white/70 px-3 py-2 text-sm">
											<a href="/c/{casePlay.id}" class="font-semibold text-stone-800 hover:underline">
												{casePlay.position}. {casePlay.title}
											</a>
											<span class="text-stone-500">
												{casePlay.difficulty === 1 ? 'Easy' : casePlay.difficulty === 2 ? 'Moderate' : 'Hard'}
											</span>
										</li>
									{/each}
								</ol>
							{:else}
								<p class="text-sm text-stone-500">No case plays assigned yet.</p>
							{/if}
						</section>
					{/each}
				</div>
			{:else if data?.playlists}
				<div>No playlists yet.</div>
			{/if}
		</div>
	</section>
	<PublicSiteFooter />
</main>
