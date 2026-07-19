<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const difficultyLabel = (difficulty: number) => {
		switch (difficulty) {
			case 1:
				return 'Easy';
			case 2:
				return 'Moderate';
			case 3:
				return 'Hard';
			default:
				return 'Unknown';
		}
	};
</script>

<section class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold">Case Plays</h1>
			<p class="text-stone-600">Edit the public catalog and seed new records for later recovery imports.</p>
		</div>
		<a href="/admin/case-plays/new" class="border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
			New Case Play
		</a>
	</div>

	<div class="overflow-hidden border border-stone-300 bg-white shadow-sm">
		<div class="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 border-b border-stone-300 bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-700">
			<span>Title</span>
			<span>Difficulty</span>
			<span>Reference</span>
			<span>Updated</span>
		</div>

		{#if data.casePlays.length > 0}
			{#each data.casePlays as casePlay}
				<a
					href="/admin/case-plays/{casePlay.id}"
					class="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 border-b border-stone-200 px-4 py-3 hover:bg-stone-50"
				>
					<div>
						<p class="flex flex-wrap items-center gap-2 font-semibold text-stone-900">
							{casePlay.title}
							{#if casePlay.isHidden}<span class="border border-amber-700 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-900">Hidden</span>{/if}
						</p>
						{#if casePlay.sourceKey}
							<p class="text-xs text-stone-500">source_key: {casePlay.sourceKey}</p>
						{/if}
					</div>
					<span class="text-sm text-stone-700">{difficultyLabel(casePlay.difficulty)}</span>
					<span class="text-sm text-stone-700">
						{casePlay.rulebookTitle || 'No rulebook'}
						<br />
						<span class="text-xs text-stone-500">
							{casePlay.authorFirstName ? `${casePlay.authorFirstName} ${casePlay.authorLastName}` : 'No author'}
						</span>
					</span>
					<span class="text-sm text-stone-700">{new Date(casePlay.updatedAt).toLocaleDateString()}</span>
				</a>
			{/each}
		{:else}
			<p class="px-4 py-6 text-stone-600">No case plays yet. Create the first one from the button above.</p>
		{/if}
	</div>
</section>
