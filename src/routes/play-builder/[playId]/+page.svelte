<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import DesktopPlayBuilderGate from '$lib/components/DesktopPlayBuilderGate.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: socialImage = `https://caseplay.org/play-builder/${data.playId}/social.png?play=${data.activePlayNumber}&v=${encodeURIComponent(data.updatedAt)}`;
	$: pageTitle = `${data.activePlayName} | Shared Flag Football Play | CasePlay.org`;
	$: pageDescription = `View “${data.activePlayName},” a shared flag football diagram${data.playCount > 1 ? ` with ${data.playCount} plays` : ''} created in the CasePlay.org Flag Football Play Builder.`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta name="robots" content="noindex, follow, max-image-preview:large" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={socialImage} />
	<meta property="og:image:secure_url" content={socialImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Shared flag football play diagram from CasePlay.org" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={socialImage} />
</svelte:head>

<PublicSiteNav compact />
<main class="relative isolate min-h-[calc(100vh-2rem)] w-full overflow-x-hidden bg-stone-100 p-4">
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-[url(/svg/graph.svg)]"></div>
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-stone-100/[97%]"></div>
	<DesktopPlayBuilderGate>
		<div slot="mobile" class="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl flex-col justify-center py-6">
			<div class="w-full overflow-hidden border-2 border-stone-900 bg-stone-800 shadow-lg">
				<FlagFootballPlayBuilder initialDocument={data.initialDocument} savedPlayId={data.playId} viewOnly />
			</div>
		</div>
		<div
			class="relative z-10 grid w-full grid-cols-1 items-stretch gap-4 lg:absolute lg:inset-4 lg:w-auto lg:grid-cols-[minmax(0,1fr)_clamp(180px,18vw,300px)]"
			style="min-height: calc(100vh - 4rem);"
		>
			<div class="flex min-w-0 items-center justify-start">
				<div class="min-w-0 lg:relative" style="width: min(100%, calc((100vh - 6rem) * 2.1)); container-type: inline-size;">
					<header class="pb-2 text-center lg:absolute lg:inset-x-0 lg:bottom-full">
						<h1
							class="font-dokdo leading-none font-semibold tracking-[0.04em] whitespace-nowrap text-stone-800 uppercase select-none text-shadow-md"
							style="font-size: clamp(1.25rem, 6cqw, 4.25rem);"
						>
							Flag Football Play Builder
						</h1>
						<p class="font-neucha -mt-3 text-stone-600" style="font-size: clamp(0.75rem, 2cqw, 1.25rem);">
							create, annotate, export, save, and share diagrams with the original Flag Football Play Builder tool.
						</p>
					</header>
					<FlagFootballPlayBuilder initialDocument={data.initialDocument} savedPlayId={data.playId} />
					<div class="lg:absolute lg:inset-x-0 lg:top-full">
						<PlayBuilderAttribution />
					</div>
				</div>
			</div>
			<div class="flex min-w-0 items-center justify-center">
				<PlayBuilderAd />
			</div>
			<div class="w-full lg:hidden">
				<PlayBuilderAd orientation="horizontal" />
			</div>
		</div>
	</DesktopPlayBuilderGate>
</main>
