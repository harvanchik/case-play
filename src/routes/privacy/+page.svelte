<script lang="ts">
	import { openConsentChoices } from '$lib/privacy/consent';
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Privacy Policy | CasePlay.org</title>
	<meta name="description" content="The CasePlay.org privacy policy." />
	<meta property="og:title" content="Privacy Policy | CasePlay.org" />
	<meta property="og:description" content="How CasePlay.org handles saved play data, advertising choices, analytics, and privacy requests." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<div class="-mx-4 -mt-10 mb-8"><PublicSiteNav /></div>
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">&larr; CasePlay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Privacy Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 25, 2026</p>

		<p class="mt-6 leading-7">CasePlay.org is an educational service operated by Jake Harvanchik. It is not directed to children under 13.</p>

		<h2 class="mt-7 text-xl font-bold">Who Is Responsible</h2>
		<p class="mt-2 leading-7">
			Jake Harvanchik operates CasePlay.org and is responsible for its data practices. Questions and privacy requests can be sent to
			<a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Information We Process</h2>
		<p class="mt-2 leading-7">
			CasePlay.org processes play diagrams and labels that you choose to save. Saved plays are available to anyone with their shareable URL, so they
			should not contain confidential or personal information. The site also uses browser storage for creator access, drafts, preferences, and consent
			choices. Hosting and security providers may process IP address, browser, request, diagnostic, and security information needed to operate and
			protect the service. CasePlay.org does not offer public user accounts or collect payment information.
		</p>

		<h2 class="mt-7 text-xl font-bold">Purposes and Legal Bases</h2>
		<p class="mt-2 leading-7">
			Saved-play data is processed to provide the feature you request. Essential technical and security records are processed to operate, prevent
			abuse, debug, and protect the service. Where applicable, these activities rely on providing the requested service and the legitimate interest in
			operating a secure educational website. Optional Analytics and advertising are processed according to your consent choices. You may withdraw
			optional consent at any time without affecting earlier lawful processing.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising</h2>
		<p class="mt-2 leading-7">
			Google AdSense ads help fund the domain, hosting, and database. Google Privacy &amp; Messaging, a Google-certified consent management platform,
			presents additional advertising choices where required. AdSense does not load until you choose <strong>Accept All Cookies</strong>. Depending on
			your location and choices, Google and approved partners may then use cookies and activity data for personalized advertising and measurement. See
			the
			<a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">Google Privacy Policy</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Analytics</h2>
		<p class="mt-2 leading-7">
			If you choose <strong>Analytics Only</strong> or <strong>Accept All Cookies</strong>, Google Analytics records aggregate usage such as pages
			visited, visit duration, approximate region, referring source, and device or browser type. For United States visitors who have not enabled
			Global Privacy Control, CasePlay.org may use Google Advanced Consent Mode after optional storage is declined. In that mode, Google receives
			cookieless measurement signals for basic measurement and modeling; Analytics storage remains denied. For other or unknown regions, the Google
			Analytics tag remains blocked until analytics consent is given. CasePlay.org disables Google signals and advertising-personalization signals and
			does not send saved play content or player labels to Analytics.
		</p>

		<h2 class="mt-7 text-xl font-bold">Service Providers and International Processing</h2>
		<p class="mt-2 leading-7">
			CasePlay.org uses Vercel for hosting and delivery, Turso for database services, and, according to your choices, Google for Analytics and
			advertising. These providers may process information in the United States and other countries under their own data-protection commitments and
			applicable transfer safeguards. Review the
			<a class="font-semibold underline" href="https://vercel.com/legal/privacy-policy" rel="noreferrer" target="_blank">Vercel Privacy Policy</a>,
			<a class="font-semibold underline" href="https://turso.tech/privacy-policy" rel="noreferrer" target="_blank">Turso Privacy Policy</a>, and
			<a class="font-semibold underline" href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">Google Privacy Policy</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Retention</h2>
		<p class="mt-2 leading-7">
			Saved plays remain available until they are deleted at your request or removed as part of service maintenance. Browser drafts and preferences
			remain until you remove them or clear site data. Consent choices expire after one year. Administrative sessions expire after 30 days. Hosting,
			security, and diagnostic records follow the applicable provider retention schedules and are kept only as reasonably needed for operations,
			security, dispute resolution, or legal obligations.
		</p>

		<h2 class="mt-7 text-xl font-bold">Sharing and Your Rights</h2>
		<p class="mt-2 leading-7">
			Information is shared with providers needed to operate the service, with advertising providers according to your choice, when legally required,
			or when you share a play URL. Depending on your location, you may request access, correction, deletion, portability, objection, or restriction
			and may opt out of personalized advertising, sale, or sharing. CasePlay.org honors supported Global Privacy Control signals. You may also have
			the right to complain to your local data-protection authority. To exercise a right, identify the relevant saved-play URL and contact
			<a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<button class="cursor-pointer border-2 border-stone-900 bg-white px-4 py-2 font-bold text-stone-900" on:click={openConsentChoices}>
				Use of Cookies
			</button>
		</div>
	</article>
	<PublicSiteFooter />
</main>
