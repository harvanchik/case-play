<script lang="ts">
 import {version} from '../../../package.json';
 import PublicSiteNav from '$lib/components/PublicSiteNav.svelte';
 import PublicSiteFooter from '$lib/components/PublicSiteFooter.svelte';
 import type {PageData} from './$types';
 export let data:PageData;
 const dateLabel=(date:string)=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
 const badges:Record<string,string>={Added:'border-emerald-200 bg-emerald-50 text-emerald-800',Changed:'border-sky-200 bg-sky-50 text-sky-800',Fixed:'border-amber-200 bg-amber-50 text-amber-800',Removed:'border-rose-200 bg-rose-50 text-rose-800'};
</script>

<svelte:head>
 <title>What’s New | CasePlay.org</title>
 <meta name="description" content="See what’s new in the CasePlay Play Builder, case plays, and the rest of the app."/>
</svelte:head>

<main class="min-h-screen bg-stone-100 text-stone-800">
 <PublicSiteNav/>
 <div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 bg-[url(/svg/graph.svg)]"></div>
 <div class="mx-auto max-w-3xl px-4 pt-20 pb-8 sm:px-6">
  <header class="mb-7 text-center">
   <h1 class="font-dokdo text-5xl uppercase sm:text-6xl">What’s New</h1>
  </header>
  {#each data.releases as release (release.version)}
   <article id={`v${release.version}`} aria-labelledby={`release-${release.version}`} class="mb-7 scroll-mt-16 border-2 border-stone-900 bg-white shadow-[4px_4px_0_rgba(28,25,23,0.15)]">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-7">
     <div class="flex items-center gap-3"><h2 id={`release-${release.version}`} class="text-xl font-black tabular-nums sm:text-2xl">v{release.version}</h2>{#if release.version===version}<span class="bg-stone-900 px-2 py-1 text-[10px] font-bold tracking-wide text-white uppercase">Latest</span>{/if}</div>
     {#if release.date}<time datetime={release.date} class="text-xs text-stone-500 sm:text-sm">{dateLabel(release.date)}</time>{/if}
    </header>
    <div class="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
     {#each release.summary as paragraph}<p class="text-sm leading-6 text-stone-600">{paragraph}</p>{/each}
     {#each release.sections as section}
      <section aria-label={`${section.name} updates in v${release.version}`}>
       <h3 class="mb-3 text-lg font-bold">{section.name}</h3>
       <div class="space-y-4">{#each section.groups as group}
        <div><h4 class={`mb-2 inline-block border px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${badges[group.name]??'border-stone-200 bg-stone-100 text-stone-700'}`}>{group.name}</h4>
         <ul class="list-disc space-y-1.5 pl-5 text-sm leading-6 text-stone-700">{#each group.items as item}<li>{item}</li>{/each}</ul>
        </div>
       {/each}</div>
      </section>
     {/each}
    </div>
   </article>
  {/each}
 </div>
 <PublicSiteFooter/>
</main>
