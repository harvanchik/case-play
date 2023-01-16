<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: ({ casePlay } = data); // deconstruct data into casePlay

	$: prompt = format(casePlay.prompt); // formatted case play prompt
	$: answer = format(casePlay.answer); // formatted case play answer

	/**
	 * Apply the necessary formatting to transform raw text into case play text.
	 * This method automatically colors, underlines, and bolds portions of the text using regex.
	 * @param text The text to format.
	 * @returns The text formatted as a case play.
	 */
	function format(text: string): string {
		// create a regular expression to match newlines
		const NEWLINE_REGEX = /\n/g;
		// replace newline with br element
		text = text.replace(NEWLINE_REGEX, '<br>');
		// create a regular expression to match letters in parentheses
		const LETTER_REGEX = /\(([a-z])\)/g;
		// replace the matched text with a mark element
		text = text.replace(LETTER_REGEX, (match, p1) => {
			// create a mark element
			let mark = '<mark ';
			// get character after the parentheses
			const char = text[text.indexOf(match) + match.length];
			// set the color of the mark element
			if (p1 === 'a') mark = `${mark}green`;
			else if (p1 === 'b') mark = `${mark}blue`;
			else if (p1 === 'c') mark = `${mark}orange`;
			else if (p1 === 'd') mark = `${mark}indigo`;
			else if (p1 === 'e') mark = `${mark}red`;
			else if (p1 === 'f') mark = `${mark}violet`;
			else mark = `${mark}yellow`;
			// return the mark element as a string (add margin right if comma is after)
			return `${mark}${char === ',' ? ' class="mr-[2px]">' : '>'}${match}</mark>`;
		});
		// create a regular expression to match teams/players
		const TEAM_REGEX = /Team ([ABKR])|[ABKR]-[0-9]{1,2}/g;
		// replace the matched text with a u element
		text = text.replace(TEAM_REGEX, match => {
			// create a u element
			return `<u>${match}</u>`;
		});
		// create a regular expression to match team yardage lines
		const YARD_REGEX = /([ABKR]'s\s[1-4]?[0-9])|([ABKR]'s)/g;
		// replace the matched text with a bold element
		text = text.replace(YARD_REGEX, match => {
			// create a bold element
			return `<b>${match}</b>`;
		});
		// create a regular expression to match a rule reference
		const RULE_REGEX = /Rule ([0-9]{1,2}-[0-9]{1,2}-[0-9]{1,2}[A-Z]{0,1})/g;
		// replace the matched text with a u element
		text = text.replace(RULE_REGEX, match => {
			// create a u element
			return `<u>${match}</u>`;
		});
		// if text matched 'accept', make the text green
		text = text.replace(/accepts|accepted|accept/gi, '<span class="accept">$&</span>');
		// if text matched 'decline', make the text red
		text = text.replace(/declines|declined|decline/gi, '<span class="decline">$&</span>');
		// if text matched 'offset', make the text yellow
		text = text.replace(/offset/gi, '<span class="offset">$&</span>');
		// if text matched 'open', make the text blue
		text = text.replace(/opens|open/gi, '<span class="open">$&</span>');
		// if text matched 'closed', make the text pink
		text = text.replace(/closes|closed/gi, '<span class="closed">$&</span>');
		// return the formatted text
		return text;
	}

	/**
	 * Copy the case play url to the clipboard.
	 */
	function copy(): void {
		// copy url to clipboard
		navigator.clipboard.writeText(window.location.href);
		// add green background to share button
		const button = document.getElementById('share');
		// if no button found, return
		if (!button) return;
		// if button already has green background, return
		if (button.classList.contains('!bg-green-500')) return;
		// make button have green background
		button.classList.add('!bg-green-500', 'scale-105');
		// set button text to 'copied'
		button.textContent = 'copied';
		// remove it after 1 second
		setTimeout(() => {
			button?.classList.remove('!bg-green-500', 'scale-105');
			button.textContent = 'copy url';
		}, 1000);
	}
</script>

<svelte:head>
	<title>{casePlay.name}</title>
</svelte:head>

