from pathlib import Path
import re

root=Path('src/lib')
host=root/'components/FlagFootballPlayBuilder.svelte'
s=host.read_text(encoding='utf-8')
def write(path,text): (root/path).write_text(text,encoding='utf-8')
def imp(name,module):
 global s
 s=s.replace('<script lang="ts">',f'<script lang="ts">\n import {name} from \'$lib/{module}\';',1)

# Move transient annotation rendering unchanged, with explicit surface dimensions.
a=s.index("\t\t\t\t\t\t{#if tool === 'laser' || spotlightStrokes.length")
b=s.index('\n\t\t\t\t\t\t</g>\n{#if passBallId',a)
markup=s[a:b]
markup=markup.replace('width="1000" height="484"','width={width} height={height}')
props={'tool':"string",'spotlightStrokes':'SpotlightStroke[]','laserTrail':'TrailPoint[]','laserDrawings':'LaserDrawing[]','activeLaserDrawing':'ActiveLaserDrawing | null','activeSpotlightStroke':'SpotlightStroke | null','spotlightEnabled':'boolean','laserPointer':'Point | null','pointerOnField':'boolean','spotlightRadius':'number','laserTrailClock':'number','laserFadeDuration':'number','viewOnly':'boolean','presentation':'boolean','rainbowLaserEnabled':'boolean','laserColor':'LaserColor'}
header="<script lang=\"ts\">\n import { laserDrawingPath, laserTrailPath, laserDrawingVisibility, type Point, type TrailPoint, type LaserDrawing, type ActiveLaserDrawing, type SpotlightStroke, type LaserColor } from '$lib/play-builder-annotations';\n"
header+='\n'.join(f' export let {k}: {v};' for k,v in props.items())
header+="\n export let width:number; export let height:number;\n export let laserColorValue:(color:LaserColor)=>string;\n export let laserPaint:(color:LaserColor|'rainbow')=>string;\n</script>\n"
write(Path('components/play-builder/BuilderAnnotationOverlay.svelte'),header+markup)
s=s[:a]+ '<BuilderAnnotationOverlay width={1000} height={484} '+ ' '.join('{'+k+'}' for k in props)+' {laserColorValue} {laserPaint}/>'+s[b:]
imp('BuilderAnnotationOverlay','components/play-builder/BuilderAnnotationOverlay.svelte')

