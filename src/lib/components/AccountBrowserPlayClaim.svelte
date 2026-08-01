<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	export let csrfToken: string;

	const editTokensStorageKey = 'caseplay-play-builder-edit-tokens-v1';
	const playIdPattern = /^[A-Za-z0-9_-]{12}$/;

	onMount(() => {
		const claim = async () => {
			let storedTokens: Record<string, string>;
			try {
				const raw = localStorage.getItem(editTokensStorageKey);
				const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
				storedTokens = Object.fromEntries(
					Object.entries(parsed).filter(
						(entry): entry is [string, string] => playIdPattern.test(entry[0]) && typeof entry[1] === 'string' && entry[1].length > 0
					)
				);
			} catch {
				return;
			}

			const plays = Object.entries(storedTokens).map(([id, editToken]) => ({ id, editToken }));
			if (!plays.length) return;

			try {
				const response = await fetch('/api/account/claim-plays', {
					method: 'POST',
					headers: { 'content-type': 'application/json', 'x-caseplay-csrf': csrfToken },
					body: JSON.stringify({ plays })
				});
				if (!response.ok) return;
				const result = (await response.json()) as { claimed?: unknown };
				const claimed = Array.isArray(result.claimed) ? result.claimed.filter((id): id is string => playIdPattern.test(String(id))) : [];
				if (!claimed.length) return;

				for (const id of claimed) {
					delete storedTokens[id];
					try {
						sessionStorage.removeItem(`play-builder-edit:${id}`);
					} catch {
						// Session storage cleanup is best-effort.
					}
				}
				if (Object.keys(storedTokens).length) localStorage.setItem(editTokensStorageKey, JSON.stringify(storedTokens));
				else localStorage.removeItem(editTokensStorageKey);
				await invalidateAll();
			} catch {
				// A failed background claim can be retried on the next authenticated page load.
			}
		};

		void claim();
	});
</script>

<span class="sr-only" aria-live="polite"> </span>
