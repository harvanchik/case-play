<script lang="ts">
	import type { PageData } from './$types';
	import { casePlaysStore } from '$stores';
	import Time from 'svelte-time';
	import type { Unsubscriber } from 'svelte/store';
	import { onDestroy } from 'svelte';

	export let data: PageData;

	let casePlays: any; // define case plays

	casePlaysStore.set(data.casePlays); // set case plays globally

	// subscribe to the case plays store
	const casePlaySub: Unsubscriber = casePlaysStore.subscribe(value => {
		casePlays = value;
	});

	/**
	 * Convert difficulty number to string.
	 * @param difficulty Difficulty number.
	 * @returns difficulty string
	 */
	function getDifficulty(difficulty: number) {
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
	}

	// unsubscribe from the store when page navigated away from
	onDestroy(() => casePlaySub());
</script>

<svelte:head>
	<title>Case Plays</title>
	<script src="https://code.iconify.design/iconify-icon/1.0.3/iconify-icon.min.js"></script>
</svelte:head>

<main class="bg-stone-100 min-h-screen overflow-hidden">
	<section class="flex w-full flex-col space-y-6 py-10 lg:pt-20">
		<div class="flex flex-col space-y-2">
			<h1 class="mx-auto w-max border-b-4 border-stone-900 px-5 pb-3 text-5xl">Case Plays</h1>
			<h2 class="mx-auto w-max text-sm text-stone-700">
				created by <a
					href="https://jake.harvanchik.me"
					target="_blank"
					rel="noopener noreferrer"
					class="underline">Jake Harvanchik</a>
			</h2>
		</div>
		<div class="flex flex-col space-y-5 w-[90%] lg:w-5/12 mx-auto">
			{#each casePlays as casePlay}
				<a href="c/{casePlay.id}" data-sveltekit-preload-data="hover" class="group">
					<div
						class="p-3 flex-col space-y-2 flex cursor-pointer border-2 border-stone-900 bg-white group-hover:bg-stone-100/50 shadow-lg ">
						<span class="flex space-x-2">
							<h2
								class="mr-auto inline select-none text-lg font-semibold group-hover:text-xl transition-[font-size_150ms] duration-150 ease-out">
								{casePlay.name}
							</h2>
							<iconify-icon class="ml-auto" icon="noto:american-football" width="25" height="25" />
						</span>
						<span class="flex items-end">
							<span class="line-clamp-3 lg:line-clamp-3 w-9/12 lg:w-10/12">{casePlay.prompt}</span>
							<span class="flex flex-col ml-auto">
								<span
									class="ml-auto rounded-full text-sm w-max px-2 text-white bg-opacity-80 group-hover:bg-opacity-100 transition duration-150 ease-out"
									class:bg-green-600={casePlay.difficulty == 1}
									class:bg-yellow-400={casePlay.difficulty == 2}
									class:!text-black={casePlay.difficulty == 2}
									class:bg-red-600={casePlay.difficulty == 3}
									>{getDifficulty(casePlay.difficulty)}</span>
								<!-- <span>{dayjs().format()}</span> -->
								<Time
									class="text-sm ml-auto font-semibold mt-1"
									relative
									timestamp={casePlay.dateCreated} />
							</span>
						</span>
					</div>
				</a>
			{/each}
		</div>
	</section>
</main>
