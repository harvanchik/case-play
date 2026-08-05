<script lang="ts">
	import FlagFootballSocialPreviewPage from '../../../play-builder/social-preview/+page.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<FlagFootballSocialPreviewPage {data} />
