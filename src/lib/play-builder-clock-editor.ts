type Options={enabled:boolean;onchange:(open:boolean)=>void};
const regions=new Set<{dismiss:()=>void}>();
export function dismissClockEditors(){for(const region of regions)region.dismiss();}
/** One shared hover/focus region, including the bridge to its clock run button. */
export function clockEditorRegion(node:SVGGElement,initial:Options){
 let options=initial,hovered=false,focused=false,suppressed=false,open=false;
 node.setAttribute('data-clock-editor-region','');
 const publish=()=>{const next=options.enabled&&!suppressed&&(hovered||focused);if(next!==open){open=next;options.onchange(open);}};
 const region={dismiss(){suppressed=true;hovered=false;focused=false;if(node.contains(document.activeElement))(document.activeElement as HTMLElement)?.blur?.();publish();}};
 const enter=()=>{for(const other of regions)if(other!==region)other.dismiss();hovered=true;suppressed=false;publish();};
 const leave=()=>{hovered=false;publish();};
 const focus=()=>{focused=true;suppressed=false;publish();};
 const blur=(event:FocusEvent)=>{focused=node.contains(event.relatedTarget as Node);publish();};
 regions.add(region);node.addEventListener('pointerenter',enter);node.addEventListener('pointerleave',leave);node.addEventListener('focusin',focus);node.addEventListener('focusout',blur);
 return {update(next:Options){options=next;publish();},destroy(){regions.delete(region);node.removeEventListener('pointerenter',enter);node.removeEventListener('pointerleave',leave);node.removeEventListener('focusin',focus);node.removeEventListener('focusout',blur);options.onchange(false);}};
}
