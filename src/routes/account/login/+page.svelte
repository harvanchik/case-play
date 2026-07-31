<script lang="ts">
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	$: returnTo = encodeURIComponent(data.returnTo || '/account/profile');
</script>

<svelte:head>
	<title>Log in | CasePlay.org</title>
	<meta name="description" content="Sign in to manage your CasePlay.org profile and saved play-builder diagrams." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<PublicSiteNav />
<main class="min-h-[calc(100vh-2.25rem)] bg-stone-100 px-4 py-16">
	<div class="mx-auto max-w-md border-2 border-stone-900 bg-white p-6 shadow-[4px_4px_0_rgba(28,25,23,0.2)]">
		<h1 class="mb-2 text-2xl font-black tracking-tight text-stone-900">Log in or sign up</h1>
		<p class="mb-6 text-sm leading-6 text-stone-600">Use a Google or Microsoft account to save your diagrams and manage your profile.</p>
		{#if data.message}<p class="mb-4 border border-red-700 bg-red-50 p-3 text-sm text-red-800" role="alert">{data.message}</p>{/if}
		<div class="grid gap-3">
			<a class="account-provider-button" href={`/account/oauth/google/start?returnTo=${returnTo}`}>Continue with Google</a>
			<a class="account-provider-button" href={`/account/oauth/microsoft/start?returnTo=${returnTo}`}>Continue with Microsoft</a>
		</div>
		<p class="mt-5 text-xs leading-5 text-stone-500">CasePlay does not store your provider password. Your provider handles authentication.</p>
	</div>
</main>

<style>
	.account-provider-button {
		border: 2px solid #292524;
		background: #1c1917;
		padding: 0.75rem 1rem;
		text-align: center;
		font-weight: 800;
		color: white;
		transition: background-color 120ms ease;
	}
	.account-provider-button:hover,
	.account-provider-button:focus-visible {
		background: #44403c;
	}
</style>
