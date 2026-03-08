<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;
</script>

<section class="space-y-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold">{data.casePlay.title}</h1>
			<p class="text-stone-600">Update the case play record, then review it on the public site.</p>
		</div>
		<a href="/c/{data.casePlay.id}" class="border border-stone-300 px-4 py-2 font-semibold hover:bg-stone-100">View Public Page</a>
	</div>

	{#if form?.error}
		<p class="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}

	<form method="POST" action="?/save" class="space-y-6 border border-stone-300 bg-white p-6 shadow-sm">
		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-1 md:col-span-2">
				<label for="title" class="text-sm font-semibold">Title</label>
				<input id="title" name="title" required value={data.casePlay.title} class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="sourceKey" class="text-sm font-semibold">Source Key</label>
				<input id="sourceKey" name="sourceKey" value={data.casePlay.sourceKey || ''} class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="edition" class="text-sm font-semibold">Edition</label>
				<input id="edition" name="edition" value={data.casePlay.edition || ''} class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1 md:col-span-2">
				<label for="filmUrl" class="text-sm font-semibold">Film URL</label>
				<input id="filmUrl" name="filmUrl" type="url" value={data.casePlay.filmUrl || ''} class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="authorId" class="text-sm font-semibold">Author</label>
				<select id="authorId" name="authorId" class="w-full border border-stone-300 px-3 py-2">
					<option value="">No author selected</option>
					{#each data.references.authors as author}
						<option value={author.id} selected={author.id === data.casePlay.authorId}>
							{author.firstName} {author.lastName}
						</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label for="rulebookId" class="text-sm font-semibold">Rulebook</label>
				<select id="rulebookId" name="rulebookId" class="w-full border border-stone-300 px-3 py-2">
					<option value="">No rulebook selected</option>
					{#each data.references.rulebooks as rulebook}
						<option value={rulebook.id} selected={rulebook.id === data.casePlay.rulebookId}>
							{rulebook.title}
						</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label for="sportId" class="text-sm font-semibold">Sport</label>
				<select id="sportId" name="sportId" class="w-full border border-stone-300 px-3 py-2">
					<option value="">No sport selected</option>
					{#each data.references.sports as sport}
						<option value={sport.id} selected={sport.id === data.casePlay.sportId}>
							{sport.name}
						</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label for="difficulty" class="text-sm font-semibold">Difficulty</label>
				<select id="difficulty" name="difficulty" class="w-full border border-stone-300 px-3 py-2">
					<option value="1" selected={data.casePlay.difficulty === 1}>Easy</option>
					<option value="2" selected={data.casePlay.difficulty === 2}>Moderate</option>
					<option value="3" selected={data.casePlay.difficulty === 3}>Hard</option>
				</select>
			</div>
			<div class="space-y-1 md:col-span-2">
				<label for="prompt" class="text-sm font-semibold">Prompt</label>
				<textarea id="prompt" name="prompt" required rows="8" class="w-full border border-stone-300 px-3 py-2">{data.casePlay.prompt}</textarea>
			</div>
			<div class="space-y-1 md:col-span-2">
				<label for="answer" class="text-sm font-semibold">Answer</label>
				<textarea id="answer" name="answer" required rows="10" class="w-full border border-stone-300 px-3 py-2">{data.casePlay.answer}</textarea>
			</div>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
				Save Changes
			</button>
			<a href="/admin/case-plays" class="border border-stone-300 px-4 py-2 font-semibold hover:bg-stone-100">Back to List</a>
		</div>
	</form>

	<form method="POST" action="?/delete" class="border border-red-300 bg-red-50 p-4">
		<h2 class="font-semibold text-red-900">Danger Zone</h2>
		<p class="mt-1 text-sm text-red-800">Deleting a case play also removes it from all playlists.</p>
		<button class="mt-3 cursor-pointer border border-red-700 bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">
			Delete Case Play
		</button>
	</form>
</section>
