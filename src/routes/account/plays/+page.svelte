<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	type PlaySummary = PageData['plays'][number];
	type PlayMutationResponse = { play?: PlaySummary; message?: string };

	let plays: PlaySummary[] = [...data.plays];
	let loadedPreviews: Record<string, boolean> = {};
	let renamingPlayId: string | null = null;
	let confirmingDeletePlayId: string | null = null;
	let titleInput: HTMLInputElement | null = null;
	let renameValue = '';
	let mutationError = '';
	let pendingPlayIds: Record<string, boolean> = {};
	let pressedPlayId: string | null = null;
	$: csrfToken = data.csrfToken || '';

	const markPreviewLoaded = (playId: string) => {
		loadedPreviews = { ...loadedPreviews, [playId]: true };
	};

	const formatUpdatedAt = (value: string) =>
		new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'America/Los_Angeles'
		}).format(new Date(value));

	const setPending = (playId: string, pending: boolean) => {
		pendingPlayIds = { ...pendingPlayIds, [playId]: pending };
	};

	const isTemporaryPlay = (playId: string) => playId.startsWith('pending-');
	const newestFirst = (items: PlaySummary[]) => [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unable to update your plays.');

	const requestPlayMutation = async (method: 'PATCH' | 'POST' | 'DELETE', playId: string, body?: Record<string, unknown>) => {
		const response = await fetch(`/api/account/plays/${encodeURIComponent(playId)}`, {
			method,
			headers: {
				Accept: 'application/json',
				'x-caseplay-csrf': csrfToken,
				...(body ? { 'Content-Type': 'application/json' } : {})
			},
			body: body ? JSON.stringify(body) : undefined
		});
		const result = (await response.json().catch(() => ({}))) as PlayMutationResponse;
		if (!response.ok) throw new Error(result.message || 'Unable to update your plays.');
		return result;
	};

	const beginRename = async (play: PlaySummary) => {
		mutationError = '';
		confirmingDeletePlayId = null;
		renamingPlayId = play.id;
		renameValue = play.title;
		await tick();
		titleInput?.focus();
		titleInput?.setSelectionRange(renameValue.length, renameValue.length);
	};

	const cancelRename = () => {
		renamingPlayId = null;
		renameValue = '';
	};

	const commitRename = async (play: PlaySummary) => {
		if (pendingPlayIds[play.id]) return;
		const title = renameValue.trim().replace(/\s+/g, ' ');
		if (!title || title.length > 64) {
			mutationError = 'Enter a play name between 1 and 64 characters.';
			titleInput?.focus();
			return;
		}
		if (title === play.title) {
			cancelRename();
			return;
		}

		const original = play;
		const optimistic = { ...play, title, updatedAt: new Date().toISOString() };
		plays = newestFirst(plays.map((item) => (item.id === play.id ? optimistic : item)));
		cancelRename();
		mutationError = '';
		setPending(play.id, true);
		try {
			const result = await requestPlayMutation('PATCH', play.id, { title });
			if (!result.play) throw new Error('The renamed play was not returned.');
			plays = newestFirst(plays.map((item) => (item.id === play.id ? result.play! : item)));
		} catch (error) {
			plays = newestFirst([...plays.filter((item) => item.id !== play.id), original]);
			mutationError = errorMessage(error);
		} finally {
			setPending(play.id, false);
		}
	};

	const duplicatePlay = async (play: PlaySummary) => {
		if (pendingPlayIds[play.id] || isTemporaryPlay(play.id)) return;
		const temporaryId = `pending-${crypto.randomUUID()}`;
		const optimistic: PlaySummary = {
			...play,
			id: temporaryId,
			title: `${play.title.slice(0, 59)} Copy`,
			updatedAt: new Date().toISOString()
		};
		loadedPreviews = { ...loadedPreviews, [temporaryId]: Boolean(loadedPreviews[play.id]) };
		plays = newestFirst([optimistic, ...plays]);
		mutationError = '';
		setPending(play.id, true);
		setPending(temporaryId, true);
		try {
			const result = await requestPlayMutation('POST', play.id);
			if (!result.play) throw new Error('The duplicated play was not returned.');
			plays = newestFirst(plays.map((item) => (item.id === temporaryId ? result.play! : item)));
			loadedPreviews = { ...loadedPreviews, [result.play.id]: Boolean(loadedPreviews[temporaryId]) };
		} catch (error) {
			plays = plays.filter((item) => item.id !== temporaryId);
			mutationError = errorMessage(error);
		} finally {
			setPending(play.id, false);
			setPending(temporaryId, false);
		}
	};

	const deletePlay = async (play: PlaySummary) => {
		if (pendingPlayIds[play.id] || isTemporaryPlay(play.id)) return;
		plays = plays.filter((item) => item.id !== play.id);
		confirmingDeletePlayId = null;
		mutationError = '';
		setPending(play.id, true);
		try {
			await requestPlayMutation('DELETE', play.id);
		} catch (error) {
			plays = newestFirst([...plays, play]);
			mutationError = errorMessage(error);
		} finally {
			setPending(play.id, false);
		}
	};

	const handleDeleteButtonClick = (play: PlaySummary) => {
		if (renamingPlayId === play.id) {
			cancelRename();
			return;
		}
		if (confirmingDeletePlayId === play.id) {
			void deletePlay(play);
			return;
		}
		confirmingDeletePlayId = play.id;
	};

	const handlePageClick = (event: MouseEvent) => {
		const target = event.target;
		if (renamingPlayId) {
			const renameControl = target instanceof Element ? target.closest<HTMLElement>('[data-rename-control]') : null;
			if (renameControl?.dataset.renameControl !== renamingPlayId) cancelRename();
		}
		if (!confirmingDeletePlayId) return;
		if (target instanceof Element && target.closest('[data-delete-control]')) return;
		confirmingDeletePlayId = null;
	};

	const handleCardPointerDown = (event: PointerEvent, playId: string) => {
		const target = event.target;
		if (!(target instanceof Element) || target.closest('[data-card-actions], input')) return;
		pressedPlayId = playId;
	};

	const clearCardPress = () => {
		pressedPlayId = null;
	};

	onMount(() => {
		for (const image of document.querySelectorAll<HTMLImageElement>('img[data-play-preview]')) {
			if (image.complete) markPreviewLoaded(image.dataset.playPreview ?? '');
		}
	});
</script>

<svelte:window on:click={handlePageClick} on:pointerup={clearCardPress} on:pointercancel={clearCardPress} />

<svelte:head>
	<title>My Plays | CasePlay.org</title>
	<meta name="description" content="View and manage your saved Flag Football Play Builder diagrams." />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<PublicSiteNav />
<main class="min-h-[calc(100vh-2.25rem)] bg-stone-100 px-4 py-14">
	<div class="mx-auto w-full max-w-5xl">
		<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="text-3xl font-black tracking-tight text-stone-900">My Plays</h1>
				<p class="mt-1 text-sm text-stone-600">Your saved diagrams from the Flag Football Play Builder.</p>
			</div>
			<a
				href="/play-builder"
				class="inline-flex h-10 items-center gap-2 border-2 border-stone-900 bg-stone-900 px-4 text-sm font-black text-white shadow-[3px_3px_0_rgba(28,25,23,0.22)] transition-colors hover:bg-stone-700 focus-visible:outline-4 focus-visible:outline-[#6faf7d] active:translate-0.5 active:shadow-none"
			>
				<Icon icon="material-symbols:add-circle-outline" class="h-5 w-5" aria-hidden="true" />
				New Play
			</a>
		</header>
		{#if mutationError}
			<p class="mb-5 border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{mutationError}</p>
		{/if}
		{#if plays.length}
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each plays as play (play.id)}
					<article
						class={`min-w-0 overflow-hidden border-2 border-stone-900 bg-white transition-[transform,box-shadow] duration-75 ease-out ${pressedPlayId === play.id ? 'translate-x-0.5 translate-y-0.5 shadow-none' : 'shadow-[4px_4px_0_rgba(28,25,23,0.2)]'}`}
						on:pointerdown={(event) => handleCardPointerDown(event, play.id)}
					>
						<a
							href={isTemporaryPlay(play.id) ? undefined : `/play-builder/${play.id}`}
							aria-disabled={isTemporaryPlay(play.id)}
							class={`block min-w-0 focus-visible:outline-4 focus-visible:outline-[#6faf7d] ${isTemporaryPlay(play.id) ? 'pointer-events-none' : ''}`}
						>
							<div
								class="relative w-full shrink-0 overflow-hidden border-b-2 border-stone-900 bg-stone-800"
								style="aspect-ratio: 1000 / 484;"
								aria-busy={!loadedPreviews[play.id]}
							>
								{#if !loadedPreviews[play.id]}
									<div class="absolute inset-0 animate-pulse bg-stone-800" aria-hidden="true">
										<div class="absolute inset-x-5 top-1/2 border-t border-stone-600/70"></div>
										<div class="absolute inset-y-4 left-1/2 border-l border-stone-600/70"></div>
									</div>
								{/if}
								<img
									src={play.previewUrl}
									alt={`Preview of ${play.title}, first play`}
									data-play-preview={play.id}
									width="1000"
									height="484"
									loading="lazy"
									on:load={() => markPreviewLoaded(play.id)}
									on:error={() => markPreviewLoaded(play.id)}
									class="absolute inset-0 block h-full w-full object-cover"
								/>
							</div>
						</a>
						<div class="p-4">
							{#if renamingPlayId === play.id}
								<label class="sr-only" for={`play-title-${play.id}`}>Play title</label>
								<input
									id={`play-title-${play.id}`}
									data-rename-control={play.id}
									bind:this={titleInput}
									bind:value={renameValue}
									maxlength="64"
									on:keydown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											void commitRename(play);
										} else if (event.key === 'Escape') {
											event.preventDefault();
											cancelRename();
										}
									}}
									class="block h-7 w-full border-0 bg-transparent p-0 text-xl leading-7 font-black tracking-tight text-stone-900 ring-0 outline-none focus:ring-0 focus:outline-none"
								/>
								<p class="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
									<Icon icon="material-symbols:calendar-month-outline" class="h-4 w-4" aria-hidden="true" />
									Modified {formatUpdatedAt(play.updatedAt)}
								</p>
							{:else}
								<a
									href={isTemporaryPlay(play.id) ? undefined : `/play-builder/${play.id}`}
									aria-disabled={isTemporaryPlay(play.id)}
									class={`group block rounded-sm focus-visible:outline-4 focus-visible:outline-[#6faf7d] ${isTemporaryPlay(play.id) ? 'pointer-events-none' : ''}`}
								>
									<h2 class="truncate text-xl font-black tracking-tight text-stone-900 group-hover:underline">{play.title}</h2>
									<p class="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-500">
										<Icon icon="material-symbols:calendar-month-outline" class="h-4 w-4" aria-hidden="true" />
										Modified {formatUpdatedAt(play.updatedAt)}
									</p>
								</a>
							{/if}
						</div>
						<div data-card-actions data-rename-control={play.id} class="flex overflow-hidden border-t-2 border-stone-900 bg-stone-100">
							<button
								type="button"
								disabled={Boolean(pendingPlayIds[play.id]) || confirmingDeletePlayId === play.id || isTemporaryPlay(play.id)}
								aria-hidden={confirmingDeletePlayId === play.id}
								class={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden border-r text-xs font-black whitespace-nowrap transition-[width,opacity,background-color,border-color] duration-200 ease-out focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-[#6faf7d] disabled:cursor-not-allowed ${confirmingDeletePlayId === play.id ? 'w-0 border-transparent opacity-0' : renamingPlayId === play.id ? 'w-2/3 border-stone-300 bg-stone-900 text-white hover:bg-stone-700' : 'w-1/3 border-stone-300 text-stone-700 opacity-100 hover:bg-stone-200 hover:text-stone-900'}`}
								on:click={() => (renamingPlayId === play.id ? void commitRename(play) : void beginRename(play))}
							>
								<Icon
									icon={renamingPlayId === play.id ? 'material-symbols:check' : 'material-symbols:edit-outline'}
									class="h-4 w-4 shrink-0"
									aria-hidden="true"
								/>
								{renamingPlayId === play.id ? 'Confirm' : 'Rename'}
							</button>
							<button
								type="button"
								disabled={Boolean(pendingPlayIds[play.id]) ||
									renamingPlayId === play.id ||
									confirmingDeletePlayId === play.id ||
									isTemporaryPlay(play.id)}
								aria-hidden={renamingPlayId === play.id || confirmingDeletePlayId === play.id}
								class={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden border-r text-xs font-black whitespace-nowrap text-stone-700 transition-[width,opacity,background-color,border-color] duration-200 ease-out hover:bg-stone-200 hover:text-stone-900 focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-[#6faf7d] disabled:cursor-not-allowed ${renamingPlayId === play.id || confirmingDeletePlayId === play.id ? 'w-0 border-transparent opacity-0' : 'w-1/3 border-stone-300 opacity-100'}`}
								on:click={() => void duplicatePlay(play)}
							>
								<Icon icon="material-symbols:content-copy-outline" class="h-4 w-4 shrink-0" aria-hidden="true" /> Duplicate
							</button>
							<button
								type="button"
								data-delete-control
								disabled={Boolean(pendingPlayIds[play.id]) || isTemporaryPlay(play.id)}
								class={`inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1 overflow-hidden text-xs font-black whitespace-nowrap transition-[width,background-color,color] duration-200 ease-out focus-visible:z-10 focus-visible:outline-4 focus-visible:outline-[#6faf7d] disabled:cursor-not-allowed ${confirmingDeletePlayId === play.id ? 'w-full bg-red-50 text-red-800 hover:bg-red-100' : renamingPlayId === play.id ? 'w-1/3 text-stone-700 hover:bg-stone-200 hover:text-stone-900' : 'w-1/3 text-red-700 hover:bg-red-100 hover:text-red-800'}`}
								on:click={() => handleDeleteButtonClick(play)}
								on:keydown={(event) => {
									if (confirmingDeletePlayId === play.id && event.key === 'Escape') {
										event.preventDefault();
										confirmingDeletePlayId = null;
									}
								}}
							>
								<Icon
									icon={renamingPlayId === play.id ? 'material-symbols:close' : 'material-symbols:delete-outline'}
									class="h-4 w-4 shrink-0"
									aria-hidden="true"
								/>
								{renamingPlayId === play.id ? 'Cancel' : confirmingDeletePlayId === play.id ? 'Confirm Delete' : 'Delete'}
							</button>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<section
				class="border-2 border-stone-900 bg-white p-8 text-center shadow-[4px_4px_0_rgba(28,25,23,0.2)] active:translate-0.5 active:shadow-none"
			>
				<h2 class="text-xl font-black text-stone-900">No saved plays yet</h2>
				<p class="mt-2 text-sm text-stone-600">Save a diagram in the Play Builder and it will appear here.</p>
				<a href="/play-builder" class="mt-5 inline-block bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-stone-700">Open Play Builder</a
				>
			</section>
		{/if}
	</div>
</main>
