<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Mark from 'mark.js';
	import { HIGHLIGHT_PATTERNS } from '$lib/highlight-patterns';
	import CasePlayCard from '$lib/components/CasePlayCard.svelte';
	import youtubeIcon from '$lib/svg/youtube.svg';

	export let data: PageData;

	let isClicked = false;
	let isRevealed = false;

	$: authorName = data.casePlay?.author?.id ? `${data.casePlay.author.first_name} ${data.casePlay.author.last_name}`.trim() : null;
	$: rulebookName = data.casePlay?.rulebook?.id ? data.casePlay.rulebook.nickname || data.casePlay.rulebook.title : null;
	$: metadataItems = [
		authorName ? `authored by ${authorName}` : null,
		rulebookName,
		data.casePlay?.edition ? (/edition$/i.test(data.casePlay.edition) ? data.casePlay.edition : `${data.casePlay.edition} Edition`) : null,
		data.casePlay?.ruleReference ? `Rule ${data.casePlay.ruleReference}` : null,
		data.casePlay?.pageNumber ? `Page ${data.casePlay.pageNumber}` : null
	].filter((item): item is string => Boolean(item));

	onMount(() => {
		const instance = new Mark('main');
		const highlightExcludes = ['h1', 'h2', '.similar-case-plays', '.similar-case-plays *'];
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
	});

	const copyLink = () => {
		isClicked = true;
		navigator.clipboard.writeText(window.location.href);
		setTimeout(() => {
			isClicked = false;
		}, 2000);
	};
</script>

<svelte:head>
	<title>{data.casePlay?.title}</title>
	<meta name="description" content="Sports case play database for referee education" />
	<meta
		name="keywords"
		content="case,play,plays,db,database,sports,intramural,extramural,official,referee,education,learning,training,flag,tackle,football,basketball,baseball,soccer,volleyball,ice,roller,hockey,flash,cards,coach,player,umpire,ref,ump,zebra,stripes,whistle,rule,rules,interpretation,rule book,edition,spoiler,tool"
	/>
	<meta name="author" content="Jake Harvanchik" />
</svelte:head>

<main class="scrollbar scrollbar-track-stone-800 scrollbar-thumb-black min-h-screen overflow-hidden bg-stone-100/[97%]">
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>

	<a
		href={data.backHref}
		class="absolute top-5 left-10 flex cursor-pointer flex-row items-center space-x-1 text-stone-600 transition-colors duration-200 hover:text-stone-900"
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
				<p
					id="prompt"
					class="scrollbar-w-3 scrollbar scrollbar-track-stone-300 scrollbar-thumb-stone-700 mb-5 max-h-48 overflow-y-auto border-2 border-stone-900 bg-white p-4 shadow-lg selection:bg-black/20"
					contenteditable="false"
				>
					{data.casePlay?.prompt}
				</p>

				<spoiler
					id="answer"
					class="scrollbar-w-3 group scrollbar scrollbar-track-black/70 scrollbar-thumb-stone-200 max-h-80 overflow-y-auto border-2 border-stone-900"
					class:revealed={isRevealed}
					on:click={() => (isRevealed = !isRevealed)}
					on:keydown={(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (isRevealed = !isRevealed)}
					role="button"
					tabindex="0"
					contenteditable="false"
				>
					{data.casePlay?.answer}
				</spoiler>

				<div class="flex flex-row items-center justify-start space-x-1 pt-1 text-left">
					<span class="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-stone-500 text-xs font-bold text-stone-500">i</span>
					<span class="text-xs text-stone-500 sm:hidden">click black box to reveal answer</span>
					<span class="hidden text-xs text-stone-500 sm:inline">hover over black box to reveal answer</span>
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
</main>
