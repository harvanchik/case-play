<script lang="ts">
	export let compact = false;
</script>

<nav
	aria-label="Primary navigation"
	class={`relative z-40 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b border-stone-300 bg-white/90 px-4 text-sm font-semibold text-stone-700 backdrop-blur-sm ${compact ? 'py-1' : 'py-2'}`}
>
	<a href="/" class="hover:text-stone-950 hover:underline">Home</a>
	<a href="/play-builder" class="hover:text-stone-950 hover:underline">Play Builder</a>
	<a href="/about" class="hover:text-stone-950 hover:underline">About</a>
	<a href="/contact" class="hover:text-stone-950 hover:underline">Contact</a>
</nav>
