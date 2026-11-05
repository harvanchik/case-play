from pathlib import Path
import re
root=Path('src/lib'); host=root/'components/FlagFootballPlayBuilder.svelte';s=host.read_text(encoding='utf-8')
def write(path,text):(root/path).write_text(text,encoding='utf-8')
def imp(name,module):
 global s
 s=s.replace('<script lang="ts">',f'<script lang="ts">\n import {name} from \'$lib/{module}\';',1)

# Tabs own the established markup and animation; menu content is a sport-independent slot.
a=s.index('\t\t\t<div\n\t\t\t\tdata-tutorial="play-management"')
b=s.index('\n\t\t\t\t{#if editingPlayId !== null}',a)
tabs=s[a:b]
tabs=tabs.replace('playEntries[activePlayIndex]?.id','activeId').replace('playEntries.length','count').replace('PLAY_BUILDER_MAX_PLAYS','maximum').replace('alternateModifierKey','addModifier')
tabs=tabs.replace('playDrag?.moved&&playDrag.id===play.id','drag?.moved&&drag.id===play.id').replace('{orderedPlays as play','{plays as play')
tabs=tabs.replace('beginPlayDrag(event,play.id)','onbegin(event,play.id)').replace('switchPlay(play.id)','onselect(play.id)').replace('openPlayMenu(event, play.id)','onmenu(event, play.id)').replace('on:click={addPlay}','on:click={onadd}').replace('bind:this={playStripElement}','bind:this={strip}')
tabs=tabs.replace('style="right: 70.5%; bottom: calc(50% - 23.8cqw);"','style:right={presentation?"60%":"70.5%"} style:bottom={presentation?"8px":"calc(50% - 23.8cqw)"}')
header='''<script lang="ts">
 import {flip} from 'svelte/animate';
 import HoverTooltip from '../HoverTooltip.svelte';
 export let plays:{id:number;name:string}[];
 export let activeId:number|undefined;
 export let editingPlayId:number|null=null;
 export let count:number;export let maximum:number;
 export let viewOnly=false;export let presentation=false;
 export let addModifier:string;
 export let strip:HTMLDivElement;
 export let drag:{id:number;moved:boolean}|null=null;
 export let onbegin:(event:PointerEvent,id:number)=>void;
 export let onselect:(id:number)=>void;
 export let onmenu:(event:MouseEvent,id:number)=>void;
 export let onadd:()=>void;
</script>
'''
styles='''<style>
 .play-management-toolbar{transform:scale(var(--builder-action-scale));transform-origin:bottom left;}
 .play-tabs-scroll{scrollbar-width:none;}.play-tabs-scroll::-webkit-scrollbar{display:none;width:0;height:0;}
 @container(max-width:900px){.play-management-toolbar{transform:scale(.72);}}
 @container(min-width:901px) and (max-width:1080px){.play-management-toolbar{transform:scale(.82);}}
</style>
'''
write(Path('components/play-builder/BuilderPlayTabs.svelte'),header+tabs+'\n<slot/>\n</div>\n'+styles)
# Keep the existing menu slotted in the same wrapper, with no extra DOM.
end=s.index('\n\t\t\t{#if !viewOnly}<BuilderActionBar',b)
close=s.rfind('</div>',b,end)
s=s[:close]+'</BuilderPlayTabs>'+s[close+6:]
s=s[:a]+'''<BuilderPlayTabs plays={orderedPlays} activeId={playEntries[activePlayIndex]?.id} {editingPlayId} count={playEntries.length} maximum={PLAY_BUILDER_MAX_PLAYS} {viewOnly} {presentation} addModifier={alternateModifierKey} bind:strip={playStripElement} drag={playDrag} onbegin={beginPlayDrag} onselect={switchPlay} onmenu={openPlayMenu} onadd={addPlay}>'''+s[b:]
imp('BuilderPlayTabs','components/play-builder/BuilderPlayTabs.svelte')
s=s.replace("import { flip } from 'svelte/animate';",'')
a=s.index(' function beginPlayDrag(');b=s.index('\n\tconst switchPlay',a)
s=s[:a]+''' const playReorderController=createReorderController<number>({
  ids:()=>playEntries.map(play=>play.id),
  enabled:()=>!viewOnly&&!tutorialActive&&!actionInProgress&&editingPlayId===null,
  preview:(order,drag)=>{playOrder=order;playDrag=drag;},
  capture:id=>playStripElement?.setPointerCapture(id),
  scroll:x=>{const rail=playStripElement;if(!rail)return;const bounds=rail.getBoundingClientRect();if(x<bounds.left+20)rail.scrollLeft-=12;if(x>bounds.right-20)rail.scrollLeft+=12;},
  hit:x=>{const hit=[...playStripElement.querySelectorAll<HTMLElement>('[data-play-id]')].find(button=>{const r=button.getBoundingClientRect();return x>=r.left&&x<=r.right;});return hit?Number(hit.dataset.playId):undefined;},
  suppressClick:()=>{suppressPlayClick=true;setTimeout(()=>suppressPlayClick=false,0);},
  commit:order=>{saveHistory();const activeId=playEntries[activePlayIndex].id;storeActivePlayState();playEntries=order.map(id=>playEntries.find(play=>play.id===id)!);activePlayIndex=playEntries.findIndex(play=>play.id===activeId);syncActivePlayUrl();}
 });
 const beginPlayDrag=playReorderController.begin;
 const movePlayDrag=playReorderController.move;
 const endPlayDrag=playReorderController.end;
'''+s[b:]
s=s.replace('let playDrag:{id:number;x:number;moved:boolean}|null=null;','let playDrag:{id:number;moved:boolean}|null=null;')
imp('{ createReorderController }','play-builder-reorder-controller')
css=s.index('<style>');head,styles=s[:css],s[css:]
styles=re.sub(r'(?m)^\s*\.play-management-toolbar\s*\{[^}]*\}', '',styles)
styles=re.sub(r'(?m)^\s*\.play-tabs-scroll(?:::-webkit-scrollbar)?\s*\{[^}]*\}', '',styles)
styles=styles.replace('.play-management-toolbar',':global(.play-management-toolbar)')
s=head+styles

