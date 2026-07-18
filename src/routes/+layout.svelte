<script>
	import { page } from '$app/stores';
	import '../app.css';
	import CookieConsent from '$lib/components/CookieConsent.svelte';
	import GoogleAnalytics from '$lib/components/GoogleAnalytics.svelte';

	$: canonicalPage = $page.url.searchParams.get('page');
	$: canonicalUrl = `https://caseplay.org${$page.url.pathname}${canonicalPage && Number(canonicalPage) > 1 ? `?page=${encodeURIComponent(canonicalPage)}` : ''}`;
</script>

<svelte:head>
	<link rel="canonical" href={canonicalUrl} />
	<meta property="og:site_name" content="caseplay.org" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content="en_US" />
</svelte:head>

<slot />
<CookieConsent />
<GoogleAnalytics />
