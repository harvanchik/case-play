<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ADSENSE_PUBLISHER_ID,
		CONSENT_EVENT,
		canLoadAdvertising,
		loadAdSense
	} from '$lib/privacy/consent';

	const adSlot = '5024456887';

	type AdSenseWindow = Window & {
		adsbygoogle?: Record<string, never>[];
	};

	let advertisingAllowed = false;
	let initialized = false;
	let inViewport = false;
	let adContainer: HTMLElement;

	const initializeAd = async () => {
		advertisingAllowed = canLoadAdvertising();
		if (!advertisingAllowed || !inViewport || initialized) return;
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
		const consentChanged = () => {
			advertisingAllowed = canLoadAdvertising();
			if (advertisingAllowed) initializeAd();
		};
		window.addEventListener(CONSENT_EVENT, consentChanged);
		return () => {
			observer.disconnect();
			window.removeEventListener(CONSENT_EVENT, consentChanged);
		};
	});
</script>

<aside bind:this={adContainer} class="col-span-full flex min-h-[92px] w-full flex-col overflow-hidden border-2 border-stone-900 bg-white" aria-label="Advertisement">
	<span class="h-4 shrink-0 px-1 text-[9px] font-semibold uppercase leading-4 tracking-wide text-stone-500">Advertisement</span>
	{#if advertisingAllowed}
		<ins
			class="adsbygoogle block min-h-[76px] w-full flex-1"
			style="display: block;"
			data-ad-client={ADSENSE_PUBLISHER_ID}
			data-ad-slot={adSlot}
			data-ad-format="horizontal"
			data-full-width-responsive="true"
		></ins>
	{:else}
		<div class="flex flex-1 items-center justify-center px-3 text-center text-xs text-stone-500">
			<span>Choose your advertising privacy preference to continue.</span>
		</div>
	{/if}
</aside>
