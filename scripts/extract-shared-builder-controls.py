from pathlib import Path
import re
root=Path('src/lib');host=root/'components/FlagFootballPlayBuilder.svelte';s=host.read_text(encoding='utf-8')
def write(path,text):(root/path).write_text(text,encoding='utf-8')
def imp(name,module):
 global s
 s=s.replace('<script lang="ts">',f'<script lang="ts">\n import {name} from \'$lib/{module}\';',1)

a=s.index('{#if !presentation}<BuilderActionBar');b=s.index('\n{/if}',a)
markup=s[a:b].replace('{#if !presentation}','',1)
replacements={
 "videoController && !['mp4','mov','webm','gif'].includes(actionInProgress ?? '')?videoProgress:null":"imageProgress",
 "videoController && ['mp4','mov','webm','gif'].includes(actionInProgress ?? '')?videoProgress:null":"videoProgress",
 "()=>videoController?.abort()":"oncancel", "playEntries.length>1":"multipleImages", "animatedPlayIndexes.length>1":"multipleVideos",
 "format=>exportBatch(format)":"onall", "tutorialActive||actionInProgress!==null":"disabled", "tutorialActive || actionInProgress !== null":"disabled",
 "format=>exportImage(format as 'png'|'jpg'|'webp'|'pdf')":"onimage", "format=>exportVideo(format as VideoFormat)":"onvideo",
 "(!dev && !accountSessionActive)||!animatedPlayIndexes.length||disabled":"videoDisabled", "(!dev && !accountSessionActive)||disabled":"videoAllDisabled",
 "!dev && !accountSessionActive?'Sign in to Use':!animatedPlayIndexes.length?'Create an Animation First':''":"videoTooltip",
 "primaryModifierKey":"modifier", "showExportSettings":"settingsOpen", "openExportSettings":"onsettings", "togglePresentation":"onfullscreen"
}
for x,y in replacements.items():markup=markup.replace(x,y)
header='''<script lang="ts">
 import BuilderActionBar from './BuilderActionBar.svelte';
 import BuilderActionButton from './BuilderActionButton.svelte';
 import ExportDropdown from './ExportDropdown.svelte';
 export let imageProgress:number|null=null;export let videoProgress:number|null=null;
 export let multipleImages=false;export let multipleVideos=false;
 export let disabled=false;export let videoDisabled=false;export let videoAllDisabled=false;
 export let videoTooltip='';export let modifier:string;export let settingsOpen=false;
 export let oncancel:()=>void;export let onall:(format:string)=>void;
 export let onimage:(format:string)=>void;export let onvideo:(format:string)=>void;
 export let onsettings:()=>void;export let onfullscreen:()=>void;
</script>
'''
write(Path('components/play-builder/BuilderExportControls.svelte'),header+markup)
s=s[:a]+'''{#if !presentation}<BuilderExportControls imageProgress={videoController&&!['mp4','mov','webm','gif'].includes(actionInProgress??'')?videoProgress:null} videoProgress={videoController&&['mp4','mov','webm','gif'].includes(actionInProgress??'')?videoProgress:null} oncancel={()=>videoController?.abort()} multipleImages={playEntries.length>1} multipleVideos={animatedPlayIndexes.length>1} onall={exportBatch} disabled={tutorialActive||actionInProgress!==null} onimage={format=>exportImage(format as 'png'|'jpg'|'webp'|'pdf')} onvideo={format=>exportVideo(format as VideoFormat)} videoAllDisabled={(!dev&&!accountSessionActive)||tutorialActive||actionInProgress!==null} videoDisabled={(!dev&&!accountSessionActive)||!animatedPlayIndexes.length||tutorialActive||actionInProgress!==null} videoTooltip={!dev&&!accountSessionActive?'Sign in to Use':!animatedPlayIndexes.length?'Create an Animation First':''} modifier={primaryModifierKey} settingsOpen={showExportSettings} onsettings={openExportSettings} onfullscreen={togglePresentation}/>'''+s[b:]
imp('BuilderExportControls','components/play-builder/BuilderExportControls.svelte')
s=s.replace("\timport ExportDropdown from './play-builder/ExportDropdown.svelte';",'').replace(" import ExportDropdown from './play-builder/ExportDropdown.svelte';",'')

