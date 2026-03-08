<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;
</script>

<section class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold">Reference Data</h1>
		<p class="text-stone-600">Maintain authors, rulebooks, and sports used by case play records.</p>
	</div>

	{#if form?.error}
		<p class="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}

	<div class="grid gap-6 xl:grid-cols-3">
		<section class="space-y-4 border border-stone-300 bg-white p-5 shadow-sm">
			<h2 class="text-xl font-semibold">Authors</h2>
			<form method="POST" action="?/saveAuthor" class="grid gap-3">
				<input name="firstName" placeholder="First name" class="border border-stone-300 px-3 py-2" />
				<input name="lastName" placeholder="Last name" class="border border-stone-300 px-3 py-2" />
				<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
					Add Author
				</button>
			</form>
			<div class="space-y-3">
				{#each data.references.authors as author}
					<div class="border border-stone-200 p-3">
						<form method="POST" action="?/saveAuthor" class="grid gap-2">
							<input type="hidden" name="id" value={author.id} />
							<input name="firstName" value={author.firstName} class="border border-stone-300 px-3 py-2" />
							<input name="lastName" value={author.lastName} class="border border-stone-300 px-3 py-2" />
							<div class="flex gap-2">
								<button class="cursor-pointer border border-stone-900 bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">
									Save
								</button>
							</div>
						</form>
						<form method="POST" action="?/deleteAuthor" class="mt-2">
							<input type="hidden" name="id" value={author.id} />
							<button class="cursor-pointer text-sm font-semibold text-red-700 hover:underline">Delete</button>
						</form>
					</div>
				{/each}
			</div>
		</section>

		<section class="space-y-4 border border-stone-300 bg-white p-5 shadow-sm">
			<h2 class="text-xl font-semibold">Rulebooks</h2>
			<form method="POST" action="?/saveRulebook" class="grid gap-3">
				<input name="title" placeholder="Title" class="border border-stone-300 px-3 py-2" />
				<input name="slug" placeholder="Slug (optional)" class="border border-stone-300 px-3 py-2" />
				<input name="nickname" placeholder="Nickname" class="border border-stone-300 px-3 py-2" />
				<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
					Add Rulebook
				</button>
			</form>
			<div class="space-y-3">
				{#each data.references.rulebooks as rulebook}
					<div class="border border-stone-200 p-3">
						<form method="POST" action="?/saveRulebook" class="grid gap-2">
							<input type="hidden" name="id" value={rulebook.id} />
							<input name="title" value={rulebook.title} class="border border-stone-300 px-3 py-2" />
							<input name="slug" value={rulebook.slug} class="border border-stone-300 px-3 py-2" />
							<input name="nickname" value={rulebook.nickname || ''} class="border border-stone-300 px-3 py-2" />
							<button class="cursor-pointer border border-stone-900 bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">
								Save
							</button>
						</form>
						<form method="POST" action="?/deleteRulebook" class="mt-2">
							<input type="hidden" name="id" value={rulebook.id} />
							<button class="cursor-pointer text-sm font-semibold text-red-700 hover:underline">Delete</button>
						</form>
					</div>
				{/each}
			</div>
		</section>

		<section class="space-y-4 border border-stone-300 bg-white p-5 shadow-sm">
			<h2 class="text-xl font-semibold">Sports</h2>
			<form method="POST" action="?/saveSport" class="grid gap-3">
				<input name="name" placeholder="Name" class="border border-stone-300 px-3 py-2" />
				<input name="slug" placeholder="Slug (optional)" class="border border-stone-300 px-3 py-2" />
				<button class="cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-700">
					Add Sport
				</button>
			</form>
			<div class="space-y-3">
				{#each data.references.sports as sport}
					<div class="border border-stone-200 p-3">
						<form method="POST" action="?/saveSport" class="grid gap-2">
							<input type="hidden" name="id" value={sport.id} />
							<input name="name" value={sport.name} class="border border-stone-300 px-3 py-2" />
							<input name="slug" value={sport.slug} class="border border-stone-300 px-3 py-2" />
							<button class="cursor-pointer border border-stone-900 bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">
								Save
							</button>
						</form>
						<form method="POST" action="?/deleteSport" class="mt-2">
							<input type="hidden" name="id" value={sport.id} />
							<button class="cursor-pointer text-sm font-semibold text-red-700 hover:underline">Delete</button>
						</form>
					</div>
				{/each}
			</div>
		</section>
	</div>
</section>
