<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ADSENSE_PUBLISHER_ID,
		CONSENT_EVENT,
		canLoadAdvertising,
		loadAdSense
	} from '$lib/privacy/consent';

	const adSlot = '5024456887';
	export let orientation: 'vertical' | 'horizontal' = 'vertical';

	type AdSenseWindow = Window & {
		adsbygoogle?: Record<string, never>[];
	};

	let advertisingAllowed = false;
	let initialized = false;
	let layoutMatches = false;

	const initializeAd = async () => {
		advertisingAllowed = canLoadAdvertising();
		if (!advertisingAllowed || !layoutMatches || initialized) return;
		initialized = true;
		try {
			await loadAdSense();
			const adsenseWindow = window as AdSenseWindow;
			(adsenseWindow.adsbygoogle ??= []).push({});
		} catch {
			initialized = false;
			// Ad blockers and network restrictions may prevent an ad from loading.
		}
	};

	onMount(() => {
		const desktopLayout = window.matchMedia('(min-width: 1024px)');
		const updateLayoutMatch = () => {
			layoutMatches = orientation === 'vertical' ? desktopLayout.matches : !desktopLayout.matches;
			if (layoutMatches) initializeAd();
		};
		updateLayoutMatch();
		const consentChanged = () => {
			advertisingAllowed = canLoadAdvertising();
			if (advertisingAllowed) initializeAd();
		};
		desktopLayout.addEventListener('change', updateLayoutMatch);
		window.addEventListener(CONSENT_EVENT, consentChanged);
		return () => {
			desktopLayout.removeEventListener('change', updateLayoutMatch);
			window.removeEventListener(CONSENT_EVENT, consentChanged);
		};
	});
</script>

<aside
	class="play-builder-ad relative w-full flex-col items-stretch overflow-hidden border-2 border-stone-900 bg-white {orientation === 'vertical'
		? 'hidden h-[calc(100vh-2rem)] min-h-[520px] max-w-[300px] lg:flex'
		: 'flex h-[clamp(90px,18vw,180px)] lg:hidden'}"
	aria-label="Advertisement"
>
	<span class="h-4 shrink-0 px-1 text-[9px] font-semibold uppercase leading-4 tracking-wide text-stone-500">Advertisement</span>
	{#if advertisingAllowed}
		<ins
			class="adsbygoogle block min-h-0 w-full flex-1"
			style="display: block;"
			data-ad-client={ADSENSE_PUBLISHER_ID}
			data-ad-slot={adSlot}
			data-ad-format={orientation}
			data-full-width-responsive="true"
		></ins>
	{:else}
		<div class="flex flex-1 items-center justify-center p-4 text-center text-xs text-stone-500">
			<p>Choose your advertising privacy preference to continue.</p>
		</div>
	{/if}
</aside>
