<script lang="ts">
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<svelte:head>
	<title>Admin Login</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-stone-100 px-4">
	<div class="w-full max-w-md border border-stone-300 bg-white p-8 shadow-lg">
		<h1 class="font-dokdo text-5xl uppercase text-stone-900">admin login</h1>
		<p class="mt-2 text-sm text-stone-600">Sign in to manage case plays and playlists.</p>

		{#if form?.error}
			<p class="mt-4 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}

		<form method="POST" class="mt-6 space-y-4">
			<div class="space-y-1">
				<label for="email" class="text-sm font-semibold">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					class="w-full border border-stone-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
				/>
			</div>
			<div class="space-y-1">
				<label for="password" class="text-sm font-semibold">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full border border-stone-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
				/>
			</div>
			<button
				type="submit"
				class="w-full cursor-pointer border border-stone-900 bg-stone-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-stone-700"
			>
				Sign In
			</button>
		</form>
	</div>
</main>
