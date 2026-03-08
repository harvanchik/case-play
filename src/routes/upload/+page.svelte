<svelte:head>
	<title>Admin Redirect</title>
	<meta name="description" content="Sports case play database for referee education" />
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center bg-stone-100/[97%] px-6 text-center text-stone-800">
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>
	<section class="max-w-xl border border-stone-400 bg-stone-100/90 p-8 shadow-xl backdrop-blur">
		<h1 class="font-dokdo text-5xl uppercase">upload moved</h1>
		<p class="mt-4 font-neucha text-xl text-stone-700">
			Case play creation now lives in the protected admin area.
		</p>
		<a
			href="/admin/case-plays/new"
			class="mt-6 inline-flex border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-stone-700"
		>
			Open Admin
		</a>
	</section>
</main>
