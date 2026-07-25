<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		CONSENT_EVENT,
		hasAnalyticsConsent,
		loadGoogleAnalytics,
		trackGoogleAnalyticsPageView,
		type AnalyticsConsentMode,
		type ConsentChoice
	} from '$lib/privacy/consent';

	export let mode: AnalyticsConsentMode = 'basic';
	const track = (url: URL) => {
		void trackGoogleAnalyticsPageView(url, mode).catch(() => undefined);
	};

	afterNavigate(({ to }) => {
		if (to?.url) track(to.url);
	});

	onMount(() => {
		void loadGoogleAnalytics(mode)
			.then(() => track(new URL(window.location.href)))
			.catch(() => undefined);

		const consentChanged = (event: Event) => {
			const choice = (event as CustomEvent<ConsentChoice>).detail;
			if (choice === 'analytics' || choice === 'all' || (mode === 'advanced' && !hasAnalyticsConsent())) {
				track(new URL(window.location.href));
			}
		};
		window.addEventListener(CONSENT_EVENT, consentChanged);
		return () => window.removeEventListener(CONSENT_EVENT, consentChanged);
	});
</script>
