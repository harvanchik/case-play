<script lang="ts">
	import { openAdPrivacyChoices, openConsentChoices } from '$lib/privacy/consent';
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Privacy Policy | caseplay.org</title>
	<meta name="description" content="The caseplay.org privacy policy." />
	<meta property="og:title" content="Privacy Policy | caseplay.org" />
	<meta property="og:description" content="How caseplay.org handles saved play data, advertising choices, analytics, and privacy requests." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<div class="-mx-4 -mt-10 mb-8"><PublicSiteNav /></div>
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">&larr; caseplay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Privacy Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 16, 2026</p>

		<p class="mt-6 leading-7">Caseplay.org is an educational service operated by Jake Harvanchik. It is not directed to children under 13.</p>

		<h2 class="mt-7 text-xl font-bold">Information</h2>
		<p class="mt-2 leading-7">
			Caseplay processes play diagrams you save and standard technical records needed to deliver, secure, and troubleshoot the site. Saved plays have
			shareable URLs. Service providers may process IP address, browser, request, error, and security information. Records are kept only as reasonably
			needed for these purposes or legal obligations.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising</h2>
		<p class="mt-2 leading-7">
			Google AdSense ads help fund the domain, hosting, and database. Google Privacy &amp; Messaging, a Google-certified consent management platform,
			presents advertising choices where required. Depending on your location and choices, Google and approved partners may use cookies and activity
			data for personalized advertising and measurement, or may serve non-personalized or limited ads. Technical data may still be processed for ad
			delivery, aggregate reporting, security, and fraud prevention. See the
			<a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">Google Privacy Policy</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Analytics</h2>
		<p class="mt-2 leading-7">
			Google Analytics loads only after you choose <strong>Allow Analytics</strong>. It records aggregate usage such as pages visited, visit duration,
			approximate region, referring source, and device or browser type. It does not load after <strong>No Analytics</strong> or when Global Privacy Control
			is enabled. Caseplay disables Google signals and advertising-personalization signals for Analytics and does not send saved play content or player
			labels to Analytics. The Analytics choice is separate from advertising consent.
		</p>

		<h2 class="mt-7 text-xl font-bold">Sharing and your rights</h2>
		<p class="mt-2 leading-7">
			Information is shared with providers needed to operate the service, with advertising providers according to your choice, when legally required,
			or when you share a play URL. Depending on your location, you may request access, correction, deletion, or restriction and may opt out of
			personalized advertising, sale, or sharing. Contact
			<a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<button class="cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 font-bold text-white" on:click={openAdPrivacyChoices}>
				Advertising Choices
			</button>
			<button class="cursor-pointer border-2 border-stone-900 bg-white px-4 py-2 font-bold text-stone-900" on:click={openConsentChoices}>
				Analytics Choices
			</button>
		</div>
	</article>
	<PublicSiteFooter />
</main>
