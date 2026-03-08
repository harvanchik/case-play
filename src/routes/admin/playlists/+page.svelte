<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	const playlistEntryMap = (playlist: PageData['playlists'][number]) =>
		new Map(playlist.casePlays.map((casePlay) => [casePlay.id, casePlay.position]));
</script>

<section class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold">Playlists</h1>
		<p class="text-stone-600">Create named playlists and assign case plays in the exact teaching order you want.</p>
	</div>

	{#if form?.error}
		<p class="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}

	<section class="border border-stone-300 bg-white p-5 shadow-sm">
		<h2 class="text-xl font-semibold">New Playlist</h2>
		<form method="POST" action="?/create" class="mt-4 flex flex-col gap-3 sm:flex-row">
			<input name="title" required placeholder="Playlist title" class="flex-1 border border-stone-300 px-3 py-2" />
			<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
				Create
			</button>
		</form>
	</section>

	<div class="space-y-6">
		{#if data.playlists.length > 0}
			{#each data.playlists as playlist}
				{@const entries = playlistEntryMap(playlist)}
				<section class="border border-stone-300 bg-white p-5 shadow-sm">
					<form method="POST" action="?/save" class="space-y-4">
						<input type="hidden" name="playlistId" value={playlist.id} />
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-1">
								<label class="text-sm font-semibold" for="title-{playlist.id}">Title</label>
								<input
									id="title-{playlist.id}"
									name="title"
									value={playlist.title}
									class="w-full border border-stone-300 px-3 py-2"
								/>
							</div>
							<div class="space-y-1">
								<label class="text-sm font-semibold" for="sourceKey-{playlist.id}">Source Key</label>
								<input
									id="sourceKey-{playlist.id}"
									name="sourceKey"
									value={playlist.sourceKey || ''}
									class="w-full border border-stone-300 px-3 py-2"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<h3 class="font-semibold text-stone-900">Ordered Entries</h3>
							<div class="max-h-96 space-y-2 overflow-y-auto border border-stone-200 p-3">
								{#each data.casePlayOptions as casePlay}
									<div class="grid grid-cols-[auto,1fr,90px] items-center gap-3 border border-stone-200 px-3 py-2">
										<input
											type="checkbox"
											name="selectedCasePlayIds"
											value={casePlay.id}
											checked={entries.has(casePlay.id)}
										/>
										<div>
											<p class="font-medium text-stone-900">{casePlay.title}</p>
											{#if casePlay.sourceKey}
												<p class="text-xs text-stone-500">source_key: {casePlay.sourceKey}</p>
											{/if}
										</div>
										<input
											type="number"
											min="1"
											name={"position:" + casePlay.id}
											value={entries.get(casePlay.id) || ''}
											placeholder="#"
											class="border border-stone-300 px-2 py-1"
										/>
									</div>
								{/each}
							</div>
						</div>

						<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
							<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
								Save Playlist
							</button>
						</div>
					</form>

					<form method="POST" action="?/delete" class="mt-4">
						<input type="hidden" name="playlistId" value={playlist.id} />
						<button class="cursor-pointer text-sm font-semibold text-red-700 hover:underline">Delete Playlist</button>
					</form>
				</section>
			{/each}
		{:else}
			<p class="text-stone-600">No playlists yet.</p>
		{/if}
	</div>
</section>
