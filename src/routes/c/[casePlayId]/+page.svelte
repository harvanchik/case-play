<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Mark from 'mark.js';

	export let data: PageData;

	let isClicked = false;

	onMount(() => {
		// get the mark instance of the main element
		const instance = new Mark('main');
		// regex to match teams/players (e.g., Team A, Team B, A-1, B-2)
		const TEAM_REGEX = /Team ([ABKR])('s)*|[ABKR]-[0-9]{1,2}('s)*/g;
		// mark the teams/players
		instance.markRegExp(TEAM_REGEX, { element: 'u', exclude: ['h1', 'h2'] });
		// regex to match letters in parentheses
		const LETTER_REGEX = /\((?=[mdclxvi])m*(c[md]|d?c{0,3})(x[cl]|l?x{0,3})(i[xv]|v?i{0,3})\)/g;
		// mark the letters in parentheses
		instance.markRegExp(LETTER_REGEX, {
			exclude: ['h1', 'h2'],
			each(element) {
				// get text
				const text = element.textContent as string;
				// get roman numeral
				const romanNumeral = text?.toLowerCase().replace(/[()]/g, '');
				// if roman numeral is i, mark it green
				if (romanNumeral === 'i') element.setAttribute('green', '');
				// if roman numeral is ii, mark it blue
				else if (romanNumeral === 'ii') element.setAttribute('blue', '');
				// if roman numeral is iii, mark it orange
				else if (romanNumeral === 'iii') element.setAttribute('orange', '');
				// if roman numeral is iv, mark it indigo
				else if (romanNumeral === 'iv') element.setAttribute('indigo', '');
				// if roman numeral is v, mark it red
				else if (romanNumeral === 'v') element.setAttribute('red', '');
				// if roman numeral is vi, mark it violet
				else if (romanNumeral === 'vi') element.setAttribute('violet', '');
				// otherwise, mark it yellow
				else element.setAttribute('yellow', '');
				// get the next character
				const char = element.nextSibling?.textContent?.trim().charAt(0);
				// if the character is a comma, add right margin between it and the comma
				if (char === ',') element.classList.add('mr-[2px]');
			}
		});
		// regex to match team yardage lines
		const YARD_REGEX = /([ABKR]'s\s[1-4]?[0-9])|([ABKR]'s)/g;
		// mark the team yardage lines
		instance.markRegExp(YARD_REGEX, { element: 'b', exclude: ['h1', 'h2'] });
		// regex to match a rule reference
		const RULE_REGEX = /Rule ([0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}[A-Z]{0,1})/g;
		// mark the rule reference
		instance.markRegExp(RULE_REGEX, { element: 'u', exclude: ['h1', 'h2'] });
		// regex to match variants of word 'accept'
		const ACCEPT_REGEX = /accepts|accepted|accept/gi;
		// mark the variants of word 'accept'
		instance.markRegExp(ACCEPT_REGEX, { element: 'span', className: 'accept', exclude: ['h1', 'h2'] });
		// regex to match variants of word 'decline'
		const DECLINE_REGEX = /declines|declined|decline/gi;
		// mark the variants of word 'decline'
		instance.markRegExp(DECLINE_REGEX, { element: 'span', className: 'decline', exclude: ['h1', 'h2'] });
		// regex to match variants of word 'offset'
		const OFFSET_REGEX = /offsets|offsetted|offset/gi;
		// mark variants of word 'offset'
		instance.markRegExp(OFFSET_REGEX, { element: 'span', className: 'offset', exclude: ['h1', 'h2'] });
		// regex to match variants of word 'open'
		const OPEN_REGEX = /opens|opened|open/gi;
		// mark variants of word 'open'
		instance.markRegExp(OPEN_REGEX, { element: 'span', className: 'open', exclude: ['h1', 'h2'] });
		// regex to match variants of word 'closed'
		const CLOSED_REGEX = /closes|closed|close/gi;
		// mark variants of word 'closed'
		instance.markRegExp(CLOSED_REGEX, { element: 'span', className: 'closed', exclude: ['h1', 'h2'] });
		// regex to match newlines
		const NEWLINE_REGEX = /\n/g;
		// replace newline with br element
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
	<script src="https://code.iconify.design/iconify-icon/1.0.3/iconify-icon.min.js"></script>
	<script src="/node_modules/mark.js/dist/mark.min.js" charset="UTF-8"></script>
</svelte:head>

<main class="min-h-screen overflow-hidden bg-stone-100/[97%] scrollbar scrollbar-track-stone-800 scrollbar-thumb-black">
	<!-- Background -->
	<div class="fixed -z-10 h-screen w-screen bg-[url(/svg/graph.svg)]"></div>

	<div class="mt-20 flex flex-col">
		<div class="mx-auto flex flex-row text-center">
			<!-- START: Case Play Title -->
			<h1
				class="mx-3 mb-2 flex border-b-2 border-stone-900 px-0 text-center text-3xl font-semibold text-stone-800 sm:mx-auto sm:border-b-4 sm:px-5 sm:text-4xl"
			>
				{data.casePlay?.title}
			</h1>
			<!-- END: Case Play Title -->

			<!-- START: YouTube Link -->
			{#if data.casePlay?.film}
				<a
					href={data.casePlay?.film}
					target="_blank"
					class="my-auto mb-3 ml-5 h-8 opacity-85 transition-transform duration-150 hover:scale-110 hover:opacity-100"
				>
					<img class="h-full" src="./../../../src/lib/svg/youtube.svg" alt="youtube" />
				</a>
			{/if}
			<!-- END: YouTube Link -->
		</div>
		<!-- START: Subtitle -->
		<h2 class="mx-auto flex space-x-3 pb-3">
			<!-- START: Author -->
			<p class="text-stone-600 hover:text-stone-800">authored by {data.casePlay?.author?.first_name + ' ' + data.casePlay?.author?.last_name}</p>
			<!-- divider symbol -->
			<p class="text-stone-700">•</p>
			<!-- END: Author -->
			<p class="text-stone-600 hover:text-stone-800">{data.casePlay?.rulebook?.nickname + ' ' + data.casePlay?.edition + ' Edition'}</p>
		</h2>
		<!-- END: Subtitle -->
		<div class="mx-3 flex flex-col space-y-5 text-lg leading-[1.425] sm:mx-auto sm:w-1/2">
			<!-- START: Case Play Prompt -->
			<p
				id="prompt"
				class="scrollbar-w-3 max-h-48 overflow-y-auto border-2 border-stone-900 bg-white p-4 shadow-lg scrollbar scrollbar-track-stone-300 scrollbar-thumb-stone-700 selection:bg-black/20"
				contenteditable="false"
			>
				{data.casePlay?.prompt}
			</p>
			<!-- END: Case Play Prompt -->

			<!-- START: Case Play Answer -->
			<spoiler
				id="answer"
				class="scrollbar-w-3 group max-h-80 overflow-y-auto border-2 border-stone-900 scrollbar scrollbar-track-black/70 scrollbar-thumb-stone-200"
				contenteditable="false"
			>
				{data.casePlay?.answer}
			</spoiler>
			<!-- END: Case Play Answer -->

			<!-- START: Copy Link Button -->
			<div class="ml-auto mt-5">
				<button
					class="ml-auto flex border border-transparent bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
					on:click={copyLink}
					class:!bg-green-500={isClicked}
					class:!bg-stone-900={!isClicked}
					>SHARE
					<!-- END: Copy Link Button -->
				</button>
			</div>
		</div>
	</div>
</main>
<!-- END: Search Bar -->
