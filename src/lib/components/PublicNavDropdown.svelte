<script context="module" lang="ts">
	export type PublicNavDropdownItem = {
		label: string;
		href?: string;
		action?: 'signout';
		danger?: boolean;
		disabled?: boolean;
		suffix?: string;
	};
</script>

<script lang="ts">
	import { goto } from '$app/navigation';

	export let label: string;
	export let href: string;
	export let items: PublicNavDropdownItem[] = [];
	export let menuLabel: string | undefined = undefined;
	export let align: 'left' | 'center' | 'right' = 'left';
	export let csrfToken: string | null = null;
	let signingOut = false;
	const runItemAction = async (item: PublicNavDropdownItem) => {
		if (item.action !== 'signout' || signingOut) return;
		signingOut = true;
		try {
			const response = await fetch(item.href || '/api/account/session', {
				method: 'DELETE',
				headers: { 'x-caseplay-csrf': csrfToken ?? '' }
			});
			if (!response.ok) throw new Error('Unable to sign out.');
			await goto('/', { invalidateAll: true });
		} catch {
			// Keep the current authenticated view intact when the background request fails.
		} finally {
			signingOut = false;
		}
	};
</script>

<div class="nav-dropdown-group relative">
	<a
		{href}
		aria-haspopup="menu"
		class={`nav-dropdown-trigger underline-offset-4 focus-visible:text-stone-950 focus-visible:underline ${align === 'right' ? 'text-right' : ''}`}
	>
		{label}
	</a>
	<div
		class={`nav-dropdown-menu invisible absolute top-full z-50 pt-2 opacity-0 transition-opacity duration-150 ${align === 'right' ? 'right-0 w-max' : align === 'left' ? 'left-0 w-56' : 'left-1/2 w-56 -translate-x-1/2'}`}
	>
		<div
			class={`border-2 border-stone-900 bg-white py-1 shadow-[4px_4px_0_rgba(28,25,23,0.22)] ${align === 'right' ? 'text-right' : 'text-left'}`}
			role="menu"
			aria-label={menuLabel ?? `${label} menu`}
		>
			{#each items as item}
				{#if item.disabled}
					<div role="menuitem" aria-disabled="true" class="flex cursor-not-allowed items-baseline justify-between gap-2 px-3 py-2 text-stone-500">
						<span>{item.label}</span>
						{#if item.suffix}<span class="text-[0.58rem] font-bold tracking-wider text-stone-400 uppercase">{item.suffix}</span>{/if}
					</div>
				{:else if item.href}
					{#if item.action === 'signout'}
						<button
							type="button"
							role="menuitem"
							disabled={signingOut}
							on:click={() => runItemAction(item)}
							class={`nav-dropdown-item nav-dropdown-danger block w-full cursor-pointer px-3 py-2 text-stone-800 underline-offset-4 focus-visible:bg-stone-100 focus-visible:underline ${align === 'right' ? 'text-right' : 'text-left'}`}
						>
							{signingOut ? 'Signing Out…' : item.label}
						</button>
					{:else}
						<a
							href={item.href}
							role="menuitem"
							class={`nav-dropdown-item block px-3 py-2 underline-offset-4 focus-visible:bg-stone-100 focus-visible:underline ${align === 'right' ? 'text-right' : 'text-left'} ${item.danger ? 'nav-dropdown-danger' : 'text-stone-800'}`}
						>
							{item.label}
						</a>
					{/if}
				{/if}
			{/each}
		</div>
	</div>
</div>

<style>
	.nav-dropdown-trigger:hover {
		color: var(--color-stone-950);
		text-decoration-line: underline;
	}

	.nav-dropdown-group:hover .nav-dropdown-menu,
	.nav-dropdown-group:focus-within .nav-dropdown-menu {
		visibility: visible;
		opacity: 1;
	}

	.nav-dropdown-item:hover {
		background-color: var(--color-stone-100);
		color: var(--color-stone-950);
		text-decoration-line: underline;
	}

	.nav-dropdown-danger {
		color: #b91c1c;
	}

	.nav-dropdown-danger:hover {
		color: #991b1b;
	}
</style>
