<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { CONSENT_EVENT, loadGoogleAnalytics, trackGoogleAnalyticsPageView, type ConsentChoice } from '$lib/privacy/consent';

	const track = (url: URL) => {
		void trackGoogleAnalyticsPageView(url).catch(() => undefined);
	};

	afterNavigate(({ to }) => {
		if (to?.url) track(to.url);
	});

	onMount(() => {
		void loadGoogleAnalytics()
			.then(() => track(new URL(window.location.href)))
			.catch(() => undefined);

		const consentChanged = (event: Event) => {
			if ((event as CustomEvent<ConsentChoice>).detail === 'all') track(new URL(window.location.href));
		};
		window.addEventListener(CONSENT_EVENT, consentChanged);
		return () => window.removeEventListener(CONSENT_EVENT, consentChanged);
	});
</script>
