<script lang="ts">
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>About CasePlay.org | Flag Football Officiating Education</title>
	<meta
		name="description"
		content="Learn who operates CasePlay.org, how its officiating case plays are sourced, and how the play builder supports referee education."
	/>
	<meta property="og:title" content="About CasePlay.org" />
	<meta property="og:description" content="An independent educational case play database and flag football play builder for sports officials." />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-stone-100 text-stone-800">
	<PublicSiteNav />
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 bg-[url(/svg/graph.svg)]"></div>
	<article class="mx-auto my-8 max-w-3xl border-2 border-stone-900 bg-white p-6 shadow-lg sm:p-10">
		<h1 class="text-3xl font-bold">About CasePlay.org</h1>
		<p class="mt-5 leading-7">
			CasePlay.org is an independent, educational case play database and flag football diagramming tool operated by Jake Harvanchik. It is designed to
			help intramural officials, clinicians, students, and officiating crews practice rules knowledge and discuss difficult play situations.
		</p>

		<h2 class="mt-7 text-xl font-bold">How the site helps officials</h2>
		<p class="mt-2 leading-7">
			The database makes case plays searchable and connects each scenario with related situations. The flag football play builder lets users create,
			annotate, export, save, and share flag football diagrams for training and discussion.
		</p>

		<h2 class="mt-7 text-xl font-bold">Sources and editorial approach</h2>
		<p class="mt-2 leading-7">
			Case play pages identify their credited author, rulebook, edition, rule reference, and page number whenever that information is available.
			Source metadata is presented so readers can verify interpretations against the controlling publication. Corrections and updated interpretations
			are welcome through the contact information below.
		</p>

		<h2 class="mt-7 text-xl font-bold">Independence</h2>
		<p class="mt-2 leading-7">
			CasePlay.org is independently operated and is not affiliated with, sponsored by, or endorsed by NIRSA or Special Olympics North America.
			Organization names and rulebook references identify the sources discussed on the site.
		</p>

		<h2 class="mt-7 text-xl font-bold">Contributions and corrections</h2>
		<p class="mt-2 leading-7">
			To suggest a case play, email <a class="font-semibold underline" href="mailto:create@caseplay.org">create@caseplay.org</a>. For feedback on
			features or corrections, email
			<a class="font-semibold underline" href="mailto:feedback@caseplay.org">feedback@caseplay.org</a>. For general inquiries, email
			<a class="font-semibold underline" href="mailto:contact@caseplay.org">contact@caseplay.org</a>.
		</p>
	</article>
	<PublicSiteFooter />
</main>
