<script lang="ts">
	import { onMount } from 'svelte';

	const publisherId = 'ca-pub-3425711717023232';
	const adSlot = '5024456887';

	type AdSenseWindow = Window & {
		adsbygoogle?: Record<string, never>[];
	};

	onMount(() => {
		const adsenseWindow = window as AdSenseWindow;
		(adsenseWindow.adsbygoogle ??= []).push({});
	});
</script>

<aside
	class="play-builder-ad relative flex h-[100px] w-[min(320px,calc(100vw-2rem))] flex-col items-stretch overflow-hidden border-2 border-stone-900 bg-white"
	aria-label="Advertisement"
>
	<span class="h-[10px] shrink-0 px-1 text-[9px] font-semibold uppercase leading-[10px] tracking-wide text-stone-500">Advertisement</span>
	<ins
		class="adsbygoogle block min-h-0 w-full flex-1"
		style="display: block;"
		data-ad-client={publisherId}
		data-ad-slot={adSlot}
		data-ad-format="auto"
		data-full-width-responsive="true"
	></ins>
</aside>
