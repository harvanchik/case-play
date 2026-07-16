<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CONSENT_EVENT,
		OPEN_CONSENT_EVENT,
		hasGlobalPrivacyControl,
		initializeConsentMode,
		loadAdSense,
		openConsentChoices,
		readConsent,
		saveConsent,
		type ConsentChoice
	} from '$lib/privacy/consent';

	let visible = false;
	let currentChoice: ConsentChoice | null = null;
	let globalPrivacyControl = false;

	const choose = async (choice: ConsentChoice) => {
		const advertisingWasLoaded = currentChoice === 'all';
		saveConsent(choice);
		currentChoice = readConsent() ?? (globalPrivacyControl ? 'essential' : choice);
		visible = false;
		if (advertisingWasLoaded && currentChoice === 'essential') {
			window.location.reload();
			return;
		}
		if (currentChoice === 'all') await loadAdSense().catch(() => undefined);
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
		if (currentChoice === 'all' && !globalPrivacyControl) loadAdSense().catch(() => undefined);

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
		<div class="flex items-start justify-between gap-4">
			<div>
				<h2 id="cookie-consent-title" class="text-base font-bold text-stone-900">Your Privacy Choices</h2>
				<p class="mt-1 text-sm leading-5 text-stone-700">
					Essential storage keeps requested features and your privacy choice working. Advertising and measurement stay off unless you choose Allow All.
				</p>
				{#if globalPrivacyControl}
					<p class="mt-2 text-xs font-semibold text-stone-700">Your browser's Global Privacy Control is on, so optional advertising remains disabled.</p>
				{/if}
				<p class="mt-2 text-xs text-stone-600">
					Read the <a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
					<a class="font-semibold underline" href="/privacy">Privacy Policy</a>. You can change this choice at any time.
				</p>
			</div>
		</div>
		<div class="mt-4 flex flex-wrap justify-end gap-2">
			<button class="cursor-pointer border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900" on:click={() => choose('essential')}>
				Essential Only
			</button>
			<button
				class="cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
				disabled={globalPrivacyControl}
				on:click={() => choose('all')}
			>
				Allow All
			</button>
		</div>
	</div>
{:else if currentChoice !== null}
	<button
		class="fixed bottom-0 left-0 z-[9999] cursor-pointer border border-stone-700 bg-white/95 px-2 py-1 text-[10px] font-semibold text-stone-700"
		on:click={openConsentChoices}
		aria-label="Open privacy choices"
	>
		Privacy Choices
	</button>
{/if}
