import { PLAY_BUILDER_WATERMARK_TEXT, PLAY_BUILDER_WATERMARK_BASELINE, type playBuilderWatermarkGeometry } from './play-builder-watermark';

type Geometry=ReturnType<typeof playBuilderWatermarkGeometry>;
const restorers=new WeakMap<SVGSVGElement,()=>void>();

// Export from the authored mark, even if the live DOM was edited in the same task.
export function restorePlayBuilderWatermark(svg:SVGSVGElement){restorers.get(svg)?.();}

/** Repairs casual DOM deletion/hiding. This is not a security boundary against a browser owner. */
export function guardPlayBuilderWatermark(node:SVGGElement,geometry:Geometry){
 const svg=node.ownerSVGElement!,parent=node.parentNode!,anchor=node.nextSibling;
 const text=node.querySelector('text')!;
 const groupAttributes=Array.from(node.attributes,attribute=>[attribute.name,attribute.value] as const);
 const textClass=text.getAttribute('class');
 let destroyed=false;
 const observe=()=>observer.observe(svg,{subtree:true,childList:true,attributes:true,characterData:true});
 function attributes(element:Element,expected:Record<string,string>){
  for(const attribute of Array.from(element.attributes))if(!(attribute.name in expected))element.removeAttribute(attribute.name);
  for(const [name,value] of Object.entries(expected))if(element.getAttribute(name)!==value)element.setAttribute(name,value);
 }
 function restore(){
  if(destroyed)return;
  observer.disconnect();
  if(node.parentNode!==parent)parent.insertBefore(node,anchor?.parentNode===parent?anchor:null);
  attributes(node,Object.fromEntries(groupAttributes));
  if(node.children.length!==1||node.firstElementChild!==text)node.replaceChildren(text);
  attributes(text,{x:String(geometry.centerX),y:String(geometry.centerY),transform:`rotate(${geometry.angle} ${geometry.centerX} ${geometry.centerY})`,'text-anchor':'middle','dominant-baseline':PLAY_BUILDER_WATERMARK_BASELINE,fill:'#ffffff','fill-opacity':'0.1','font-size':String(geometry.fontSize),'font-weight':'900','letter-spacing':String(geometry.letterSpacing),...(textClass?{class:textClass}:{})});
  if(text.textContent!==PLAY_BUILDER_WATERMARK_TEXT)text.textContent=PLAY_BUILDER_WATERMARK_TEXT;
  observe();
 }
 const observer=new MutationObserver(records=>{
  if(records.some(record=>record.target===node||node.contains(record.target)||record.type==='childList'&&Array.from(record.removedNodes).some(removed=>removed===node||removed.contains(node))))restore();
 });
 restorers.set(svg,restore);restore();
 return {update(next:Geometry){geometry=next;restore();},destroy(){destroyed=true;observer.disconnect();if(restorers.get(svg)===restore)restorers.delete(svg);}};
}
