<nav
	data-public-site-nav
	aria-label="Primary navigation"
	class="fixed inset-x-0 top-0 z-40 flex min-h-9 flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b border-stone-300 bg-white/90 px-4 py-2 text-sm font-semibold text-stone-700 backdrop-blur-sm"
>
	<a href="/" class="nav-link underline-offset-4">Home</a>
	<div class="play-builder-group relative">
		<a
			href="/play-builder"
			aria-haspopup="menu"
			class="nav-link underline-offset-4 focus-visible:text-stone-950 focus-visible:underline"
		>
			Play Builder
		</a>
		<div
			class="play-builder-menu invisible absolute top-full left-1/2 z-50 w-56 -translate-x-1/2 pt-2 opacity-0 transition-opacity duration-150"
		>
			<div class="border-2 border-stone-900 bg-white py-1 text-left shadow-[4px_4px_0_rgba(28,25,23,0.22)]" role="menu">
				<a
					href="/play-builder"
					role="menuitem"
					class="play-builder-menu-link block px-3 py-2 text-stone-800 underline-offset-4 focus-visible:bg-stone-100 focus-visible:underline"
				>
					Flag Football
				</a>
				{#each ['Basketball', 'Soccer', 'Volleyball', 'Floor Hockey', 'Softball'] as sport}
					<div
						role="menuitem"
						aria-disabled="true"
						class="flex cursor-not-allowed items-baseline justify-between gap-2 px-3 py-2 text-stone-500"
					>
						<span>{sport}</span>
						<span class="text-[0.58rem] font-bold tracking-wider text-stone-400 uppercase">Coming Soon</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
	<a href="/about" class="nav-link underline-offset-4">About</a>
	<a href="/contact" class="nav-link underline-offset-4">Contact</a>
</nav>

<style>
	.nav-link:hover {
		color: var(--color-stone-950);
		text-decoration-line: underline;
	}

	.play-builder-group:hover .play-builder-menu,
	.play-builder-group:focus-within .play-builder-menu {
		visibility: visible;
		opacity: 1;
	}

	.play-builder-menu-link:hover {
		background-color: var(--color-stone-100);
		color: var(--color-stone-950);
		text-decoration-line: underline;
	}
</style>
