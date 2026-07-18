<script lang="ts">
	import { openAdPrivacyChoices, openConsentChoices } from '$lib/privacy/consent';
	export let context: 'database' | 'play-builder' | 'general' = 'general';
</script>

<footer class="w-full py-3 text-center text-stone-600">
	{#if context === 'database'}
		<p class="text-sm">This database was created in 2023 by Jake Harvanchik to help train intramural officials.</p>
	{:else if context === 'play-builder'}
		<p class="text-sm">This play builder was created in 2026 by Jake Harvanchik to help train intramural flag football officials.</p>
	{:else}
		<p class="text-sm">Caseplay.org is an independent educational resource for sports officials.</p>
	{/if}
	<div class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
		<span>&copy; {new Date().getFullYear()} caseplay.org</span>
		<a href="/about" class="font-semibold hover:underline">About</a>
		<a href="/contact" class="font-semibold hover:underline">Contact</a>
		<a href="mailto:create@caseplay.org" class="font-semibold hover:underline">Contribute</a>
		<a href="/privacy" class="font-semibold hover:underline">Privacy</a>
		<a href="/cookie-policy" class="font-semibold hover:underline">Cookies</a>
		<button type="button" class="cursor-pointer font-semibold hover:underline" on:click={openAdPrivacyChoices}>Ad Privacy</button>
		<button type="button" class="cursor-pointer font-semibold hover:underline" on:click={openConsentChoices}>Analytics</button>
	</div>
</footer>
