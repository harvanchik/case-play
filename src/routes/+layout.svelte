<script lang="ts">
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import '../app.css';
	import AccountBrowserPlayClaim from '$lib/components/AccountBrowserPlayClaim.svelte';
	import CookieConsent from '$lib/components/CookieConsent.svelte';

	export let data: LayoutData;
	let clientReady = false;
	$: canonicalUrl = data?.canonicalUrl ?? 'https://caseplay.org/';

	onMount(() => {
		injectAnalytics({ mode: dev ? 'development' : 'production' });
		clientReady = true;
	});
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
{#if clientReady && data?.accountUser && data.accountCsrfToken}
	<AccountBrowserPlayClaim csrfToken={data.accountCsrfToken} />
{/if}
<CookieConsent googleCmpRequired={data?.googleCmpRequired ?? false} />