# Shared engine keeps the existing reactive adapter variables/history untouched.
a=s.index('\tconst laserDrawingVisibility =')
b=s.index(' const snapStraightDrawPoint=',a)
block=s[a:b]
visibility=block[:block.index('\tconst startLaserAnimationFrame')]
geometry=block[block.index('\tconst laserDrawingPath ='):]
engine=block[block.index('\tconst startLaserAnimationFrame'):block.index('\tconst laserDrawingPath =')]
reactive=engine[engine.index(" $: if(tool!=="):engine.index('\tconst fadeLaserDrawings')]
engine=engine.replace(reactive,'')
engine=engine.replace('requestAnimationFrame(refreshLaserTrail)','adapter.clock.request(() => run(refreshLaserTrail))').replace('performance.now()','adapter.clock.now()')
engine=engine.replace("const laserLayer = svg?.querySelector<SVGGElement>('[data-laser-pointer-layer]');\n\t\tif (laserLayer?.nextSibling) svg.appendChild(laserLayer);","adapter.promoteLayer();")
engine=engine.replace('svg.setPointerCapture(event.pointerId)','adapter.capture(event.pointerId)')
engine=engine.replace('if (laserDrawingPointerId !== null && svg?.hasPointerCapture(laserDrawingPointerId)) svg.releasePointerCapture(laserDrawingPointerId);','if (laserDrawingPointerId !== null) adapter.release(laserDrawingPointerId);')
engine=engine.replace('saveSpotlightHistory()','adapter.checkpoint(\'spotlight\')').replace('saveHistory()','adapter.checkpoint(\'laser\')')
state={'laserTrailFrame':'number | null','laserTrailClock':'number','laserTrail':'TrailPoint[]','laserDrawings':'LaserDrawing[]','spotlightStrokes':'SpotlightStroke[]','laserPointer':'Point | null','spotlightEnabled':'boolean','spotlightRadius':'number','activeSpotlightStroke':'SpotlightStroke | null','activeLaserDrawing':'ActiveLaserDrawing | null','laserDrawingPointerId':'number | null','rainbowLaserEnabled':'boolean','laserColor':'LaserColor','presentation':'boolean'}
types="""export type Point={x:number;y:number};
export type TrailPoint=Point & {createdAt:number};
export type LaserColor='red'|'green'|'blue'|'purple';
export type LaserDrawing={points:Point[];color:LaserColor|'rainbow';releasedAt:number|null;appearedAt?:number|null};
export type ActiveLaserDrawing={points:Point[];color:LaserColor|'rainbow'};
export type SpotlightStroke={points:Point[];radius:number;releasedAt:number|null};
export const laserFadeDuration=500;
"""
helpers=(visibility+geometry).replace('const laserDrawing','export const laserDrawing').replace('const laserTrailPath','export const laserTrailPath')
config='export type AnnotationState={\n'+'\n'.join(f' {k}:{v};' for k,v in state.items())+'\n};\n'
config+='''export interface AnnotationAdapter {
 read:()=>AnnotationState;
 write:(state:AnnotationState)=>void;
 checkpoint:(kind:'laser'|'spotlight')=>void;
 promoteLayer:()=>void;
 capture:(id:number)=>void;
 release:(id:number)=>void;
 clock:{now:()=>number;request:(callback:()=>void)=>number;cancel:(id:number)=>void};
}
/** Transient presentation marks never enter the sport document or exports. */
export function createAnnotationController(adapter:AnnotationAdapter){
'''
config+='\n'.join(f' let {k}: {v};' for k,v in state.items())+'\n'
keys=', '.join(state)
config+=f' function run<T>(operation:()=>T):T{{ ({{{keys}}}=adapter.read()); try{{return operation();}}finally{{adapter.write({{{keys}}});}} }}\n'
config+=engine
methods=['startLaserAnimationFrame','updateLaserPointer','beginLaserDrawing','continueLaserDrawing','finishLaserDrawing','releaseLaserDrawings','fadeLaserDrawings']
config+='return {\n'+',\n'.join(f' {k}:(...args:Parameters<typeof {k}>)=>run(()=>{k}(...args))' for k in methods)+',\n dispose:()=>run(()=>{if(laserTrailFrame!==null)adapter.clock.cancel(laserTrailFrame);laserTrailFrame=null;})\n};\n}\n'
write(Path('play-builder-annotations.ts'),types+helpers+config)
adapter=''' const annotationController=createAnnotationController({
 read:()=>({KEYS}),
 write:state=>{WRITES},
 checkpoint:kind=>{if(kind==='spotlight')saveSpotlightHistory();else saveHistory();},
 promoteLayer:()=>{const layer=svg?.querySelector<SVGGElement>('[data-laser-pointer-layer]');if(layer?.nextSibling)svg.appendChild(layer);},
 capture:id=>svg.setPointerCapture(id),release:id=>{if(svg?.hasPointerCapture(id))svg.releasePointerCapture(id);},
 clock:{now:()=>performance.now(),request:callback=>requestAnimationFrame(callback),cancel:id=>cancelAnimationFrame(id)}
 });
'''.replace('KEYS',keys).replace('WRITES',''.join(f'{k}=state.{k};' for k in state))
adapter+='\n'.join(f' const {k}=annotationController.{k};' for k in methods)+'\n'+reactive
s=s[:a]+adapter+s[b:]
imp('{ createAnnotationController, laserDrawingVisibility, laserDrawingFingerprint, laserDrawingPath, laserFadeDuration, type SpotlightStroke, type LaserDrawing, type ActiveLaserDrawing, type LaserColor }','play-builder-annotations')
s=re.sub(r'\s*type LaserColor = [^;]+;','',s)
s=re.sub(r'\s*type LaserDrawing = [^\n]+','',s)
s=re.sub(r'\s*type ActiveLaserDrawing = [^\n]+','',s)
s=s.replace('\n\tconst laserFadeDuration = 500;','').replace('\n type SpotlightStroke={points:Point[];radius:number;releasedAt:number|null};','')
s=s.replace('if (laserTrailFrame !== null) cancelAnimationFrame(laserTrailFrame);','annotationController.dispose();')

