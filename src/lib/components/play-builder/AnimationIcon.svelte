<script lang="ts">
	export let name:
		'tutorial' | 'timeline-start' | 'timeline-end' | 'rewind' | 'fast-forward' | 'ghost' | 'repeat' | 'reset' | 'play' | 'pause' | 'start' | 'end' | 'settings' | 'close' | 'plus' | 'minus' | 'copy' | 'trash' | 'clock' | 'motion' | 'edit' | 'draw' | 'check';
	const paths = {
        tutorial: 'M4 5h16v11H9l-4 3v-3H4z',
        'timeline-start': 'M3 5v14M12 5l-7 7 7 7ZM21 5l-7 7 7 7Z',
        'timeline-end': 'M21 5v14M3 5l7 7-7 7ZM12 5l7 7-7 7Z',
        rewind: 'M11 5l-8 7 8 7ZM21 5l-8 7 8 7Z',
        'fast-forward': 'M3 5l8 7-8 7ZM13 5l8 7-8 7Z',
		ghost: 'M4 21V10a8 8 0 0 1 16 0v11l-4-3-4 3-4-3-4 3ZM9 9v2M15 9v2',
  repeat: 'm17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
		reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
		play: 'm8 5 11 7-11 7Z',
		pause: 'M9 4v16M15 4v16',
		start: 'M4 5v14M19 5l-9 7 9 7Z',
		end: 'M20 5v14M5 5l9 7-9 7Z',
		settings:
			'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9.5 3h5l.6 2.3 2 .9 2.2-.7 2.5 4.3-1.6 1.7v2.2l1.6 1.7-2.5 4.3-2.2-.7-2 .9-.6 2.3h-5l-.6-2.3-2-.9-2.2.7-2.5-4.3 1.6-1.7v-2.2L2.2 9.8l2.5-4.3 2.2.7 2-.9Z',
		close: 'M6 6l12 12M6 18 18 6',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		copy: 'M9 9h12v12H9ZM5 15H3V3h12v2',
		trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
		clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
		motion: 'M3 17C3 3 21 21 21 7M16 7h5v5',
		edit: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
		draw: 'm16 3 5 5-12 12-6 1 1-6ZM14 5l5 5',
		check: 'm5 12 4 4L19 6'
	};
</script>

<svg
	width="16"
	height="16"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
 {#if name === 'tutorial'}<path d="m9 8 6 3-6 3z" fill="currentColor" stroke="none" />{/if}
</svg>