a=s.index('{#if presentation}<div class="presentation-actions');b=s.index('\n<BuilderPlayTabs',a)
top=s[a:b].replace('{#if presentation}','',1).removesuffix('{/if}\n')
top=top.replace("tool==='laser'",'laser').replace('clickPresentationLaser','onlaser').replace('fadeLaserDrawings','onclear').replace('togglePresentation','onexit')
write(Path('components/play-builder/BuilderPresentationControls.svelte'),'''<script lang="ts">
 import BuilderActionButton from './BuilderActionButton.svelte';import AnimationIcon from './AnimationIcon.svelte';
 export let laser=false;export let onlaser:()=>void;export let onclear:()=>void;export let onexit:()=>void;
</script>
'''+top)
s=s[:a]+'''{#if presentation}<BuilderPresentationControls laser={tool==='laser'} onlaser={clickPresentationLaser} onclear={fadeLaserDrawings} onexit={togglePresentation}/>{/if}
'''+s[b:]
imp('BuilderPresentationControls','components/play-builder/BuilderPresentationControls.svelte')

a=s.index(' <BuilderActionBar position="bottom-right" label="Shared playback controls"');b=s.index('\n {/if}',a)
bottom=s[a:b]
bottom=bottom.replace('animationDuration(animation)','duration').replace('!animation','!hasAnimation').replace('animationTime','time').replace('animationPlaying','playing').replace('animationRate','rate').replace('animationLoop','loop').replace('animationOpen','open').replace('ownershipResolved','ready')
bottom=bottom.replace('()=>open=!open','ontimeline').replace('selectAnimationStep(0)','onstart()').replace('toggleAnimationPlayback','onplay').replace('cycleViewerSpeed','onspeed').replace('() => loop = !loop','onloop')
write(Path('components/play-builder/BuilderPlaybackControls.svelte'),'''<script lang="ts">
 import BuilderActionBar from './BuilderActionBar.svelte';import BuilderActionButton from './BuilderActionButton.svelte';import AnimationIcon from './AnimationIcon.svelte';
 export let presentation=false;export let open=false;export let hasAnimation=false;export let duration=0;
 export let time=0;export let playing=false;export let rate=1;export let loop=false;export let ready=false;
 export let ontimeline:()=>void;export let onstart:()=>void;export let onplay:()=>void;
 export let onspeed:(event:MouseEvent)=>void;export let onloop:()=>void;
</script>
'''+bottom)
s=s[:a]+''' <BuilderPlaybackControls {presentation} open={animationOpen} hasAnimation={!!animation} duration={animationDuration(animation)} time={animationTime} playing={animationPlaying} rate={animationRate} loop={animationLoop} ready={ownershipResolved} ontimeline={()=>animationOpen=!animationOpen} onstart={()=>selectAnimationStep(0)} onplay={toggleAnimationPlayback} onspeed={cycleViewerSpeed} onloop={()=>animationLoop=!animationLoop}/>'''+s[b:]
imp('BuilderPlaybackControls','components/play-builder/BuilderPlaybackControls.svelte')

# Fullscreen controller accepts opaque restoration data, keeping football scene handling in adapter.
a=s.index(' const togglePresentation=');b=s.index(' const togglePresentationLaser=',a)
s=s[:a]+''' const presentationController=createPresentationController({
  root:()=>builderRoot,active:()=>presentation,fullscreenElement:()=>document.fullscreenElement,exitFullscreen:()=>document.exitFullscreen(),message:showActionMessage,
  prepare:()=>{if(hasActiveInlineEditor())commitActiveEditor();pauseAnimation();commitAnimation();storeActivePlayState();const state={tool,open:animationOpen,step:animationStep};animationOpen=false;clearEditorState();selectedTargets=[];selectedDrawingIds=[];tool=spotlightEnabled?'laser':'select';presentation=true;return state;},
  failed:state=>{presentation=false;animationOpen=state.open;tool=state.tool;},
  leave:state=>{pauseAnimation();releaseLaserDrawings();animationOpen=false;presentation=false;animationPreview=true;if(animation)selectAnimationStep(Math.min(state?.step??0,animation.steps.length-1));animationOpen=state?.open??false;tool=state?.tool??'select';}
 });
 const togglePresentation=presentationController.toggle;
 const syncFullscreen=presentationController.sync;
'''+s[b:]
s=re.sub(r'\n let presentationRestore:[^\n]*','',s)
imp('{ createPresentationController }','play-builder-presentation-controller')

