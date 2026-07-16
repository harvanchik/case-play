<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CONSENT_EVENT,
		OPEN_CONSENT_EVENT,
		hasGlobalPrivacyControl,
		initializeConsentMode,
		loadAdSense,
		readConsent,
		saveConsent,
		type ConsentChoice
	} from '$lib/privacy/consent';

	let visible = false;
	let currentChoice: ConsentChoice | null = null;
	let globalPrivacyControl = false;

	const choose = async (choice: ConsentChoice) => {
		const previousChoice = currentChoice;
		saveConsent(choice);
		currentChoice = readConsent() ?? (globalPrivacyControl ? 'essential' : choice);
		visible = false;
		if (previousChoice !== null && previousChoice !== currentChoice) {
			window.location.reload();
			return;
		}
		await loadAdSense().catch(() => undefined);
	};

	onMount(() => {
		initializeConsentMode();
		globalPrivacyControl = hasGlobalPrivacyControl();
		currentChoice = readConsent();
		if (globalPrivacyControl && currentChoice === 'all') {
			saveConsent('essential');
			currentChoice = 'essential';
		}
		visible = currentChoice === null;
		if (currentChoice !== null) loadAdSense().catch(() => undefined);

		const open = () => (visible = true);
		const changed = (event: Event) => {
			currentChoice = (event as CustomEvent<ConsentChoice>).detail;
		};
		window.addEventListener(OPEN_CONSENT_EVENT, open);
		window.addEventListener(CONSENT_EVENT, changed);
		return () => {
			window.removeEventListener(OPEN_CONSENT_EVENT, open);
			window.removeEventListener(CONSENT_EVENT, changed);
		};
	});
</script>

{#if visible}
	<div
		class="fixed bottom-3 left-1/2 z-[10000] w-[min(680px,calc(100vw-1.5rem))] -translate-x-1/2 border-2 border-stone-900 bg-white p-4 shadow-[5px_5px_0_rgba(28,25,23,0.35)]"
		role="dialog"
		aria-modal="false"
		aria-labelledby="cookie-consent-title"
	>
		<h2 id="cookie-consent-title" class="text-base font-bold text-stone-900">Your Privacy Choices</h2>
		<p class="mt-1 text-sm leading-5 text-stone-700">
			Ads always help fund Caseplay. Choose Generic Ads to keep optional tracking and personalization off, or allow personalized ads and measurement.
		</p>
		<p class="mt-2 text-sm font-semibold leading-5 text-stone-800">Ad revenue pays for the domain, hosting, and database.</p>
		{#if globalPrivacyControl}
			<p class="mt-2 text-xs font-semibold text-stone-700">Your browser's Global Privacy Control is on, so only generic ads are available.</p>
		{/if}
		<p class="mt-2 text-xs text-stone-600">
			Read the <a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="/privacy">Privacy Policy</a>. You can change this choice at any time.
		</p>
		<div class="mt-4 flex flex-wrap justify-end gap-2">
			<button class="cursor-pointer border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900" on:click={() => choose('essential')}>
				Generic Ads
			</button>
			<button
				class="cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
				disabled={globalPrivacyControl}
				on:click={() => choose('all')}
			>
				Allow Personalized Ads
			</button>
		</div>
	</div>
{/if}
