<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ADSENSE_PUBLISHER_ID,
		loadAdSense
	} from '$lib/privacy/consent';

	const adSlot = '5024456887';
	export let orientation: 'vertical' | 'horizontal' = 'vertical';

	type AdSenseWindow = Window & {
		adsbygoogle?: Record<string, never>[];
	};

	let initialized = false;
	let layoutMatches = false;

	const initializeAd = async () => {
		if (!layoutMatches || initialized) return;
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
		desktopLayout.addEventListener('change', updateLayoutMatch);
		return () => {
			desktopLayout.removeEventListener('change', updateLayoutMatch);
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
	<ins
		class="adsbygoogle block min-h-0 w-full flex-1"
		style="display: block;"
		data-ad-client={ADSENSE_PUBLISHER_ID}
		data-ad-slot={adSlot}
		data-ad-format={orientation}
		data-full-width-responsive="true"
	></ins>
</aside>
