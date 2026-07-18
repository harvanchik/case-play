<script lang="ts">
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Contact Caseplay</title>
	<meta name="description" content="Contact Caseplay about officiating case plays, corrections, contributions, privacy, or the flag football play builder." />
	<meta property="og:title" content="Contact Caseplay" />
	<meta property="og:description" content="Contact Caseplay about case plays, corrections, contributions, privacy, or the play builder." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 text-stone-800">
	<PublicSiteNav />
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 bg-[url(/svg/graph.svg)]"></div>
	<article class="mx-auto my-8 max-w-3xl border-2 border-stone-900 bg-white p-6 shadow-lg sm:p-10">
		<h1 class="text-3xl font-bold">Contact Caseplay</h1>
		<p class="mt-5 leading-7">Questions, corrections, accessibility concerns, and privacy requests are welcome.</p>

		<div class="mt-6 grid gap-4 sm:grid-cols-2">
			<section class="border border-stone-400 bg-stone-50 p-4">
				<h2 class="text-lg font-bold">General contact</h2>
				<p class="mt-2 text-sm leading-6">For site questions, corrections, privacy requests, and feedback.</p>
				<a class="mt-3 inline-block font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>
			</section>
			<section class="border border-stone-400 bg-stone-50 p-4">
				<h2 class="text-lg font-bold">Contribute a case play</h2>
				<p class="mt-2 text-sm leading-6">Suggest a new scenario or offer educational material for review.</p>
				<a class="mt-3 inline-block font-semibold underline" href="mailto:create@caseplay.org">create@caseplay.org</a>
			</section>
		</div>

		<p class="mt-6 text-sm leading-6 text-stone-600">Please do not send passwords, payment information, or other sensitive personal information.</p>
	</article>
	<PublicSiteFooter />
</main>
