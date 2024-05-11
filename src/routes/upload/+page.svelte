<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Mark from 'mark.js';

	export let data: PageData;

	let selectedDifficulty = '0';
	let isClicked = false;

	onMount(() => {
		// get the mark instance of the main element
		const instance = new Mark('main');
		// regex to match teams/players (e.g., Team A, Team B, A-1, B-2)
		const TEAM_REGEX = /Team ([ABKR])('s)*|[ABKR]-[0-9]{1,2}('s)*/g;
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

	const upload = () => {
		isClicked = true;
		setTimeout(() => {
			isClicked = false;
		}, 2000);
	};
</script>

<svelte:head>
	<title>Upload Case Play</title>
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
		<form method="POST" action="?/upload" class="mx-3 flex flex-col space-y-5 text-lg leading-[1.425] sm:mx-auto sm:w-1/2">
			<!-- START: Title -->
			<div class="flex flex-col space-y-1">
				<label for="title" class="font-semibold">Title</label>
				<input
					type="text"
					id="title"
					name="title"
					required
					placeholder="Ex. Touchdown on Final Play"
					class=" border-2 border-stone-900 bg-white p-2 px-4 text-lg font-semibold text-stone-900 placeholder-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
				/>
			</div>
			<!-- END: Title -->

			<!-- START: Case Play Prompt -->
			<div class="flex flex-col space-y-1">
				<label for="prompt" class="font-semibold">Prompt</label>
				<textarea
					id="prompt"
					name="prompt"
					required
					class="h-48 border-2 border-stone-900 bg-white p-2 px-4 text-start text-lg font-semibold text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
				/>
			</div>
			<!-- END: Case Play Prompt -->

			<!-- START: Case Play Answer -->
			<div class="flex flex-col space-y-1">
				<label for="answer" class="font-semibold">Answer</label>
				<textarea
					id="answer"
					name="answer"
					required
					class="h-48 border-2 border-stone-900 bg-stone-900 p-2 px-4 text-lg font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
				/>
			</div>
			<!-- END: Case Play Answer -->

			<!-- START: Difficulty Selector -->
			<div class="flex flex-row gap-5">
				<input type="radio" id="easy" name="difficulty" value="1" bind:group={selectedDifficulty} class="hidden" />
				<label
					for="easy"
					class="duration-250 flex flex-1 items-center justify-center border-2 border-stone-900 bg-green-600 p-2 px-4 text-xl font-semibold text-white transition-all hover:font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
					class:bg-opacity-80={selectedDifficulty === '1'}
					class:bg-opacity-50={selectedDifficulty !== '1'}
				>
					Easy
				</label>

				<input type="radio" id="moderate" name="difficulty" value="2" bind:group={selectedDifficulty} class="hidden" />
				<label
					for="moderate"
					class="duration-250 flex flex-1 items-center justify-center border-2 border-stone-900 bg-yellow-400 p-2 px-4 text-xl font-semibold text-black transition-all hover:font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
					class:bg-opacity-80={selectedDifficulty === '2'}
					class:bg-opacity-50={selectedDifficulty !== '2'}
				>
					Moderate
				</label>

				<input type="radio" id="hard" name="difficulty" value="3" bind:group={selectedDifficulty} class="hidden" />
				<label
					for="hard"
					class="duration-250 flex flex-1 items-center justify-center border-2 border-stone-900 bg-red-600 p-2 px-4 text-xl font-semibold text-white transition-all hover:font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
					class:bg-opacity-80={selectedDifficulty === '3'}
					class:bg-opacity-50={selectedDifficulty !== '3'}
				>
					Hard
				</label>
			</div>
			<!-- END: Difficulty Selector -->

			<div class="flex flex-row justify-between">
				<!-- START: Film Input Box -->
				<div class="my-auto flex w-10/12 flex-col space-y-1">
					<label for="film" class="font-semibold">Film URL</label>
					<input
						type="text"
						id="film"
						name="film"
						placeholder="Ex. https://www.youtube.com/v/dQw4w9WgXcQ"
						class="my-auto border-2 border-stone-900 bg-white p-2 px-4 text-lg font-semibold text-stone-900 placeholder-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
					/>
				</div>
				<!-- END: Film Input Box -->

				<!-- START: Copy Link Button -->
				<button
					class=" mt-auto flex border border-transparent bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
					on:click={upload}
					class:!bg-green-500={isClicked}
					class:!bg-stone-900={!isClicked}
					>UPLOAD
					<!-- END: Copy Link Button -->
				</button>
			</div>
		</form>
	</div>
</main>
<!-- END: Search Bar -->