# Shell bars retain exact DOM layout; children remain sport-supplied actions.
bar='''<script lang="ts">
 export let position:'top-left'|'top-right'|'bottom-right';
 export let label:string;
 export let tutorial:string|undefined=undefined;
 export let hidden=false;
 export let presentation=false;
 export let presentationOnly=false;
 export let role:'toolbar'|undefined=undefined;
 $: toolbarClass=presentationOnly?'presentation-actions':position==='top-left'?'top-action-toolbar':position==='top-right'?'export-action-toolbar':'bottom-action-toolbar';
</script>
<div class={toolbarClass+' absolute z-'+(position==='bottom-right'?'20':'30')+' flex gap-1.5 '+(position==='bottom-right'?'items-end right-2':position==='top-left'?'items-start left-2':'right-2')}
 class:hidden data-tutorial={tutorial} aria-label={label} {role}
 style:top={position==='bottom-right'?undefined:presentationOnly?'8px':'calc(50% - 23.8cqw)'}
 style:bottom={position==='bottom-right'?presentation?'8px':'calc(50% - 23.8cqw)':undefined}>
 <slot/>
</div>
<style>
 .top-action-toolbar{transform:scale(var(--builder-action-scale));transform-origin:top left;}
 .export-action-toolbar{transform:scale(var(--builder-action-scale));transform-origin:top right;}
 .bottom-action-toolbar{transform:scale(var(--builder-action-scale));transform-origin:bottom right;}
 @container(max-width:900px){.top-action-toolbar,.export-action-toolbar,.bottom-action-toolbar{transform:scale(.72);}}
 @container(min-width:901px) and (max-width:1080px){.top-action-toolbar,.export-action-toolbar,.bottom-action-toolbar{transform:scale(.82);}}
</style>
'''
write(Path('components/play-builder/BuilderActionBar.svelte'),bar)
imp('BuilderActionBar','components/play-builder/BuilderActionBar.svelte')
# Find balanced divs so slot contents don't change.
def replace_div_at(start,opening):
 global s
 endopen=s.index('>',start)+1
 depth=1;end=None
 for m in re.finditer(r'<div\b[^>]*>|</div>',s[endopen:],re.S):
  depth+=-1 if m.group().startswith('</') else 1
  if depth==0: end=endopen+m.start();break
 assert end is not None
 s=s[:start]+opening+s[endopen:end]+'</BuilderActionBar>'+s[end+6:]
patterns=[('class="top-action-toolbar', '<BuilderActionBar position="top-left" label="Play actions" role="toolbar">'),('data-tutorial="export-buttons"\n\t\t\t\tclass="export-action-toolbar','<BuilderActionBar position="top-right" label="Export controls" tutorial="export-buttons">'),('class="bottom-action-toolbar absolute right-2 z-20 flex items-end gap-1.5"\n','<BuilderActionBar position="bottom-right" label="Field controls" {presentation}>'),('class="bottom-action-toolbar absolute right-2 z-20 flex items-end gap-1.5" class:hidden','<BuilderActionBar position="bottom-right" label="Shared playback controls" {presentation} hidden={presentation&&animationOpen}>')]
for needle,opening in patterns:
 idx=s.index(needle);start=s.rfind('<div',0,idx);replace_div_at(start,opening)
# These selectors reach shared action bars; sizing is now owned by the component.
css=s.index('<style>')
head,styles=s[:css],s[css:]
for cls in ['top-action-toolbar','export-action-toolbar','bottom-action-toolbar']:
 # Remove standalone CSS rules moved above; preserve context-dependent presentation selectors.
 styles=re.sub(r'(?m)^\s*\.'+cls+r'\s*\{[^}]*\}', '',styles)
 styles=styles.replace('.'+cls,':global(.'+cls+')')
s=head+styles

host.write_text(s,encoding='utf-8')
