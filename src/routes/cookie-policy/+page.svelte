<script lang="ts">
	import { openConsentChoices } from '$lib/privacy/consent';
</script>

<svelte:head>
	<title>Cookie Policy | caseplay.org</title>
	<meta name="description" content="How caseplay.org uses cookies, browser storage, and advertising technology." />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">← caseplay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Cookie Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 16, 2026</p>

		<p class="mt-6 leading-7">
			CasePlay uses cookies and similar browser storage only as described below. Optional advertising and measurement technology is off unless you affirmatively choose <strong>Allow All</strong>. You can withdraw that choice at any time.
		</p>

		<h2 class="mt-7 text-xl font-bold">Essential storage</h2>
		<p class="mt-2 leading-7">This storage supports a feature you request or protects the site. It remains available when you choose Essential Only:</p>
		<ul class="mt-3 list-disc space-y-2 pl-6 leading-7">
			<li><strong>caseplay_cookie_consent_v1</strong> (local storage): remembers your privacy choice until you change it or clear site data.</li>
			<li><strong>Play-builder session data</strong> (session storage): keeps an edit token and short-lived interface messages for a play you save. It is removed when the browser session ends.</li>
			<li><strong>caseplay_session</strong> (cookie): used only for authenticated site administrators, with security restrictions and an expiration.</li>
		</ul>

		<h2 class="mt-7 text-xl font-bold">Optional advertising storage</h2>
		<p class="mt-2 leading-7">
			If you choose Allow All, CasePlay loads Google AdSense. Google and its approved advertising partners may use cookies, local storage, device information, IP address, and activity on this site to select, deliver, limit, and measure ads. Depending on your region and choices in Google's certified consent message, ads may be personalized or non-personalized. See
			<a class="font-semibold underline" href="https://policies.google.com/technologies/ads" rel="noreferrer" target="_blank">How Google uses information for advertising</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Your choices</h2>
		<p class="mt-2 leading-7">
			Essential Only and Allow All are presented as equally available choices. No optional advertising request is made before consent. CasePlay also honors an enabled Global Privacy Control signal by keeping optional advertising off. Changing from Allow All to Essential Only stops future optional loading; you may also clear existing site data using your browser controls.
		</p>
		<button class="mt-4 cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 font-bold text-white" on:click={openConsentChoices}>
			Change Privacy Choices
		</button>

		<h2 class="mt-7 text-xl font-bold">Contact</h2>
		<p class="mt-2 leading-7">Questions or requests can be sent to <a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>.</p>
		<p class="mt-7 text-sm text-stone-600">See the <a class="font-semibold underline" href="/privacy">Privacy Policy</a> for information about other data processing.</p>
	</article>
</main>