<main class="bg-stone-100 min-h-screen overflow-hidden">
	<!-- START: Home Button -->
	<a href="../../">
		<button
			class="absolute select-none left-[50%] top-3 translate-x-[-50%] bg-stone-800 px-14 py-1 text-xs font-semibold text-white shadow-lg transition duration-150 ease-out hover:scale-105 hover:bg-stone-900 active:bg-black lg:top-4 lg:left-4 lg:flex lg:translate-x-0 lg:bg-stone-800 lg:px-3 lg:text-base">
			home
		</button></a>
	<!-- END: Home Button -->
	<section class="mt-1 flex w-full flex-col space-y-6 py-10 lg:pt-40">
		<!-- START: Case Play Info -->
		<div class="flex flex-col space-y-1.5">
			<!-- START: Case Play Name -->
			<h1 class="mx-auto text-center border-b-4 border-stone-900 px-5 pb-3 text-2xl sm:3xl lg:text-5xl">
				{casePlay.name}
			</h1>
			<!-- END: Case Play Name -->

			<!-- START: Case Play Author -->
			<h2 class="mx-auto text-center text-stone-700 text-sm lg:text-base">
				authored by {casePlay.author}
			</h2>
			<!-- END: Case Play Author -->
		</div>
		<!-- END: Case Play Info -->
		<div class="mx-auto flex flex-col space-y-5 px-3 text-lg text-stone-900 lg:w-2/5 lg:px-0">
		<div class="mx-auto flex flex-col space-y-5 px-3 text-lg text-stone-900 lg:w-2/5 lg:px-0 leading-[1.425]">
			<!-- START: Case Play Prompt -->
			<p
				id="prompt"
				class="border-2 border-stone-900 bg-white p-4 shadow-lg selection:bg-black/20"
				contenteditable="false"
				bind:innerHTML={prompt} />
			<!-- END: Case Play Prompt -->

			<!-- START: Case Play Answer -->
			<spoiler id="answer" class="group" contenteditable="false" bind:innerHTML={answer} />
			<!-- END: Case Play Answer -->

			<div class="space-between flex flex-row items-center">
				<!-- START: Reveal Spoiler Tip -->
				<div class="flex select-none flex-row items-center space-x-2 pl-2 text-sm">
					<svg
						fill="#000000"
						version="1.1"
						id="Capa_1"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						width="20px"
						height="20px"
						viewBox="0 0 32 32"
						xml:space="preserve">
						<g>
							<path
								class="fill-stone-600"
								d="M17.962,24.725l1.806,0.096v2.531h-7.534v-2.406l1.045-0.094c0.568-0.063,0.916-0.254,0.916-1.014v-8.801 c0-0.699-0.188-0.92-0.791-0.92l-1.106-0.062v-2.626h5.666L17.962,24.725L17.962,24.725z M15.747,4.648 c1.394,0,2.405,1.047,2.405,2.374c0,1.331-1.014,2.313-2.438,2.313c-1.454,0-2.404-0.982-2.404-2.313 C13.31,5.695,14.26,4.648,15.747,4.648z M16,32C7.178,32,0,24.822,0,16S7.178,0,16,0c8.82,0,16,7.178,16,16S24.82,32,16,32z M16,3 C8.832,3,3,8.832,3,16s5.832,13,13,13s13-5.832,13-13S23.168,3,16,3z" />
						</g>
					</svg>
					<p class="font-semibold text-stone-600 lg:hidden">tap box to reveal</p>
					<p class="hidden font-semibold text-stone-600 lg:flex">hover over box to reveal</p>
				</div>
				<!-- END: Reveal Spoiler Tip -->

				<!-- START: Copy URL Button -->
				<button
					id="share"
					on:click={copy}
					class="ml-auto w-24 select-none bg-stone-700 px-2 py-1 font-semibold text-white shadow-md transition-all duration-150 ease-out hover:scale-105 hover:bg-stone-800 active:bg-green-500">
					copy url
				</button>
				<!-- END: Copy URL Button -->
			</div>
		</div>
	</section>
</main>
