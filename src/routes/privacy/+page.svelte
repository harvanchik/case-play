<script lang="ts">
	import { openConsentChoices } from '$lib/privacy/consent';
</script>

<svelte:head>
	<title>Privacy Policy | caseplay.org</title>
	<meta name="description" content="The caseplay.org privacy policy." />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">&larr; caseplay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Privacy Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 16, 2026</p>

		<p class="mt-6 leading-7">Caseplay.org is an educational service operated by Jake Harvanchik. It is not directed to children under 13.</p>

		<h2 class="mt-7 text-xl font-bold">Information</h2>
		<p class="mt-2 leading-7">
			Caseplay processes play diagrams you save, messages you send, and standard technical records needed to deliver, secure, and troubleshoot the site. Saved plays have shareable URLs. Service providers may process IP address, browser, request, error, and security information. Records are kept only as reasonably needed for these purposes or legal obligations.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising</h2>
		<p class="mt-2 leading-7">
			Google AdSense ads fund the domain, hosting, and database. If you allow personalized ads, Google and approved partners may use advertising cookies and activity data for personalization and measurement. If you choose Generic Ads or enable Global Privacy Control, Caseplay denies personalization signals and requests generic ads instead. Generic and limited ad delivery may still process technical data such as IP address and use narrowly scoped storage for delivery, aggregate reporting, security, and fraud prevention. See the
			<a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">Google Privacy Policy</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Sharing and your rights</h2>
		<p class="mt-2 leading-7">
			Information is shared with providers needed to operate the service, with advertising providers according to your choice, when legally required, or when you share a play URL. Depending on your location, you may request access, correction, deletion, or restriction and may opt out of personalized advertising, sale, or sharing. Contact
			<a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>.
		</p>
		<button class="mt-4 cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 font-bold text-white" on:click={openConsentChoices}>
			Review Privacy Choices
		</button>
	</article>
</main>
