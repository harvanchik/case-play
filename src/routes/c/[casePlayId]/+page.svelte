<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Mark from 'mark.js';

	export let data: PageData;

	let isClicked = false;
	let isRevealed = false;

	$: authorName = data.casePlay?.author
		? `${data.casePlay.author.first_name} ${data.casePlay.author.last_name}`.trim()
		: 'Unknown author';
	$: rulebookName = data.casePlay?.rulebook
		? `${data.casePlay.rulebook.nickname || data.casePlay.rulebook.title}${data.casePlay?.edition ? ` ${data.casePlay.edition} Edition` : ''}`
		: 'Unknown rulebook';

	onMount(() => {
		const instance = new Mark('main');
		const TEAM_REGEX = /Team ([ABKR])('s)*|[ABKR]-[0-9]{1,2}('s)*/g;
		instance.markRegExp(TEAM_REGEX, { element: 'u', exclude: ['h1', 'h2'] });
		const LETTER_REGEX = /\((?=[mdclxvi])m*(c[md]|d?c{0,3})(x[cl]|l?x{0,3})(i[xv]|v?i{0,3})\)/g;
		instance.markRegExp(LETTER_REGEX, {
			exclude: ['h1', 'h2'],
			each(element) {
				const text = element.textContent as string;
				const romanNumeral = text?.toLowerCase().replace(/[()]/g, '');
				if (romanNumeral === 'i') element.setAttribute('green', '');
				else if (romanNumeral === 'ii') element.setAttribute('blue', '');
				else if (romanNumeral === 'iii') element.setAttribute('orange', '');
				else if (romanNumeral === 'iv') element.setAttribute('indigo', '');
				else if (romanNumeral === 'v') element.setAttribute('red', '');
				else if (romanNumeral === 'vi') element.setAttribute('violet', '');
				else element.setAttribute('yellow', '');
				const char = element.nextSibling?.textContent?.trim().charAt(0);
				if (char === ',') element.classList.add('mr-[2px]');
			}
		});
		const YARD_REGEX = /([ABKR]'s\s[1-4]?[0-9])|([ABKR]'s)/g;
		instance.markRegExp(YARD_REGEX, { element: 'b', exclude: ['h1', 'h2'] });
		const RULE_REGEX = /Rule ([0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}[A-Z]{0,1})/g;
		instance.markRegExp(RULE_REGEX, { element: 'u', exclude: ['h1', 'h2'] });
		const ACCEPT_REGEX = /accepts|accepted|accept/gi;
		instance.markRegExp(ACCEPT_REGEX, { element: 'span', className: 'accept', exclude: ['h1', 'h2'] });
		const DECLINE_REGEX = /declines|declined|decline/gi;
		instance.markRegExp(DECLINE_REGEX, { element: 'span', className: 'decline', exclude: ['h1', 'h2'] });
		const OFFSET_REGEX = /offsets|offsetted|offset/gi;
		instance.markRegExp(OFFSET_REGEX, { element: 'span', className: 'offset', exclude: ['h1', 'h2'] });
		const OPEN_REGEX = /opens|opened|open/gi;
		instance.markRegExp(OPEN_REGEX, { element: 'span', className: 'open', exclude: ['h1', 'h2'] });
		const CLOSED_REGEX = /closes|closed|close/gi;
		instance.markRegExp(CLOSED_REGEX, { element: 'span', className: 'closed', exclude: ['h1', 'h2'] });
		const NEWLINE_REGEX = /\n/g;
		instance.markRegExp(NEWLINE_REGEX, { element: 'br', exclude: ['h1', 'h2'] });
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

<main class="min-h-screen overflow-hidden bg-stone-100/[97%] scrollbar scrollbar-track-stone-800 scrollbar-thumb-black">
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>

	<a
		href="/"
		class="absolute left-10 top-5 flex cursor-pointer flex-row items-center space-x-1 text-stone-600 transition-colors duration-200 hover:text-stone-900"
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
					<img class="h-full" src="./../../../src/lib/svg/youtube.svg" alt="youtube" />
				</a>
			{/if}
		</div>

		<h2 class="mx-auto flex space-x-2 pb-3 text-sm md:space-x-3 md:text-base">
			<p class="text-stone-600 hover:text-stone-800">authored by {authorName}</p>
			<p class="text-stone-700">&bull;</p>
			<p class="text-stone-600 hover:text-stone-800">{rulebookName}</p>
		</h2>

		<div class="mx-3 flex flex-col text-lg leading-[1.425] sm:mx-auto sm:w-1/2">
			<p
				id="prompt"
				class="scrollbar-w-3 mb-5 max-h-48 overflow-y-auto border-2 border-stone-900 bg-white p-4 shadow-lg scrollbar scrollbar-track-stone-300 scrollbar-thumb-stone-700 selection:bg-black/20"
				contenteditable="false"
			>
				{data.casePlay?.prompt}
			</p>

			<spoiler
				id="answer"
				class="scrollbar-w-3 group max-h-80 overflow-y-auto border-2 border-stone-900 scrollbar scrollbar-track-black/70 scrollbar-thumb-stone-200"
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
		</div>
	</div>
</main>
