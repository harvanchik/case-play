<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	$: ({ casePlay } = data); // deconstruct data into casePlay

	// formatted case play text
	$: play = format(casePlay.play);
	// formatted case play answer
	$: answer = format(casePlay.answer);

	/**
	 * Format the case play text.
	 * @param text The case play text.
	 * @returns The formatted case play text.
	 */
	function format(text: string) {
		// create a regular expression to match text in parentheses
		var letterRegex = /\(([a-z])\)/g;
		// replace the matched text with a mark element
		text = text.replace(letterRegex, (match, p1) => {
			// create a mark element
			var mark = document.createElement('mark');
			// set the color attribute based on the letter
			if (p1 === 'a') {
				mark.setAttribute('green', 'true');
			} else if (p1 === 'b') {
				mark.setAttribute('blue', true);
			} else if (p1 === 'c') {
				mark.setAttribute('orange', true);
			} else if (p1 === 'd') {
				mark.setAttribute('indigo', true);
			} else if (p1 === 'e') {
				mark.setAttribute('red', true);
			}
			// set the text of the mark element
			mark.textContent = match;
			// return the mark element as a string
			return mark.outerHTML;
		});
		// create a regular expression to match teams
		var teamRegex = /Team ([ABKR])|[ABKR]-[0-9]{1,2}/g;
		// replace the matched text with a team element
		text = text.replace(teamRegex, (match, p1) => {
			// create a team element
			var team = document.createElement('team');
			// set the text of the team element
			team.textContent = match;
			// return the team element as a string
			return team.outerHTML;
		});
		// create a regular expression to match team yard lines
		// var yardRegex = /[ABKR]'s\s[1-4]?[0-9]/g;
		var yardRegex = /([ABKR]'s\s[1-4]?[0-9])|([ABKR]'s)/g;
		// replace the matched text with a bold element
		text = text.replace(yardRegex, (match, p1) => {
			// create a bold element
			var team = document.createElement('bold');
			// set the text of the bold element
			team.textContent = match;
			// return the bold element as a string
			return team.outerHTML;
		});
		return text;
	}
</script>

<main class="bg-stone-100 min-h-screen overflow-hidden">
	<!-- START: Home Button -->
	<a href="../../">
		<button
			class="absolute select-none left-[50%] top-3 translate-x-[-50%] bg-stone-800 px-16 py-1 text-xs font-semibold text-white shadow-lg transition duration-150 ease-out hover:scale-105 hover:bg-stone-900 active:bg-black lg:top-4 lg:left-4 lg:flex lg:translate-x-0 lg:bg-stone-800 lg:px-3 lg:text-base">
			home
		</button></a>
	<!-- END: Home Button -->
	<section class="mt-1 flex w-full flex-col space-y-6 py-10 lg:pt-40">
		<div class="flex flex-col space-y-2">
			<h1 class="mx-auto w-max border-b-4 border-stone-900 px-5 pb-3 text-5xl">
				{casePlay.name}
			</h1>
			<h2 class="mx-auto w-max text-sm text-stone-700">
				created by <a href="https://jake.harvanchik.me" target="_blank" rel="noreferrer" class="underline"
					>Jake Harvanchik</a>
			</h2>
		</div>
		<div class="mx-auto flex flex-col space-y-5 px-3 text-lg text-stone-900 lg:w-2/5 lg:px-0">
			<p
				class="border-2 border-stone-900 bg-white p-4 shadow-lg"
				contenteditable="false"
				bind:innerHTML={play} />
			<spoiler class="group" contenteditable="false" bind:innerHTML={answer} />
			<div class="space-between flex flex-row items-center">
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
								d="M17.962,24.725l1.806,0.096v2.531h-7.534v-2.406l1.045-0.094c0.568-0.063,0.916-0.254,0.916-1.014v-8.801
		c0-0.699-0.188-0.92-0.791-0.92l-1.106-0.062v-2.626h5.666L17.962,24.725L17.962,24.725z M15.747,4.648
		c1.394,0,2.405,1.047,2.405,2.374c0,1.331-1.014,2.313-2.438,2.313c-1.454,0-2.404-0.982-2.404-2.313
		C13.31,5.695,14.26,4.648,15.747,4.648z M16,32C7.178,32,0,24.822,0,16S7.178,0,16,0c8.82,0,16,7.178,16,16S24.82,32,16,32z M16,3
		C8.832,3,3,8.832,3,16s5.832,13,13,13s13-5.832,13-13S23.168,3,16,3z" />
						</g>
					</svg>
					<p class="font-semibold text-stone-600 lg:hidden">tap & hold box to reveal</p>
					<p class="hidden font-semibold text-stone-600 lg:flex">hover over box to reveal</p>
				</div>
				<button
					id="share"
					class="ml-auto w-max select-none bg-stone-700 px-2 py-1 font-semibold text-white shadow-md transition-all duration-150 ease-out hover:scale-105 hover:bg-stone-800 active:bg-green-500">
					copy url
				</button>
			</div>
		</div>
	</section>
</main>
