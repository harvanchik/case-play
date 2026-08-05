<script lang="ts">
	import Icon from '@iconify/svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
</script>

<svelte:head>
	<title>Saved Play Not Found | CasePlay.org</title>
	<meta name="description" content="The requested saved Flag Football Play Builder diagram could not be found." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<PublicSiteNav />

<main class="flex min-h-[calc(100vh-2.25rem)] items-center justify-center bg-stone-100 px-4 py-12">
	<section class="w-full max-w-xl border-2 border-stone-900 bg-white p-7 text-center shadow-[6px_6px_0_rgba(28,25,23,0.2)] sm:p-10">
		<div class="mx-auto flex h-16 w-16 items-center justify-center border-2 border-stone-900 bg-stone-100" aria-hidden="true">
			<Icon icon="material-symbols:search-off-rounded" class="h-9 w-9 text-stone-800" />
		</div>

		<p class="mt-6 text-sm font-black tracking-[0.18em] text-stone-500 uppercase">Error 404</p>
		<h1 class="mt-2 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">Saved play not found.</h1>
		<p class="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600 sm:text-base">This play may have been deleted, or the link may be incomplete.</p>

		<div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
			<a
				href="/account/plays"
				class="inline-flex h-11 items-center justify-center gap-2 border-2 border-stone-900 bg-white px-5 text-sm font-black text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-4 focus-visible:outline-[#22c55e]"
			>
				<Icon icon="material-symbols:folder-open-outline" class="h-5 w-5" aria-hidden="true" />
				My Plays
			</a>
			<a
				href="/diagram/flag-football"
				class="inline-flex h-11 items-center justify-center gap-2 border-2 border-stone-900 bg-stone-900 px-5 text-sm font-black text-white shadow-[3px_3px_0_rgba(28,25,23,0.2)] transition-colors hover:bg-stone-700 focus-visible:outline-4 focus-visible:outline-[#22c55e] active:translate-0.5 active:shadow-none"
			>
				<Icon icon="material-symbols:add-circle-outline" class="h-5 w-5" aria-hidden="true" />
				New Play
			</a>
		</div>
	</section>
</main>
