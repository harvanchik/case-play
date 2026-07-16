<script lang="ts">
	import { openConsentChoices } from '$lib/privacy/consent';
</script>

<svelte:head>
	<title>Privacy Policy | caseplay.org</title>
	<meta name="description" content="The caseplay.org privacy policy." />
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-10 text-stone-800">
	<article class="mx-auto max-w-3xl border-2 border-stone-900 bg-white p-6 sm:p-10">
		<a href="/" class="font-semibold underline">← caseplay.org</a>
		<h1 class="mt-5 text-3xl font-bold">Privacy Policy</h1>
		<p class="mt-2 text-sm text-stone-500">Last updated July 16, 2026</p>

		<p class="mt-6 leading-7">
			This policy explains how caseplay.org, created and operated by Jake Harvanchik, handles personal information. CasePlay is an educational tool for intramural officials and is not directed to children under 13.
		</p>

		<h2 class="mt-7 text-xl font-bold">Information you provide</h2>
		<ul class="mt-3 list-disc space-y-2 pl-6 leading-7">
			<li>Play diagrams you choose to save, including play names, element labels, field settings, and drawings. Saved plays receive a shareable URL and can be viewed by anyone with that URL.</li>
			<li>Messages and an email address if you contact CasePlay or voluntarily submit content.</li>
			<li>Administrator account information for authorized site administrators.</li>
		</ul>

		<h2 class="mt-7 text-xl font-bold">Information processed automatically</h2>
		<p class="mt-2 leading-7">
			The hosting, database, and security providers used to operate CasePlay may process standard technical data such as IP address, request time, requested URL, browser type, and error or security logs. This is used to deliver, secure, troubleshoot, and maintain the service. CasePlay does not currently use a separate audience analytics service.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising</h2>
		<p class="mt-2 leading-7">
			Google AdSense is loaded only after you choose Allow All and when your browser is not sending Global Privacy Control. Google and its advertising partners may then process device and activity data to provide and measure ads, subject to your choices and applicable regional consent controls. CasePlay uses AdSense category controls intended to reduce ads unsuitable for school or workplace settings, but automated category filtering cannot guarantee every creative. Learn more in the
			<a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">Google Privacy Policy</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Why information is used</h2>
		<p class="mt-2 leading-7">Information is used to provide requested features, save and share plays, respond to messages, prevent abuse, maintain security, comply with legal obligations, and—only with consent—support the site with advertising.</p>

		<h2 class="mt-7 text-xl font-bold">Sharing and retention</h2>
		<p class="mt-2 leading-7">
			Information is shared only with service providers needed to host, store, secure, and operate the site; with Google and its advertising partners after advertising consent; when required by law; or when you intentionally share a play URL. Saved play diagrams remain until deleted or no longer needed for the service. Technical and correspondence records are retained only as reasonably needed for operations, security, and legal obligations.
		</p>

		<h2 class="mt-7 text-xl font-bold">Your rights and controls</h2>
		<p class="mt-2 leading-7">
			Depending on where you live, you may have rights to access, correct, delete, or receive information about personal data, and to object to or restrict certain uses. CasePlay honors Global Privacy Control for optional advertising. You may change cookie choices below and may contact CasePlay to make a privacy request. Identity may need to be verified before completing a request.
		</p>
		<button class="mt-4 cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 font-bold text-white" on:click={openConsentChoices}>
			Change Privacy Choices
		</button>

		<h2 class="mt-7 text-xl font-bold">Security and international processing</h2>
		<p class="mt-2 leading-7">Reasonable technical and organizational safeguards are used, but no internet service can guarantee absolute security. Service providers may process information in the United States and other countries under their applicable safeguards.</p>

		<h2 class="mt-7 text-xl font-bold">Contact and changes</h2>
		<p class="mt-2 leading-7">
			Send privacy questions or requests to <a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>. Material policy changes will be reflected by the updated date and, when appropriate, a prominent notice or renewed choice.
		</p>
	</article>
</main>
