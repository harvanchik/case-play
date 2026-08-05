<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import DesktopPlayBuilderGate from '$lib/components/DesktopPlayBuilderGate.svelte';
	import type { SerializedPlayBuilderDocument } from '$lib/play-builder-scene';

	type SavedFlagFootballDiagramPageData = {
		playId: string;
		initialDocument: SerializedPlayBuilderDocument;
		activePlayName: string;
		activePlayNumber: number;
		playCount: number;
		updatedAt: string;
		accountOwnedByCurrentUser: boolean;
		accountSessionActive: boolean;
		accountCsrfToken?: string | null;
	};

	export let data: SavedFlagFootballDiagramPageData;

	$: socialImage = `https://caseplay.org/diagram/flag-football/${data.playId}/social.png?play=${data.activePlayNumber}&v=5-${encodeURIComponent(data.updatedAt)}`;
	const pageTitle = 'Flag Football Play Builder | caseplay.org';
	$: pageDescription = `View “${data.activePlayName},” a shared flag football diagram${data.playCount > 1 ? ` with ${data.playCount} plays` : ''} created in the CasePlay.org Flag Football Play Builder.`;
	let adsEnabled = false;
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

<PublicSiteNav />
<main class="relative isolate min-h-[calc(100vh-2rem)] w-full overflow-x-hidden bg-stone-100 p-4">
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-[url(/svg/graph.svg)]"></div>
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-stone-100/[97%]"></div>
	<DesktopPlayBuilderGate>
		<div slot="mobile" class="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl flex-col justify-center py-6">
			<div class="w-full overflow-hidden border-2 border-stone-900 bg-stone-800 shadow-lg">
				<FlagFootballPlayBuilder
					initialDocument={data.initialDocument}
					savedPlayId={data.playId}
					viewOnly={!data.accountOwnedByCurrentUser}
					accountOwnedByCurrentUser={data.accountOwnedByCurrentUser}
					accountSessionActive={data.accountSessionActive}
					accountCsrfToken={data.accountCsrfToken ?? null}
				/>
			</div>
		</div>
		<div
			class="relative z-10 grid w-full grid-cols-1 items-stretch gap-4 lg:absolute lg:inset-x-4 lg:top-2 lg:bottom-4 lg:w-auto {adsEnabled
				? 'lg:grid-cols-[minmax(0,1fr)_clamp(180px,18vw,300px)]'
				: 'lg:grid-cols-1'}"
			style="min-height: calc(100vh - 4rem);"
		>
			<div class="flex min-w-0 items-start justify-center">
				<div class="min-w-0 lg:relative" style="width: min(100%, max(0px, calc((100dvh - 7.25rem) * 2.1))); container-type: inline-size;">
					<header class="pb-2 text-center">
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
					<FlagFootballPlayBuilder
						initialDocument={data.initialDocument}
						savedPlayId={data.playId}
						bind:adsEnabled
						viewOnly={!data.accountOwnedByCurrentUser}
						accountOwnedByCurrentUser={data.accountOwnedByCurrentUser}
						accountSessionActive={data.accountSessionActive}
						accountCsrfToken={data.accountCsrfToken ?? null}
					/>
					<div class="lg:absolute lg:inset-x-0 lg:top-full">
						<PlayBuilderAttribution />
					</div>
				</div>
			</div>
			{#if adsEnabled}
				<div class="flex min-w-0 items-center justify-center">
					<PlayBuilderAd />
				</div>
				<div class="w-full lg:hidden">
					<PlayBuilderAd orientation="horizontal" />
				</div>
			{/if}
		</div>
	</DesktopPlayBuilderGate>
</main>
