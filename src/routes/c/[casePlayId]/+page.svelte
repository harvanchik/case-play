<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { PageData } from './$types';
	import Mark from 'mark.js';
	import Icon from '@iconify/svelte';
	import { HIGHLIGHT_PATTERNS } from '$lib/highlight-patterns';
	import CasePlayCard from '$lib/components/CasePlayCard.svelte';
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import youtubeIcon from '$lib/svg/youtube.svg';
	import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import DesktopPlayBuilderGate from '$lib/components/DesktopPlayBuilderGate.svelte';

	export let data: PageData;

	let isClicked = false;
	let isRevealed = false;
	// Render the desktop instruction by default, then refine it after hydration.
	// This avoids incorrectly flashing "tap" on desktop while JavaScript loads.
	let answerUsesHover = true;
	let isPlayBuilderOpen = false;
	let playBuilderButton: HTMLButtonElement;
	let exportPromptSource: HTMLParagraphElement;
	let playBuilderCloseButton: HTMLButtonElement;
	let previousBodyOverflow = '';
	let activeCasePlayId = data.casePlay?.id;

	$: if (data.casePlay?.id !== activeCasePlayId) {
		activeCasePlayId = data.casePlay?.id;
		isRevealed = false;
		isClicked = false;
	}

	$: authorName = data.casePlay?.author?.id ? `${data.casePlay.author.first_name} ${data.casePlay.author.last_name}`.trim() : null;
	$: rulebookName = data.casePlay?.rulebook?.id ? data.casePlay.rulebook.nickname || data.casePlay.rulebook.title : null;
	$: metadataItems = [
		authorName ? `authored by ${authorName}` : null,
		rulebookName,
		data.casePlay?.edition ? (/edition$/i.test(data.casePlay.edition) ? data.casePlay.edition : `${data.casePlay.edition} Edition`) : null,
		data.casePlay?.ruleReference ? `Rule ${data.casePlay.ruleReference}` : null,
		data.casePlay?.pageNumber ? `Page ${data.casePlay.pageNumber}` : null
	].filter((item): item is string => Boolean(item));
	$: caseDescription = (data.casePlay?.prompt ?? 'Study this flag football officiating case play on CasePlay.org')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 158);
	$: breadcrumbData = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Case Plays', item: 'https://caseplay.org/' },
			{ '@type': 'ListItem', position: 2, name: data.casePlay?.title ?? 'Case Play', item: `https://caseplay.org/c/${data.casePlay?.id ?? ''}` }
		]
	}).replace(/</g, '\\u003c');
	const applyCasePlayHighlights = (root: HTMLElement) => {
		const instance = new Mark(root);
		const highlightExcludes = ['h1', 'h2', '.play-builder', '.play-builder *', '.similar-case-plays', '.similar-case-plays *'];
		const TEAM_REGEX = /Team ([ABKR])('s)*|[ABKR]-[0-9]{1,2}('s)*/g;
		instance.markRegExp(TEAM_REGEX, { element: 'u', exclude: highlightExcludes });
		const LETTER_REGEX = /\([a-z]\)/gi;
		const letterColors = ['green', 'blue', 'orange', 'indigo', 'red', 'violet', 'yellow'] as const;
		instance.markRegExp(LETTER_REGEX, {
			exclude: highlightExcludes,
			each(element) {
				const text = element.textContent as string;
				const letter = text.toLowerCase().replace(/[()]/g, '');
				const color = letterColors[(letter.charCodeAt(0) - 'a'.charCodeAt(0)) % letterColors.length];
				element.setAttribute(color, '');
				const char = element.nextSibling?.textContent?.trim().charAt(0);
				if (char === ',') element.classList.add('mr-[2px]');
			}
		});
		const YARD_REGEX = /([ABKR]'s\s[1-4]?[0-9])|([ABKR]'s)/g;
		instance.markRegExp(YARD_REGEX, { element: 'b', exclude: highlightExcludes });
		const RULE_REGEX = /Rule ([0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}[A-Z]{0,1})/g;
		instance.markRegExp(RULE_REGEX, { element: 'u', exclude: highlightExcludes });
		instance.markRegExp(HIGHLIGHT_PATTERNS.accept, { element: 'span', className: 'accept', exclude: highlightExcludes });
		instance.markRegExp(HIGHLIGHT_PATTERNS.decline, { element: 'span', className: 'decline', exclude: highlightExcludes });
		instance.markRegExp(HIGHLIGHT_PATTERNS.offset, { element: 'span', className: 'offset', exclude: highlightExcludes });
		instance.markRegExp(HIGHLIGHT_PATTERNS.open, { element: 'span', className: 'open', exclude: highlightExcludes });
		instance.markRegExp(HIGHLIGHT_PATTERNS.closed, { element: 'span', className: 'closed', exclude: highlightExcludes });
		const NEWLINE_REGEX = /\n/g;
		instance.markRegExp(NEWLINE_REGEX, { element: 'br', exclude: highlightExcludes });
	};

	const highlightCasePlay = (node: HTMLElement) => {
		let destroyed = false;
		void tick().then(() => {
			if (!destroyed) applyCasePlayHighlights(node);
		});
		return {
			destroy() {
				destroyed = true;
			}
		};
	};

	onMount(() => {
		const isIPadOS = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
		answerUsesHover = !isIPadOS && !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
		return () => {
			if (isPlayBuilderOpen) document.body.style.overflow = previousBodyOverflow;
		};
	});

	const mouseEventCameFromTouch = (event: MouseEvent) =>
		Boolean(
			(event as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } | null }).sourceCapabilities?.firesTouchEvents
		);
	const handleAnswerMouseEnter = (event: MouseEvent) => {
		if (answerUsesHover && !mouseEventCameFromTouch(event)) isRevealed = true;
	};
	const handleAnswerMouseLeave = (event: MouseEvent) => {
		if (answerUsesHover && !mouseEventCameFromTouch(event)) isRevealed = false;
	};
	const handleAnswerClick = (event: MouseEvent) => {
		// A touch-capable Windows device can still use a desktop user agent, so
		// recognize the synthetic click generated by a tap as well as mobile UAs.
		if (!answerUsesHover || mouseEventCameFromTouch(event) || event.detail === 0) {
			isRevealed = !isRevealed;
		}
	};
	const handleAnswerKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		isRevealed = !isRevealed;
	};

	const openPlayBuilder = async () => {
		if (isPlayBuilderOpen) return;
		previousBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		isPlayBuilderOpen = true;
		await tick();
		playBuilderCloseButton?.focus();
	};
	const closePlayBuilder = async () => {
		if (!isPlayBuilderOpen) return;
		isPlayBuilderOpen = false;
		document.body.style.overflow = previousBodyOverflow;
		await tick();
		playBuilderButton?.focus();
	};
	const handleWindowKeydown = (event: KeyboardEvent) => {
		if (!isPlayBuilderOpen || event.key !== 'Escape') return;
		setTimeout(() => {
			if (!event.defaultPrevented) void closePlayBuilder();
		}, 0);
	};

	const copyLink = () => {
		isClicked = true;
		navigator.clipboard.writeText(window.location.href);
		setTimeout(() => {
			isClicked = false;
		}, 2000);
	};
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<svelte:head>
	<title>{data.casePlay?.title}</title>
	<meta name="description" content={caseDescription} />
	<meta name="author" content="Jake Harvanchik" />
	<meta property="og:title" content={data.casePlay?.title ?? 'Flag Football Case Play'} />
	<meta property="og:description" content={caseDescription} />
	<meta property="og:type" content="article" />
	{@html `<script type="application/ld+json">${breadcrumbData}<\/script>`}
