<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CONSENT_EVENT,
		OPEN_CONSENT_EVENT,
		hasGlobalPrivacyControl,
		initializeConsent,
		loadAdSense,
		readConsent,
		saveConsent,
		type ConsentChoice
	} from '$lib/privacy/consent';

	export let googleCmpRequired = false;

	let visible = false;
	let currentChoice: ConsentChoice | null = null;
	let globalPrivacyControl = false;

	const choose = async (choice: ConsentChoice) => {
		const previousChoice = readConsent();
		saveConsent(choice);
		currentChoice = readConsent() ?? (globalPrivacyControl ? 'essential' : choice);
		visible = false;
		await loadAdSense().catch(() => undefined);
		if (previousChoice && previousChoice !== currentChoice) window.location.reload();
	};

	onMount(() => {
		initializeConsent();
		globalPrivacyControl = hasGlobalPrivacyControl();
		currentChoice = readConsent();
		if (globalPrivacyControl && currentChoice !== 'essential') {
			saveConsent('essential');
			currentChoice = 'essential';
		}
		visible = !googleCmpRequired && !globalPrivacyControl && currentChoice === null;
		if (googleCmpRequired || currentChoice !== null) loadAdSense().catch(() => undefined);

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
		<h2 id="cookie-consent-title" class="text-base font-bold text-stone-900">We Value Your Privacy</h2>
		<p class="mt-1 text-sm leading-5 text-stone-700">
			We use essential cookies to keep the site working. You can accept all cookies or reject optional
			cookies; choosing essential cookies only disables personalized advertising.
		</p>
		<p class="mt-2 text-xs text-stone-600">
			Google AdSense may still serve privacy-restricted ads when optional cookies are declined. Google’s
			certified consent platform applies additional regional requirements. Our site analytics are completely
			cookie-less and do not store or read any data on your device. You can change your choice through
			<strong>Use of Cookies</strong> in the footer. For more information, read the
			<a class="font-semibold underline" href="/cookie-policy">Cookie Policy</a> and
			<a class="font-semibold underline" href="/privacy">Privacy Policy</a>.
		</p>
		<div class="mt-4 flex flex-wrap justify-end gap-2">
			<button
				class="cursor-pointer border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900"
				on:click={() => choose('essential')}
			>
				Essential Cookies Only
			</button>
			<button
				class="cursor-pointer border-2 border-stone-900 bg-stone-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
				disabled={globalPrivacyControl}
				on:click={() => choose('all')}
			>
				Accept All Cookies
			</button>
		</div>
	</div>
{/if}