# Shared drawing palette: the same controls with generic color IDs and injected keycaps.
a=s.index('\t\t\t\t<div\n\t\t\t\t\tdata-tutorial="draw-options"');b=s.index('\n\t\t\t{/if}\n\t\t</div>',a)
draw=s[a:b]
draw=draw.replace('freeStrokes.length === 0 && !activeFreeStroke','!hasDrawings').replace('runGuardedAction(clearFreeDrawings)','onclear()').replace("toolColorShortcutKeys('free-draw',colorIndex)",'shortcutKeys(colorIndex)').replace('handleDrawColorKeydown(event, colorIndex)','oncolorkey(event, colorIndex)')
header='''<script lang="ts" generics="Color extends string">
 import HoverTooltip from '../HoverTooltip.svelte';
 export let freeDrawShape:'straight'|'squiggle';export let freeDrawMode:'draw'|'erase';
 export let freeDrawColor:Color;export let freeDrawThickness:number;
 export let freeDrawColors:{id:Color;label:string;value:string}[];
 export let hasDrawings:boolean;export let onclear:()=>void;
 export let shortcutKeys:(index:number)=>string[];
 export let oncolorkey:(event:KeyboardEvent,index:number)=>void;
</script>
'''
# Transfer all panel-only container rules so their responsiveness is identical.
css=s.index('<style>');matches=list(re.finditer(r'\n\t\t\.draw-options[^}]*\}',s[css:]))
rules='\n'.join(m.group() for m in matches)
for m in reversed(matches):s=s[:css+m.start()]+s[css+m.end():]
write(Path('components/play-builder/BuilderDrawingTools.svelte'),header+draw+'\n<style>\n@container(min-width:56px){'+rules+'\n}\n</style>')
s=s[:a]+'''<BuilderDrawingTools bind:freeDrawShape bind:freeDrawMode bind:freeDrawColor bind:freeDrawThickness {freeDrawColors} hasDrawings={freeStrokes.length>0||!!activeFreeStroke} onclear={()=>runGuardedAction(clearFreeDrawings)} shortcutKeys={index=>toolColorShortcutKeys('free-draw',index)} oncolorkey={handleDrawColorKeydown}/>'''+s[b:]
imp('BuilderDrawingTools','components/play-builder/BuilderDrawingTools.svelte')

# Use the shared sampler for authored strokes, including stale-pen-up protection.
imp('{ createDrawingController }','play-builder-drawing-controller')
idx=s.index('\tconst beginFreeDrawing =')
s=s[:idx]+' const drawingController=createDrawingController(minimumStraightDrawingLength);\n'+s[idx:]
a=s.index("\t\t\tif (activeFreeDrawShape === 'straight') {",s.index('\t\tif (activeFreeStroke) {',s.index('const movePointer')) if 'const movePointer' in s else s.index('\t\tif (activeFreeStroke) {',s.index('const beginFreeDrawing')))
# The first straight block after the move's strokePoint calculation.
a=s.index("\t\t\tif (activeFreeDrawShape === 'straight') {",s.index('\t\t\tconst strokePoint ='))
b=s.index('\n\t\t\treturn;\n\t\t}',a)
s=s[:a]+'''   const points=drawingController.move(activeFreeStroke.points,strokePoint,activeFreeDrawShape);
   if(points!==activeFreeStroke.points)activeFreeStroke={...activeFreeStroke,points};'''+s[b:]
a=s.index('\t\t\tconst trackedFinalPoint =');b=s.index('\n\t\t\tsaveHistory();',a)
s=s[:a]+'''   const points=drawingController.finish(activeFreeStroke.points,eventFinalPoint,activeFreeDrawShape);
   if(!points){activeFreeStroke=null;activeFreeDrawShape=freeDrawShape;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);return;}
'''+s[b:]

# Complete sharing the Delete action as well as Revert.
a=s.index('<HoverTooltip\n\t\t\t\t\t\t\ttext={selectedTargets.length > 1')
b=s.index('</HoverTooltip>',a)+len('</HoverTooltip>')
old=s[a:b];child=old[old.index('<svg'):old.index('</svg>')+6]
s=s[:a]+'''<ElementActionButton kind="remove" bind:element={deleteButtonElement} label={selectedTargets.length>1?'Delete selected elements':'Delete element'} tooltip={selectedTargets.length>1?'Delete Selected Elements':'Delete Element'} wrapperClass="flex h-7 w-7 shrink-0" buttonClass="flex h-7 w-7 cursor-pointer items-center justify-center border-2 border-white bg-stone-900 text-white shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-white" onactivate={deleteHoveredElement}>'''+child+'</ElementActionButton>'+s[b:]
host.write_text(s,encoding='utf-8')
