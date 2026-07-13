<script lang="ts">
	import youtubeIcon from '$lib/svg/youtube.svg';

	export let casePlay: {
		id: string;
		title: string;
		prompt: string;
		difficulty: number;
		film?: string | null;
	};
	export let href: string;
	export let compact = false;

	const getDifficulty = (difficulty: number) => {
		switch (difficulty) {
			case 1:
				return 'Easy';
			case 2:
				return 'Moderate';
			case 3:
				return 'Hard';
			default:
				return 'Unknown';
		}
	};
</script>

<a
	{href}
	class="group flex cursor-pointer flex-col space-y-1 border border-stone-300 px-2 py-1 transition-colors duration-300 select-none hover:border-stone-500 hover:bg-white/45 hover:shadow-sm hover:backdrop-blur-sm sm:px-4 sm:py-2"
>
	<div class="flex flex-row items-start justify-start">
		<div
			class={`line-clamp-2 flex flex-1 flex-row pb-1 text-xl leading-tight font-bold text-stone-800 transition-colors duration-300 group-hover:text-black ${compact ? 'sm:text-xl' : 'sm:text-2xl'}`}
		>
			<p>{casePlay.title}</p>
		</div>

		<div class="ml-2 flex flex-shrink-0 flex-row items-start space-x-2">
			{#if casePlay.film}
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-no-static-element-interactions -->
				<div
					on:click|preventDefault|stopPropagation={() => casePlay.film && window.open(casePlay.film, '_blank')}
					class="cursor-pointer opacity-85 transition-transform duration-150 hover:scale-110 hover:opacity-100"
				>
					<img class="h-5" src={youtubeIcon} alt="youtube" />
				</div>
			{/if}

			<div
				class="bg-opacity-80 group-hover:bg-opacity-100 mt-[4px] w-max px-2 py-0.5 text-xs text-white transition-colors duration-300 sm:text-sm"
				class:bg-green-600={casePlay.difficulty === 1}
				class:bg-yellow-400={casePlay.difficulty === 2}
				class:!text-black={casePlay.difficulty === 2}
				class:bg-red-600={casePlay.difficulty === 3}
			>
				{getDifficulty(casePlay.difficulty)}
			</div>
		</div>
	</div>
	<div
		class={`text-stone-600 ${compact ? 'line-clamp-4 text-sm leading-snug sm:text-base' : 'line-clamp-6 text-base leading-tight sm:line-clamp-5 sm:text-lg sm:leading-snug'}`}
	>
		{casePlay.prompt}
	</div>
</a>
