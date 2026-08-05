<script lang="ts">
	import SavedFlagFootballDiagramPage from '../../../play-builder/[playId]/+page.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<SavedFlagFootballDiagramPage {data} />
