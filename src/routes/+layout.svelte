<script lang="ts">
	import { dev } from '$app/environment';
	import { inject } from '@vercel/analytics';
	import type { LayoutData } from './$types';
	import '../app.css';
	import CookieConsent from '$lib/components/CookieConsent.svelte';

	inject({ mode: dev ? 'development' : 'production' });

	export let data: LayoutData;
	$: canonicalUrl = data?.canonicalUrl ?? 'https://caseplay.org/';
</script>

<svelte:head>
	<link rel="canonical" href={canonicalUrl} />
	<meta name="robots" content={data?.robots ?? 'index, follow'} />
	<meta property="og:site_name" content="CasePlay.org" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content="en_US" />
	<meta name="caseplay-google-cmp-required" content={data?.googleCmpRequired ? 'true' : 'false'} />
</svelte:head>

<slot />
<CookieConsent googleCmpRequired={data?.googleCmpRequired ?? false} />
