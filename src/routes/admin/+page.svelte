<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="space-y-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Admin Dashboard</h1>
		<p class="text-stone-600">Manage case plays, supporting reference data, and ordered playlists.</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<div class="border border-stone-300 bg-white p-5 shadow-sm">
			<p class="text-sm uppercase tracking-wide text-stone-500">Case Plays</p>
			<p class="mt-2 text-4xl font-bold">{data.stats.casePlays}</p>
		</div>
		<div class="border border-stone-300 bg-white p-5 shadow-sm">
			<p class="text-sm uppercase tracking-wide text-stone-500">Playlists</p>
			<p class="mt-2 text-4xl font-bold">{data.stats.playlists}</p>
		</div>
		<div class="border border-stone-300 bg-white p-5 shadow-sm">
			<p class="text-sm uppercase tracking-wide text-stone-500">Authors</p>
			<p class="mt-2 text-4xl font-bold">{data.stats.authors}</p>
		</div>
		<div class="border border-stone-300 bg-white p-5 shadow-sm">
			<p class="text-sm uppercase tracking-wide text-stone-500">Rulebooks / Sports</p>
			<p class="mt-2 text-4xl font-bold">{data.stats.rulebooks} / {data.stats.sports}</p>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		<a href="/admin/case-plays" class="border border-stone-300 bg-white p-5 shadow-sm hover:bg-stone-50">
			<h2 class="text-xl font-semibold">Manage Case Plays</h2>
			<p class="mt-2 text-sm text-stone-600">Create, edit, and remove case play records.</p>
		</a>
		<a href="/admin/reference" class="border border-stone-300 bg-white p-5 shadow-sm hover:bg-stone-50">
			<h2 class="text-xl font-semibold">Reference Data</h2>
			<p class="mt-2 text-sm text-stone-600">Maintain authors, rulebooks, and sports used by case plays.</p>
		</a>
		<a href="/admin/playlists" class="border border-stone-300 bg-white p-5 shadow-sm hover:bg-stone-50">
			<h2 class="text-xl font-semibold">Playlists</h2>
			<p class="mt-2 text-sm text-stone-600">Build ordered teaching sets from the case play catalog.</p>
		</a>
	</div>
</section>
