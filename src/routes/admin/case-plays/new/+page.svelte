<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;
</script>

<section class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold">New Case Play</h1>
		<p class="text-stone-600">Create a new case play record. Reference fields can stay blank until the catalog is populated.</p>
	</div>

	{#if form?.error}
		<p class="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}

	<form method="POST" class="space-y-6 border border-stone-300 bg-white p-6 shadow-sm">
		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-1 md:col-span-2">
				<label for="title" class="text-sm font-semibold">Title</label>
				<input id="title" name="title" required class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="sourceKey" class="text-sm font-semibold">Source Key</label>
				<input id="sourceKey" name="sourceKey" class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="edition" class="text-sm font-semibold">Edition</label>
				<input id="edition" name="edition" class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="ruleReference" class="text-sm font-semibold">Rule Reference</label>
				<input id="ruleReference" name="ruleReference" placeholder="10-4-5F" class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="pageNumber" class="text-sm font-semibold">Page Number</label>
				<input id="pageNumber" name="pageNumber" type="number" min="1" step="1" class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1 md:col-span-2">
				<label for="filmUrl" class="text-sm font-semibold">Film URL</label>
				<input id="filmUrl" name="filmUrl" type="url" class="w-full border border-stone-300 px-3 py-2" />
			</div>
			<div class="space-y-1">
				<label for="authorId" class="text-sm font-semibold">Author</label>
				<select id="authorId" name="authorId" class="w-full border border-stone-300 px-3 py-2">
					<option value="">No author selected</option>
					{#each data.references.authors as author}
						<option value={author.id}>{author.firstName} {author.lastName}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label for="rulebookId" class="text-sm font-semibold">Rulebook</label>
				<select id="rulebookId" name="rulebookId" class="w-full border border-stone-300 px-3 py-2">
					<option value="">No rulebook selected</option>
					{#each data.references.rulebooks as rulebook}
						<option value={rulebook.id}>{rulebook.title}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label for="sportId" class="text-sm font-semibold">Sport</label>
				<select id="sportId" name="sportId" class="w-full border border-stone-300 px-3 py-2">
					<option value="">No sport selected</option>
					{#each data.references.sports as sport}
						<option value={sport.id}>{sport.name}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-1">
				<label for="difficulty" class="text-sm font-semibold">Difficulty</label>
				<select id="difficulty" name="difficulty" class="w-full border border-stone-300 px-3 py-2">
					<option value="1">Easy</option>
					<option value="2">Moderate</option>
					<option value="3">Hard</option>
				</select>
			</div>
			<div class="space-y-1 md:col-span-2">
				<label for="prompt" class="text-sm font-semibold">Prompt</label>
				<textarea id="prompt" name="prompt" required rows="8" class="w-full border border-stone-300 px-3 py-2"></textarea>
			</div>
			<div class="space-y-1 md:col-span-2">
				<label for="answer" class="text-sm font-semibold">Answer</label>
				<textarea id="answer" name="answer" required rows="10" class="w-full border border-stone-300 px-3 py-2"></textarea>
			</div>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
				Create Case Play
			</button>
			<a href="/admin/reference" class="border border-stone-300 px-4 py-2 font-semibold hover:bg-stone-100"> Manage Reference Data </a>
		</div>
	</form>
</section>
