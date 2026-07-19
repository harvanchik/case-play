<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	let isReady = false;
	let isDesktop = false;

	onMount(() => {
		const desktopQuery = window.matchMedia('(min-width: 1024px)');
		const updateViewport = () => {
			isDesktop = desktopQuery.matches;
			isReady = true;
		};

		updateViewport();
		desktopQuery.addEventListener('change', updateViewport);
		return () => desktopQuery.removeEventListener('change', updateViewport);
	});
</script>

{#if isReady}
	{#if isDesktop}
		<slot />
	{:else}
		<section class="relative z-10 flex min-h-[calc(100vh-6rem)] w-full items-center justify-center px-5 py-12 text-center">
			<div class="w-full max-w-lg border-2 border-stone-900 bg-white p-7 shadow-lg">
				<Icon icon="material-symbols:desktop-windows-outline" class="mx-auto mb-3 text-5xl text-stone-700" aria-hidden="true" />
				<h1 class="text-2xl font-black text-stone-900">Desktop Screen Required</h1>
				<p class="mt-2 text-base leading-relaxed text-stone-600">
					The Flag Football Play Builder is only accessible on a desktop screen.
				</p>
				<a
					href="/"
					class="mt-5 inline-flex border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
				>
					Return to Case Plays
				</a>
			</div>
		</section>
	{/if}
{/if}
