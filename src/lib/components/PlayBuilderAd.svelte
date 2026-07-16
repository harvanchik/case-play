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

	const initializeAd = async () => {
		advertisingAllowed = canLoadAdvertising();
		if (!advertisingAllowed || initialized) return;
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
		initializeAd();
		const consentChanged = () => {
			advertisingAllowed = canLoadAdvertising();
			if (advertisingAllowed) initializeAd();
		};
		window.addEventListener(CONSENT_EVENT, consentChanged);
		return () => window.removeEventListener(CONSENT_EVENT, consentChanged);
	});
</script>

<aside
	class="play-builder-ad relative hidden h-[calc(100vh-2rem)] min-h-[520px] w-full max-w-[300px] flex-col items-stretch overflow-hidden border-2 border-stone-900 bg-white lg:flex"
	aria-label="Advertisement"
>
	<span class="h-4 shrink-0 px-1 text-[9px] font-semibold uppercase leading-4 tracking-wide text-stone-500">Advertisement</span>
	{#if advertisingAllowed}
		<ins
			class="adsbygoogle block min-h-0 w-full flex-1"
			style="display: block;"
			data-ad-client={ADSENSE_PUBLISHER_ID}
			data-ad-slot={adSlot}
			data-ad-format="vertical"
			data-full-width-responsive="true"
		></ins>
	{:else}
		<div class="flex flex-1 items-center justify-center p-4 text-center text-xs text-stone-500">
			<p>Choose your advertising privacy preference to continue.</p>
		</div>
	{/if}
</aside>
