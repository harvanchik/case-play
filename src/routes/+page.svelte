<script lang="ts">
	import type { PageData } from './$types';

	// page data from +page.server.ts
	export let data: PageData;

	const casePlays = data.records;
</script>

<svelte:head>
	<title>Case Plays</title>
	<script src="https://code.iconify.design/iconify-icon/1.0.3/iconify-icon.min.js"></script>
</svelte:head>

{#each casePlays as casePlay}
	<div class="text-xl font-bold text-blue-500">{casePlay.title}</div>
	<div class="text-xl text-gray-500">{casePlay.id}</div>
{/each}
