<script lang="ts">
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Contact CasePlay.org</title>
	<meta
		name="description"
		content="Contact CasePlay.org about officiating case plays, corrections, contributions, privacy, or the flag football play builder."
	/>
	<meta property="og:title" content="Contact CasePlay.org" />
	<meta property="og:description" content="Contact CasePlay.org about case plays, corrections, contributions, privacy, or the play builder." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 text-stone-800">
	<PublicSiteNav />
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 bg-[url(/svg/graph.svg)]"></div>
	<article class="mx-auto my-8 max-w-3xl border-2 border-stone-900 bg-white p-6 shadow-lg sm:p-10">
		<h1 class="text-3xl font-bold">Contact CasePlay.org</h1>
		<p class="mt-5 leading-7">Questions, corrections, feedback, accessibility concerns, and privacy requests are welcome.</p>

		<div class="mt-6 grid gap-4 sm:grid-cols-3">
			<section class="border border-stone-400 bg-stone-50 p-4">
				<h2 class="text-lg font-bold">General contact</h2>
				<p class="mt-2 text-sm leading-6">For site questions, inquiries, and privacy requests.</p>
				<a class="mt-3 inline-block font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>
			</section>
			<section class="border border-stone-400 bg-stone-50 p-4">
				<h2 class="text-lg font-bold">Feedback</h2>
				<p class="mt-2 text-sm leading-6">Report a problem or suggest an improvement.</p>
				<a class="mt-3 inline-block font-semibold underline" href="mailto:feedback@caseplay.org">feedback@caseplay.org</a>
			</section>
			<section class="border border-stone-400 bg-stone-50 p-4">
				<h2 class="text-lg font-bold">Contribute</h2>
				<p class="mt-2 text-sm leading-6">Your case plays are added upon request as of now.</p>
				<a class="mt-3 inline-block font-semibold underline" href="mailto:create@caseplay.org">create@caseplay.org</a>
			</section>
		</div>

		<p class="mt-6 text-sm leading-6 text-stone-600">Please do not send passwords, payment information, or other sensitive personal information.</p>
	</article>
	<PublicSiteFooter />
</main>
