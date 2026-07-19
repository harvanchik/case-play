<script lang="ts">
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Cookie Policy | CasePlay.org</title>
	<meta name="description" content="How CasePlay.org uses cookies, browser storage, and advertising technology." />
	<meta property="og:title" content="Cookie Policy | CasePlay.org" />
	<meta property="og:description" content="How CasePlay.org uses cookies, local storage, advertising technology, and analytics." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<div class="-mx-4 -mt-10 mb-8"><PublicSiteNav /></div>
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">&larr; CasePlay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Cookie Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 18, 2026</p>

		<h2 class="mt-7 text-xl font-bold">Essential storage</h2>
		<p class="mt-2 leading-7">
			CasePlay.org uses local storage to remember your privacy choice for up to 12 months, session storage for short-lived play-builder editing
			information, and a protected session cookie for authorized administrators. These support requested features, security, and site operation.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising choices</h2>
		<p class="mt-2 leading-7">
			AdSense is blocked until you choose <strong>Accept All Cookies</strong>. Google Privacy &amp; Messaging then presents additional advertising choices where
			required and communicates them to AdSense using its certified consent framework. Depending on location and choice, Google may serve personalized,
			non-personalized, or limited ads. Learn more from
			<a class="font-semibold underline" href="https://policies.google.com/technologies/ads" rel="noreferrer" target="_blank"
				>Google advertising technologies</a
			>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Analytics cookies</h2>
		<p class="mt-2 leading-7">
			Google Analytics is optional and loads only after <strong>Accept All Cookies</strong>. It may set <code>_ga</code> cookies for up to one year to
			distinguish visits and provide aggregate traffic and engagement reports. It does not load after <strong>Reject All Cookies</strong> or when Global Privacy Control is
			enabled. Opting out removes Google tracking cookies accessible to CasePlay.org and stops future Analytics collection.
		</p>

		<h2 class="mt-7 text-xl font-bold">Change your choice</h2>
		<p class="mt-2 leading-7">
			Use <strong>Use of Cookies</strong> in the footer or the <a class="font-semibold underline" href="/privacy">Privacy</a> page to accept or withdraw
			optional consent at any time. Global Privacy Control is treated as an opt-out. You can also clear existing site data in your browser.
		</p>
	</article>
	<PublicSiteFooter />
</main>
