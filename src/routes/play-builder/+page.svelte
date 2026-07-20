<script lang="ts">
	import FlagFootballPlayBuilder from '$lib/components/FlagFootballPlayBuilder.svelte';
	import PlayBuilderAd from '$lib/components/PlayBuilderAd.svelte';
	import PlayBuilderAttribution from '$lib/components/PlayBuilderAttribution.svelte';
	import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
	import DesktopPlayBuilderGate from '$lib/components/DesktopPlayBuilderGate.svelte';

	const pageTitle = 'Flag Football Play Builder | Draw, Save & Share Plays | CasePlay.org';
	const pageDescription =
		'Create flag football play diagrams online. Draw routes, place players and officials, customize fields, save plays, and share or export your diagrams.';
	const socialImage = 'https://caseplay.org/play-builder/social.png?v=1';
	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'Flag Football Play Builder',
		url: 'https://caseplay.org/play-builder',
		description: pageDescription,
		applicationCategory: 'SportsApplication',
		operatingSystem: 'Any web browser',
		browserRequirements: 'Requires a desktop-sized screen for editing',
		isAccessibleForFree: true,
		image: socialImage,
		featureList: [
			'Draw run, pass, and punt routes',
			'Place players, officials, footballs, flags, and field markers',
			'Use traditional, 4v4, and unified flag football fields',
			'Save and share multi-play diagrams',
			'Export diagrams as PNG, JPG, WebP, or PDF'
		],
		creator: { '@type': 'Person', name: 'Jake Harvanchik', url: 'https://caseplay.org/about' },
		publisher: { '@type': 'Organization', name: 'CasePlay.org', url: 'https://caseplay.org' }
	};
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<meta name="robots" content="index, follow, max-image-preview:large" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={socialImage} />
	<meta property="og:image:secure_url" content={socialImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Flag Football Play Builder field diagram from CasePlay.org" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={socialImage} />
	{@html `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`}
</svelte:head>

<PublicSiteNav compact />
<main class="relative isolate min-h-[calc(100vh-2rem)] w-full overflow-x-hidden bg-stone-100 p-4">
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-[url(/svg/graph.svg)]"></div>
	<div aria-hidden="true" class="pointer-events-none fixed inset-0 z-0 bg-stone-100/[97%]"></div>
	<DesktopPlayBuilderGate>
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
							create, annotate, export, save, and share officiating diagrams with the original Flag Football Play Builder tool.
						</p>
					</header>
					<FlagFootballPlayBuilder />
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
