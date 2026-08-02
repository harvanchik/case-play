<script lang="ts">
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	$: csrfToken = data.csrfToken || '';
	let message = '';
	let errorMessage = '';
	let savingProfile = false;
	let signingOutAll = false;
	let confirmingAccountDeletion = false;
	let deletingAccount = false;
	let deleteAuthoredContent = false;

	const requestHeaders = () => ({ 'content-type': 'application/json', 'x-caseplay-csrf': csrfToken });
	const responseMessage = async (response: Response, fallback: string) => {
		const body = (await response.json().catch(() => null)) as { message?: string } | null;
		return body?.message || fallback;
	};
	const saveProfile = async (event: SubmitEvent) => {
		if (savingProfile) return;
		savingProfile = true;
		message = '';
		errorMessage = '';
		const form = event.currentTarget as HTMLFormElement;
		const formData = new FormData(form);
		try {
			const response = await fetch('/api/account', {
				method: 'PATCH',
				headers: requestHeaders(),
				body: JSON.stringify({ firstName: formData.get('firstName'), lastName: formData.get('lastName') })
			});
			if (!response.ok) throw new Error(await responseMessage(response, 'Unable to save your profile.'));
			message = 'Profile saved.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to save your profile.';
		} finally {
			savingProfile = false;
		}
	};
	const signOutAll = async () => {
		if (signingOutAll) return;
		signingOutAll = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/account/sessions', { method: 'DELETE', headers: { 'x-caseplay-csrf': csrfToken } });
			if (!response.ok) throw new Error(await responseMessage(response, 'Unable to sign out.'));
			await goto('/account/login?error=signedout', { invalidateAll: true });
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to sign out.';
			signingOutAll = false;
		}
	};
	const deleteAccount = async () => {
		if (deletingAccount) return;
		deletingAccount = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/account', {
				method: 'DELETE',
				headers: requestHeaders(),
				body: JSON.stringify({ deleteAuthoredContent })
			});
			if (!response.ok) throw new Error(await responseMessage(response, 'Unable to delete your account.'));
			clearLocalBuilderArtifacts();
			await goto('/?account=deleted', { invalidateAll: true });
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to delete your account.';
			deletingAccount = false;
		}
	};
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
			{#if message}<p class="mt-4 border border-stone-300 bg-stone-50 p-3 text-sm text-stone-700" role="status">{message}</p>{/if}
			{#if errorMessage}<p class="mt-4 border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>{/if}
			<form class="mt-6 grid gap-4" on:submit|preventDefault={saveProfile}>
				<label class="grid gap-1 text-sm font-bold text-stone-800"
					>First name <input name="firstName" maxlength="80" value={data.account.firstName} autocomplete="given-name" /></label
				>
				<label class="grid gap-1 text-sm font-bold text-stone-800"
					>Last name <input name="lastName" maxlength="80" value={data.account.lastName} autocomplete="family-name" /></label
				>
				<label class="grid gap-1 text-sm font-bold text-stone-800"
					>Email
					<span class="relative block">
						<input
							class="w-full pr-10"
							value={data.account.email}
							disabled
							aria-disabled="true"
							aria-label="Email address managed by your sign-in provider"
						/>
						<Icon
							icon="mdi:lock-outline"
							aria-hidden="true"
							class="pointer-events-none absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-stone-500"
						/>
					</span>
				</label>
				<button class="dark-button" type="submit" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
			</form>
		</section>
		<section class="border-2 border-stone-900 bg-white p-6 shadow-[4px_4px_0_rgba(28,25,23,0.2)]">
			<h2 class="text-xl font-black tracking-tight text-stone-900">Account actions</h2>
			<p class="mt-2 text-sm text-stone-600">Manage your saved diagrams from the My Plays menu in the navigation bar.</p>
			<div class="mt-7 grid gap-3 border-t border-stone-300 pt-5">
				<button class="outline-button w-full" type="button" disabled={signingOutAll} on:click={signOutAll}>
					{signingOutAll ? 'Signing out…' : 'Sign out all devices'}
				</button>
				{#if confirmingAccountDeletion}
					<div class="border-2 border-red-700 bg-red-50 p-4">
						<p class="text-sm font-bold text-red-900">Delete your account?</p>
						<p class="mt-1 text-sm text-red-800">
							Your authored case plays and play builders will be preserved under “Deleted User” unless you select the option below.
						</p>
						<label class="mt-4 flex cursor-pointer items-start gap-2 text-sm font-semibold text-red-900">
							<input class="mt-0.5 size-4" type="checkbox" bind:checked={deleteAuthoredContent} />
							<span>Permanently delete all case plays and play builders I authored</span>
						</label>
						<div class="mt-4 grid gap-2 sm:grid-cols-2">
							<button
								class="outline-button"
								type="button"
								disabled={deletingAccount}
								on:click={() => {
									confirmingAccountDeletion = false;
									deleteAuthoredContent = false;
								}}>Cancel</button
							>
							<button class="danger-button" type="button" disabled={deletingAccount} on:click={deleteAccount}>
								{deletingAccount ? 'Deleting…' : 'Confirm deletion'}
							</button>
						</div>
					</div>
				{:else}
					<button class="danger-button w-full" type="button" on:click={() => (confirmingAccountDeletion = true)}>Delete account</button>
				{/if}
			</div>
		</section>
	</div>
	<PublicSiteFooter />
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
		cursor: pointer;
		border: 2px solid #292524;
		padding: 0.65rem 0.9rem;
		font-weight: 800;
	}
	.dark-button:disabled,
	.outline-button:disabled,
	.danger-button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
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
