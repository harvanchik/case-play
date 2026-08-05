<script lang="ts">
	import FlagFootballDiagramPage from '../../play-builder/+page.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<FlagFootballDiagramPage {data} />
