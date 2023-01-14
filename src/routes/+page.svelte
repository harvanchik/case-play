<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: ({ casePlays } = data); // deconstruct data into casePlays
</script>

<main class="bg-stone-100 min-h-screen overflow-hidden">
	<section class="flex w-full flex-col space-y-6 py-10 lg:pt-40">
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
		<grid class="mx-auto grid grid-cols-3 text-lg text-stone-900 lg:grid-cols-5 lg:px-3">
			{#each casePlays as casePlay}
				<a href="c/{casePlay.id}" data-sveltekit-preload-data="hover">
					<div
						class="mx-3 mb-3 flex w-20 cursor-pointer border-2 border-stone-900 bg-white shadow-lg transition duration-150 ease-out hover:scale-105 hover:bg-stone-200 active:bg-stone-300">
						<span class="mx-auto select-none">{casePlay.id}</span>
					</div>
				</a>
			{/each}
		</grid>
	</section>
</main>