</svelte:head>

{#key data.casePlay?.id}
<main use:highlightCasePlay class="min-h-screen overflow-hidden bg-stone-100/[97%]">
	<PublicSiteNav compact />
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>

	<a
		href={data.backHref}
		class="absolute top-12 left-10 flex cursor-pointer flex-row items-center space-x-1 text-stone-600 transition-colors duration-200 hover:text-stone-900"
	>
		<span class="text-xl font-bold">&larr;</span>
		<span class="text-lg font-semibold">Back</span>
	</a>

	<div class="mt-20 flex flex-col">
		<div class="mx-auto flex flex-row text-center">
			<h1
				class="mx-3 mb-2 flex border-b-2 border-stone-900 px-0 text-center text-3xl font-semibold text-stone-800 sm:mx-auto sm:border-b-4 sm:px-5 sm:text-4xl"
			>
				{data.casePlay?.title}
			</h1>

			{#if data.casePlay?.film}
				<a
					href={data.casePlay?.film}
					target="_blank"
					class="my-auto mb-3 ml-5 h-8 opacity-85 transition-transform duration-150 hover:scale-110 hover:opacity-100"
				>
					<img class="h-full" src={youtubeIcon} alt="youtube" />
				</a>
			{/if}
		</div>

		{#if metadataItems.length > 0}
			<h2 class="mx-auto flex max-w-[95%] flex-wrap justify-center gap-x-2 pb-3 text-sm md:gap-x-3 md:text-base">
				{#each metadataItems as item, index}
					{#if index > 0}<span class="text-stone-700">&bull;</span>{/if}
					<span class="text-stone-600 hover:text-stone-800">{item}</span>
				{/each}
			</h2>
		{/if}

		<div class="mx-auto grid w-full max-w-[90rem] gap-8 px-3 pb-12 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] xl:gap-10">
			<section class="min-w-0 text-lg leading-[1.425]">
				<div class="relative mb-5">
					<p
						bind:this={exportPromptSource}
						id="prompt"
						class="case-play-prompt max-h-48 overflow-y-auto border-2 border-stone-900 bg-white p-4 shadow-lg selection:bg-black/20"
						contenteditable="false"
					>
						{data.casePlay?.prompt}
					</p>
					<button
						bind:this={playBuilderButton}
						type="button"
						title="Open play builder"
						aria-label="Open play builder"
						aria-expanded={isPlayBuilderOpen}
						aria-controls="case-play-builder-modal"
						on:click={openPlayBuilder}
						class="absolute right-2 bottom-2 hidden h-8 w-8 cursor-pointer items-center justify-center border-0 bg-white/90 text-stone-600 shadow-sm transition-colors hover:bg-stone-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 lg:flex"
						class:!bg-stone-900={isPlayBuilderOpen}
						class:!text-white={isPlayBuilderOpen}
					>
						<Icon icon="material-symbols:construction" class="text-xl" />
					</button>
				</div>

				<spoiler
					id="answer"
					class="group max-h-80 overflow-y-auto border-2 border-stone-900"
					class:revealed={isRevealed}
					class:!text-white={isRevealed}
					on:mouseenter={handleAnswerMouseEnter}
					on:mouseleave={handleAnswerMouseLeave}
					on:click={handleAnswerClick}
					on:keydown={handleAnswerKeydown}
					role="button"
					tabindex="0"
					aria-pressed={isRevealed}
					aria-label={isRevealed ? 'Hide case play answer' : 'Reveal case play answer'}
					contenteditable="false"
				>
					<div class="spoiler-content">{data.casePlay?.answer}</div>
				</spoiler>

				<div class="flex flex-row items-center justify-start space-x-1 pt-1 text-left">
					<span class="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-stone-500 text-xs font-bold text-stone-500">i</span>
					<span class="text-xs text-stone-500">{answerUsesHover ? 'hover over black box to reveal answer' : 'tap black box to reveal answer'}</span>
				</div>

				<div class="ml-auto flex w-full flex-row justify-end">
					<button
						class="ml-auto flex w-20 cursor-pointer items-center justify-center border border-transparent bg-stone-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors duration-200 hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
						on:click={copyLink}
						class:!bg-green-500={isClicked}
						class:!bg-stone-900={!isClicked}>{isClicked ? 'COPIED' : 'SHARE'}</button
					>
				</div>
			</section>

			{#if data.similarCasePlays.length > 0}
				<aside class="similar-case-plays min-w-0 xl:sticky xl:top-6 xl:self-start" aria-labelledby="similar-case-plays-title">
					<h2 id="similar-case-plays-title" class="mb-3 border-b-2 border-stone-800 pb-1 text-2xl font-bold text-stone-800">Similar Case Plays</h2>
					<div class="flex flex-col gap-3">
						{#each data.similarCasePlays as similarCasePlay}
							<CasePlayCard casePlay={similarCasePlay} href={`/c/${similarCasePlay.id}${data.detailQuery}`} compact />
						{/each}
					</div>
				</aside>
			{/if}
		</div>
	</div>

	<div
		id="case-play-builder-modal"
		class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-2 backdrop-blur-[1px] sm:p-4"
		class:hidden={!isPlayBuilderOpen}
		aria-hidden={!isPlayBuilderOpen}
		on:click|self={closePlayBuilder}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="case-play-builder-modal-title"
			class="relative z-10 flex max-h-[96vh] w-full flex-col"
			style="max-width: min(96vw, calc((96vh - 8rem) * 2.1));"
		>
			<h2 id="case-play-builder-modal-title" class="sr-only">Play Builder for {data.casePlay?.title}</h2>
			<div class="relative mb-2 shrink-0">
				<p
					class="case-play-prompt max-h-[18vh] overflow-y-auto border-2 border-stone-900 bg-white p-4 pr-14 text-base leading-[1.425] shadow-lg selection:bg-black/20 sm:text-lg"
					contenteditable="false"
				>
					{data.casePlay?.prompt}
				</p>
				<button
					bind:this={playBuilderCloseButton}
					type="button"
					aria-label="Close play builder"
					tabindex={isPlayBuilderOpen ? 0 : -1}
					on:click={closePlayBuilder}
					class="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-stone-900 text-xl font-black text-white shadow-sm hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
				>
					&times;
				</button>
			</div>
			<div class="play-builder min-h-0 overflow-y-auto">
				{#key data.casePlay.id}
					<DesktopPlayBuilderGate>
						<FlagFootballPlayBuilder exportPrompt={data.casePlay?.prompt ?? null} {exportPromptSource} />
					</DesktopPlayBuilderGate>
				{/key}
			</div>
		</div>
	</div>
	<PublicSiteFooter />
</main>
{/key}
