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
		<p class="mt-2 text-sm text-stone-500">Last updated July 26, 2026</p>

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
			operating a secure educational website. Optional advertising is processed according to your consent choice. You may withdraw optional
			advertising consent at any time without affecting earlier lawful processing.
		</p>

		<h2 class="mt-7 text-xl font-bold">Advertising</h2>
		<p class="mt-2 leading-7">
			Google AdSense ads help fund the domain, hosting, and database. Google Privacy &amp; Messaging, a Google-certified consent management platform,
			handles consent and opt-out requirements in the EEA, UK, Switzerland, supported U.S. states, and other supported regions. If you choose
			<strong>Accept All Cookies</strong>, Google and approved partners may use permitted cookies and activity data for personalized advertising and
			measurement. If you choose
			<strong>Essential Cookies Only</strong>, CasePlay.org requests ads with personalization disabled. Google may then serve non-personalized or
			limited ads, depending on your location and the choices recorded by its certified consent platform. Limited advertising still requires technical
			processing such as using an IP address to deliver an ad, and Google may use narrowly limited storage for security and invalid-traffic prevention
			where permitted. See the
			<a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">Google Privacy Policy</a>.
		</p>

		<h2 class="mt-7 text-xl font-bold">Analytics</h2>
		<p class="mt-2 leading-7">
			Analytics: We use Vercel Web Analytics to collect anonymous, aggregate data (such as pageviews and browser types) to improve our site
			performance. This tool does not collect personal identifiers or track your behavior across other websites.
		</p>

		<h2 class="mt-7 text-xl font-bold">Service Providers and International Processing</h2>
		<p class="mt-2 leading-7">
			CasePlay.org uses Vercel for hosting, delivery, and anonymous aggregate analytics; Turso for database services; and, according to your choices,
			Google for advertising. These providers may process information in the United States and other countries under their own data-protection
			commitments and applicable transfer safeguards. Review the
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
		<p class="mt-2 leading-7">
			CasePlay.org never sells your personal data for money or shares it with offline data brokers. Information is disclosed online only to the
			service providers needed to operate the site, including Google AdSense according to your privacy choice, when you intentionally share a play
			URL, or when disclosure is legally required.
		</p>

		<h2 class="mt-7 text-xl font-bold">United States State Privacy Notice</h2>
		<p class="mt-2 leading-7">
			CasePlay.org may process identifiers and network information (such as IP address and browser or device information), internet or electronic
			activity (such as page requests, ad interactions, and security events), and content you submit (such as saved play diagrams and labels). This
			information comes from you, your browser, and the service providers identified above. It is used to provide requested features, secure and
			maintain the service, measure aggregate use, and fund the service through advertising. It may be disclosed to Vercel, Turso, Google and its
			approved advertising partners, or authorities when legally required. CasePlay.org does not sell personal information for money.
		</p>
		<p class="mt-2 leading-7">
			Some state laws may define personalized advertising disclosures as a sale, sharing, or targeted advertising. You can opt out by choosing
			<strong>Essential Cookies Only</strong>, using <strong>Your Privacy Choices</strong> in the footer, or enabling a supported Global Privacy
			Control signal. For that choice, CasePlay.org disables ad personalization and requests Google's restricted data processing mode. Subject to
			applicable law and verification, you may also request access, correction, deletion, or portability; use an authorized agent; or appeal a denied
			request by replying to the decision. CasePlay.org will not discriminate against you for exercising a privacy right. Send requests and appeals to
			<a class="font-semibold underline" href="mailto:privacy@caseplay.org">privacy@caseplay.org</a>.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<button class="cursor-pointer border-2 border-stone-900 bg-white px-4 py-2 font-bold text-stone-900" on:click={openConsentChoices}>
				Your Privacy Choices
			</button>
		</div>
	</article>
	<PublicSiteFooter />
</main>
