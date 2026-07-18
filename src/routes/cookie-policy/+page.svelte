<script lang="ts">
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Cookie Policy | caseplay.org</title>
	<meta name="description" content="How caseplay.org uses cookies, browser storage, and advertising technology." />
	<meta property="og:title" content="Cookie Policy | caseplay.org" />
	<meta property="og:description" content="How caseplay.org uses cookies, local storage, advertising technology, and analytics." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<div class="-mx-4 -mt-10 mb-8"><PublicSiteNav /></div>
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">&larr; caseplay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Cookie Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 16, 2026</p>

		<h2 class="mt-7 text-xl font-bold">Essential storage</h2>
		<p class="mt-2 leading-7">
			Caseplay uses local storage to remember your privacy choice, session storage for short-lived play-builder editing information, and a protected
			session cookie for authorized administrators. These support requested features, security, and site operation.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising choices</h2>
		<p class="mt-2 leading-7">
			Google Privacy &amp; Messaging presents advertising choices where required and communicates them to AdSense using its certified consent framework.
			Depending on location and choice, Google may serve personalized, non-personalized, or limited ads. Google and approved partners may process
			technical delivery data and use permitted storage for reporting, security, and fraud prevention. Learn more from
			<a class="font-semibold underline" href="https://policies.google.com/technologies/ads" rel="noreferrer" target="_blank"
				>Google advertising technologies</a
			>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Analytics cookies</h2>
		<p class="mt-2 leading-7">
			Google Analytics is optional and loads only after <strong>Allow Analytics</strong>. It may set <code>_ga</code> cookies for up to one year to
			distinguish visits and provide aggregate traffic and engagement reports. It does not load after <strong>No Analytics</strong> or when Global Privacy
			Control is enabled. Changing to No Analytics removes Caseplay's accessible Google Analytics cookies and stops future Analytics collection.
		</p>

		<h2 class="mt-7 text-xl font-bold">Change your choice</h2>
		<p class="mt-2 leading-7">
			Use <a class="font-semibold underline" href="/privacy">Privacy</a> to reopen advertising or Analytics choices. You can also clear existing site data
			in your browser.
		</p>
	</article>
	<PublicSiteFooter />
</main>
