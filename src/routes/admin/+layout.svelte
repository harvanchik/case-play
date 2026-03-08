<script lang="ts">
	import type { LayoutData } from './$types';

	export let data: LayoutData;
</script>

<svelte:head>
	<title>Case Play Admin</title>
</svelte:head>

<main class="min-h-screen bg-stone-100 text-stone-900">
	<div class="border-b border-stone-300 bg-white/95 backdrop-blur">
		<div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<a href="/admin" class="font-dokdo text-4xl uppercase text-stone-900">caseplay admin</a>
				<p class="text-sm text-stone-600">{data.user?.email}</p>
			</div>
			<nav class="flex flex-wrap items-center gap-2 text-sm font-semibold">
				<a href="/admin/case-plays" class="border border-stone-300 px-3 py-2 hover:bg-stone-100">Case Plays</a>
				<a href="/admin/reference" class="border border-stone-300 px-3 py-2 hover:bg-stone-100">Reference Data</a>
				<a href="/admin/playlists" class="border border-stone-300 px-3 py-2 hover:bg-stone-100">Playlists</a>
				<a href="/" class="border border-stone-300 px-3 py-2 hover:bg-stone-100">Public Site</a>
				<form method="POST" action="/admin/logout">
					<button class="cursor-pointer border border-stone-900 bg-stone-900 px-3 py-2 text-white hover:bg-stone-700">
						Log out
					</button>
				</form>
			</nav>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 py-8">
		<slot />
	</div>
</main>
