<script lang="ts">
	import type { LayoutData } from './$types';
	import '../app.css';
	import CookieConsent from '$lib/components/CookieConsent.svelte';
	import GoogleAnalytics from '$lib/components/GoogleAnalytics.svelte';

	export let data: LayoutData;
	$: canonicalUrl = data?.canonicalUrl ?? 'https://caseplay.org/';
	$: analyticsConsentMode = data?.analyticsConsentMode ?? 'basic';
</script>

<svelte:head>
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:site_name" content="CasePlay.org" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content="en_US" />
</svelte:head>

<slot />
<CookieConsent analyticsMode={analyticsConsentMode} />
<GoogleAnalytics mode={analyticsConsentMode} />
