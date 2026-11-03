<script lang="ts">
	export let active: 'element' | 'animation';
	export let onchange: (mode: 'element' | 'animation', event: MouseEvent) => void;
</script>

<div class="editor-modes" role="group" aria-label="Element editor mode">
	{#each ['element', 'animation'] as mode}<button
			type="button"
			aria-pressed={active === mode}
			on:click={(event) => onchange(mode as 'element' | 'animation', event)}>{mode === 'element' ? 'Element' : 'Animation'}</button
		>{/each}
</div>

<style>
	.editor-modes {
		display: flex;
		gap: 1px;
		padding: 1px;
		background: #a8a29e;
		flex-shrink: 0;
	}
	button {
		flex: 1;
		height: 24px;
		padding: 0 6px;
		background: #f5f5f4;
		color: #44403c;
		font:
			700 10px Inter,
			sans-serif;
		cursor: pointer;
	}
	button:hover {
		background: #e7e5e4;
	}
	button[aria-pressed='true'] {
		background: #1c1917;
		color: white;
	}
</style>
