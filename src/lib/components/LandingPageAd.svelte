<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ADSENSE_PUBLISHER_ID,
		loadAdSense
	} from '$lib/privacy/consent';

	const adSlot = '5024456887';

	type AdSenseWindow = Window & {
		adsbygoogle?: Record<string, never>[];
	};

	let initialized = false;
	let inViewport = false;
	let adContainer: HTMLElement;

	const initializeAd = async () => {
		if (!inViewport || initialized) return;
		try {
			await loadAdSense();
			const adsenseWindow = window as AdSenseWindow;
			(adsenseWindow.adsbygoogle ??= []).push({});
			initialized = true;
		} catch {
			// Ad blockers and network restrictions may prevent an ad from loading.
		}
	};

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				inViewport = true;
				initializeAd();
				observer.disconnect();
			},
			{ rootMargin: '200px 0px' }
		);
		observer.observe(adContainer);
		return () => {
			observer.disconnect();
		};
	});
</script>

<aside bind:this={adContainer} class="col-span-full flex min-h-[92px] w-full flex-col overflow-hidden border-2 border-stone-900 bg-white" aria-label="Advertisement">
	<span class="h-4 shrink-0 px-1 text-[9px] font-semibold uppercase leading-4 tracking-wide text-stone-500">Advertisement</span>
	<ins
		class="adsbygoogle block min-h-[76px] w-full flex-1"
		style="display: block;"
		data-ad-client={ADSENSE_PUBLISHER_ID}
		data-ad-slot={adSlot}
		data-ad-format="horizontal"
		data-full-width-responsive="true"
	></ins>
</aside>
