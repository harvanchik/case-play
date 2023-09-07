<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Mark from 'mark.js';

	export let data: PageData;

	onMount(() => {
		// get the mark instance of the main element
		const instance = new Mark('main');
		// regex to match teams/players (e.g., Team A, Team B, A-1, B-2)
		const TEAM_REGEX = /Team ([ABKR])|[ABKR]-[0-9]{1,2}/g;
		// mark the teams/players
		instance.markRegExp(TEAM_REGEX, { element: 'u' });
		// regex to match letters in parentheses
		const LETTER_REGEX = /\((?=[mdclxvi])m*(c[md]|d?c{0,3})(x[cl]|l?x{0,3})(i[xv]|v?i{0,3})\)/g;
		// mark the letters in parentheses
		instance.markRegExp(LETTER_REGEX, {
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
		instance.markRegExp(YARD_REGEX, { element: 'b' });
		// regex to match a rule reference
		const RULE_REGEX = /Rule ([0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}[A-Z]{0,1})/g;
		// mark the rule reference
		instance.markRegExp(RULE_REGEX, { element: 'u' });
		// regex to match variants of word 'accept'
		const ACCEPT_REGEX = /accepts|accepted|accept/gi;
		// mark the variants of word 'accept'
		instance.markRegExp(ACCEPT_REGEX, { element: 'span', className: 'accept' });
		// regex to match variants of word 'decline'
		const DECLINE_REGEX = /declines|declined|decline/gi;
		// mark the variants of word 'decline'
		instance.markRegExp(DECLINE_REGEX, { element: 'span', className: 'decline' });
		// regex to match variants of word 'offset'
		const OFFSET_REGEX = /offsets|offsetted|offset/gi;
		// mark variants of word 'offset'
		instance.markRegExp(OFFSET_REGEX, { element: 'span', className: 'offset' });
		// regex to match variants of word 'open'
		const OPEN_REGEX = /opens|opened|open/gi;
		// mark variants of word 'open'
		instance.markRegExp(OPEN_REGEX, { element: 'span', className: 'open' });
		// regex to match variants of word 'closed'
		const CLOSED_REGEX = /closes|closed|close/gi;
		// mark variants of word 'closed'
		instance.markRegExp(CLOSED_REGEX, { element: 'span', className: 'closed' });
		// regex to match newlines
		const NEWLINE_REGEX = /\n/g;
		// replace newline with br element
		instance.markRegExp(NEWLINE_REGEX, { element: 'br' });
	});
</script>

<svelte:head>
	<title>Case Plays</title>
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
		<h1 class="mx-auto mb-5 border-b-4 border-stone-900 px-5 pb-3 text-4xl font-semibold text-stone-800">{data.casePlay?.title}</h1>
		<h1>authored by {data.casePlay?.author?.id}</h1>
		<div class="mx-auto flex w-1/2 flex-col space-y-5 leading-[1.425]">
			<p
				id="prompt"
				class="scrollbar-w-3 max-h-48 border-2 border-stone-900 bg-white p-4 shadow-lg scrollbar scrollbar-track-stone-300 scrollbar-thumb-stone-700 selection:bg-black/20"
				contenteditable="false"
			>
				{data.casePlay?.prompt}
			</p>

			<!-- START: Case Play Answer -->
			<spoiler
				id="answer"
				class="scrollbar-w-3 group max-h-80 border-2 border-stone-900 scrollbar scrollbar-track-black/70 scrollbar-thumb-stone-200"
				contenteditable="false"
			>
				{data.casePlay?.answer}
			</spoiler>
			<!-- END: Case Play Answer -->
		</div>
	</div>
</main>
<!-- END: Search Bar -->
