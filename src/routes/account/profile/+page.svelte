<script lang="ts">
	import Icon from '@iconify/svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;
	$: csrfToken = data.csrfToken || '';
	const clearLocalBuilderArtifacts = () => {
		try {
			localStorage.removeItem('caseplay-play-builder-edit-tokens-v1');
			for (let index = localStorage.length - 1; index >= 0; index -= 1) {
				const key = localStorage.key(index);
				if (key?.startsWith('caseplay-play-builder-draft-v1:')) localStorage.removeItem(key);
			}
		} catch {
			// Browser storage may be unavailable; the server account data is still deleted.
		}
		try {
			for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
				const key = sessionStorage.key(index);
				if (key?.startsWith('play-builder-edit:')) sessionStorage.removeItem(key);
			}
		} catch {
			// Ignore unavailable session storage.
		}
	};
</script>

<svelte:head>
	<title>Profile | CasePlay.org</title>
	<meta name="description" content="Manage your CasePlay.org profile and saved play-builder diagrams." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<PublicSiteNav />
<main class="min-h-[calc(100vh-2.25rem)] bg-stone-100 px-4 py-14">
	<div class="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
		<section class="border-2 border-stone-900 bg-white p-6 shadow-[4px_4px_0_rgba(28,25,23,0.2)]">
			<h1 class="text-2xl font-black tracking-tight text-stone-900">Profile</h1>
			<p class="mt-1 text-sm text-stone-600">Your provider account controls your sign-in email and password.</p>
			{#if form?.message}<p class="mt-4 border border-stone-300 bg-stone-50 p-3 text-sm text-stone-700" role="status">{form.message}</p>{/if}
			<form method="POST" action="?/updateProfile" class="mt-6 grid gap-4">
				<input type="hidden" name="csrf" value={csrfToken} />
				<label class="grid gap-1 text-sm font-bold text-stone-800"
					>First name <input name="firstName" maxlength="80" value={data.account.firstName} autocomplete="given-name" /></label
				>
				<label class="grid gap-1 text-sm font-bold text-stone-800"
					>Last name <input name="lastName" maxlength="80" value={data.account.lastName} autocomplete="family-name" /></label
				>
				<label class="grid gap-1 text-sm font-bold text-stone-800"
					>Email
					<span class="relative block">
						<input class="w-full pr-10" value={data.account.email} disabled aria-disabled="true" aria-label="Email address managed by your sign-in provider" />
						<Icon icon="mdi:lock-outline" aria-hidden="true" class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" />
					</span>
				</label
				>
				<button class="dark-button" type="submit">Save profile</button>
			</form>
			<div class="mt-7 border-t border-stone-300 pt-5">
				<h2 class="font-black text-stone-900">Connected providers</h2>
				<ul class="mt-2 list-inside list-disc text-sm text-stone-600">
					{#each data.providers as provider}<li class="capitalize">{provider.provider} · {provider.email}</li>{/each}
				</ul>
			</div>
		</section>
		<section class="border-2 border-stone-900 bg-white p-6 shadow-[4px_4px_0_rgba(28,25,23,0.2)]">
			<h2 class="text-xl font-black tracking-tight text-stone-900">Account actions</h2>
			<p class="mt-2 text-sm text-stone-600">Manage your saved diagrams from the My Plays menu in the navigation bar.</p>
			<div class="mt-7 grid gap-3 border-t border-stone-300 pt-5">
				<form method="POST" action="?/signOutAll">
					<input type="hidden" name="csrf" value={csrfToken} /><button class="outline-button w-full" type="submit">Sign out all devices</button>
				</form>
				<form
					method="POST"
					action="?/deleteAccount"
					on:submit={(event) => {
						if (!confirm('Delete your account and saved diagrams? This cannot be undone.')) event.preventDefault();
						else clearLocalBuilderArtifacts();
					}}
				>
					<input type="hidden" name="csrf" value={csrfToken} /><input type="hidden" name="confirm" value="delete" /><button
						class="danger-button w-full"
						type="submit">Delete account</button
					>
				</form>
			</div>
		</section>
	</div>
</main>

<style>
	input {
		border: 2px solid #a8a29e;
		padding: 0.55rem 0.65rem;
		font-weight: 600;
		color: #292524;
	}
	input:focus {
		outline: 3px solid #6faf7d;
		outline-offset: 1px;
	}
	input:disabled {
		cursor: not-allowed;
		background: #f5f5f4;
		color: #57534e;
		opacity: 1;
	}
	.dark-button,
	.outline-button,
	.danger-button {
		border: 2px solid #292524;
		padding: 0.65rem 0.9rem;
		font-weight: 800;
	}
	.dark-button {
		background: #1c1917;
		color: white;
	}
	.outline-button {
		background: white;
		color: #292524;
	}
	.danger-button {
		border-color: #b91c1c;
		color: #b91c1c;
		background: white;
	}
	.dark-button:hover,
	.outline-button:hover {
		background: #e7e5e4;
	}
	.danger-button:hover {
		background: #fef2f2;
	}
</style>