# One reusable dock portal owns stacking/placement, retaining the same DOM and CSS.
a=s.index(' const animationPortal =');b=s.index(' const togglePresentation=',a)
s=s[:a]+s[b:]
start=s.index('<div use:animationPortal={presentation}')
endopen=s.index('>',start)+1
depth=1;end=None
for m in re.finditer(r'<div\b[^>]*>|</div>',s[endopen:],re.S):
 depth+=-1 if m.group().startswith('</') else 1
 if depth==0:end=endopen+m.start();break
assert end is not None
opening='''<BuilderAnimationDock fullscreenRoot={presentation?builderRoot:null} left={animationDockLeft} width={animationDockWidth} hidden={videoController !== null || showSetupConfirm || showSettings || showExportSettings || showFeedback || showHelp || tutorialActive && !animationTutorialActive}>'''
s=s[:start]+opening+s[endopen:end]+'</BuilderAnimationDock>'+s[end+6:]
write(Path('components/play-builder/BuilderAnimationDock.svelte'),'''<script lang="ts">
 export let fullscreenRoot:HTMLElement|null=null;
 export let left:number;export let width:number;export let hidden=false;
 const portal=(node:HTMLElement,root:HTMLElement|null)=>{const move=(target:HTMLElement|null)=>(target??document.body).appendChild(node);move(root);return{update:move,destroy:()=>node.remove()};};
</script>
<div use:portal={fullscreenRoot} class="animation-dock" class:invisible={hidden} style:left={`${left}px`} style:width={`${width}px`}><slot/></div>
<style>.animation-dock{position:fixed;bottom:8px;z-index:1000;height:112px;pointer-events:none;}.animation-dock :global([data-animation-ui]){pointer-events:auto;}</style>
''')
imp('BuilderAnimationDock','components/play-builder/BuilderAnimationDock.svelte')
css=s.index('<style>');head,styles=s[:css],s[css:]
styles=re.sub(r'\n\t\.animation-dock\s*\{[^}]*\}\s*\.animation-dock :global\(\[data-animation-ui\]\)\s*\{[^}]*\}', '',styles)
s=head+styles
host.write_text(s,encoding='utf-8')
