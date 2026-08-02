<script lang="ts">
	import { page } from '$app/stores';
	import PublicNavDropdown from './PublicNavDropdown.svelte';
	$: accountUser = $page.data?.accountUser;
</script>

<nav
	data-public-site-nav
	aria-label="Primary navigation"
	class="public-site-nav-glass fixed inset-x-0 top-0 z-40 flex min-h-9 flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b border-white/80 px-4 py-2 text-sm font-semibold text-stone-700 shadow-[0_2px_10px_rgba(28,25,23,0.08)]"
>
	<a href="/" class="nav-link underline-offset-4">Home</a>
	<PublicNavDropdown
		label="Play Builder"
		href="/play-builder"
		align="left"
		items={[
			{ label: 'Flag Football', href: '/play-builder' },
			...['Basketball', 'Soccer', 'Volleyball', 'Floor Hockey', 'Softball'].map((sport) => ({ label: sport, disabled: true, suffix: 'Coming Soon' }))
		]}
	/>
	<a href="/about" class="nav-link underline-offset-4">About</a>
	<a href="/contact" class="nav-link underline-offset-4">Contact</a>
	<div class="account-links absolute right-4 flex items-center gap-3">
		{#if accountUser}
			<PublicNavDropdown
				label="Profile"
				href="/account/profile"
				align="right"
				csrfToken={$page.data?.accountCsrfToken ?? null}
				items={[
					{ label: 'My Plays', href: '/account/plays' },
					{ label: 'Account Settings', href: '/account/profile' },
					{ label: 'Sign Out', href: '/api/account/session', action: 'signout', danger: true }
				]}
			/>
		{:else}
			<a href="/account/login" class="nav-link underline-offset-4">Log in</a>
			<a href="/account/login?mode=signup" class="nav-link underline-offset-4">Sign up</a>
		{/if}
	</div>
</nav>

<style>
	.public-site-nav-glass {
		background-color: rgb(255 255 255 / 52%);
		-webkit-backdrop-filter: blur(16px) saturate(150%);
		backdrop-filter: blur(16px) saturate(150%);
	}

	.nav-link:hover {
		color: var(--color-stone-950);
		text-decoration-line: underline;
	}

	@media (max-width: 640px) {
		.account-links {
			position: static;
			width: 100%;
			justify-content: center;
		}
	}
</style>
