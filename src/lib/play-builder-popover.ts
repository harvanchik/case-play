type InkPoint={x:number;y:number;r:number};
type Anchor = { ink:InkPoint[]|null; crossField: boolean; x: number; y: number; element: DOMRect | null; field: DOMRect | null; time: number };
/** Sample visible arrow ink, excluding broad hit targets and the faint ground shadow. */
function arrowInk(element:Element|null|undefined):InkPoint[]|null {
 if(element?.getAttribute('data-layer-type')!=='path'&&element?.getAttribute('data-animation-ghost-type')!=='path')return null;
 const points:InkPoint[]=[];
 for(const shape of element.querySelectorAll<SVGGeometryElement>('path,line,polyline,polygon')){
  const style=getComputedStyle(shape);const stroke=style.stroke;
  if(stroke==='none'||stroke==='transparent'||stroke==='rgba(0, 0, 0, 0)'||Number(style.opacity)<.3)continue;
  const matrix=shape.getScreenCTM();if(!matrix)continue;
  const scale=Math.hypot(matrix.a,matrix.b),width=parseFloat(style.strokeWidth)||0;
  try{
   const length=shape.getTotalLength();
   const add=(distance:number,r:number)=>{const point=shape.getPointAtLength(distance);const screen=new DOMPoint(point.x,point.y).matrixTransform(matrix);points.push({x:screen.x,y:screen.y,r});};
   if(width>=.1){const count=Math.max(1,Math.min(512,Math.ceil(length*scale/4)));for(let i=0;i<=count;i++)add(length*i/count,width*scale/2);}
   if(style.markerEnd&&style.markerEnd!=='none')add(length,22.5*scale);
  }catch{/* A detached or empty SVG geometry has no ink to avoid. */}
 }
 return points.length?points:null;
}
let pendingAnchor: Anchor | null = null;
/** Record complete element bounds; pointer coordinates are only a fallback for non-element menus. */
export function rememberPopoverAnchor(event: Event, element?: Element | null) {
	const pointer = event as MouseEvent;
	const bounds = element?.getBoundingClientRect() ?? null;
	const crossField = ['line-of-scrimmage', 'line-to-gain'].includes(element?.getAttribute('data-tutorial-kind') ?? '');
	pendingAnchor = { ink:arrowInk(element),
		crossField,
		x: bounds ? bounds.left + bounds.width / 2 : Number.isFinite(pointer.clientX) ? pointer.clientX : 0,
		y:
			crossField && Number.isFinite(pointer.clientY)
				? pointer.clientY
				: bounds
					? bounds.top + bounds.height / 2
					: Number.isFinite(pointer.clientY)
						? pointer.clientY
						: 0,
		element: bounds,
		field:
			(document.querySelector('[data-popover-field-bounds]') ?? document.querySelector('svg[role="application"]'))?.getBoundingClientRect() ?? null,
		time: performance.now()
	};
}
function initialPlacement(anchor: Anchor, width: number, height: number) {
	const field = anchor.field;
	const left = Math.max(4, field?.left ?? 4),
		top = Math.max(4, field?.top ?? 4),
		right = Math.min(innerWidth - 4, field?.right ?? innerWidth - 4),
		bottom = Math.min(innerHeight - 4, field?.bottom ?? innerHeight - 4);
	const object = anchor.element;
	const gap = 12;
	const sides = [
		{ x: object ? object.right + gap : anchor.x + gap, y: anchor.y - height / 2 },
		{ x: object ? object.left - width - gap : anchor.x - width - gap, y: anchor.y - height / 2 }
	];
	const centeredX=Math.max(left,Math.min(Math.max(left,right-width),anchor.x-width/2));
 const band=anchor.ink?.filter(point=>point.x+point.r+gap>=centeredX&&point.x-point.r-gap<=centeredX+width);
 const below=band?.length?Math.max(...band.map(point=>point.y+point.r))+gap:object?object.bottom+gap:anchor.y+gap;
 const above=band?.length?Math.min(...band.map(point=>point.y-point.r))-height-gap:object?object.top-height-gap:anchor.y-height-gap;
 const candidates = anchor.crossField
		? sides
		: [
				{ x: centeredX, y: below },
				{ x: centeredX, y: above },
				...sides
			];
	return candidates
		.map((point, index) => {
			const x = Math.max(left, Math.min(Math.max(left, right - width), point.x)),
				y = Math.max(top, Math.min(Math.max(top, bottom - height), point.y));
			const overlap = anchor.ink ? anchor.ink.reduce((sum,point)=>sum+Math.max(0,Math.min(x+width,point.x+point.r+gap)-Math.max(x,point.x-point.r-gap))*Math.max(0,Math.min(y+height,point.y+point.r+gap)-Math.max(y,point.y-point.r-gap)),0) : object
				? Math.max(0, Math.min(x + width, object.right) - Math.max(x, object.left)) *
					Math.max(0, Math.min(y + height, object.bottom) - Math.max(y, object.top))
				: 0;
			return { x, y, score: overlap * 1000000 + index * 10000 + Math.abs(x - point.x) + Math.abs(y - point.y) };
		})
		.sort((a, b) => a.score - b.score)[0];
}
/** Temporary viewport placement for compact editor popovers. Never persists coordinates. */
export function draggablePopover(node: HTMLElement) {
	const original = node.getBoundingClientRect();
	const anchor = pendingAnchor && performance.now() - pendingAnchor.time < 1000 ? pendingAnchor : null;
	pendingAnchor = null;
	const wrapper = document.createElement('div');
	wrapper.dataset.draggablePopover = '';
	Object.assign(wrapper.style, { position: 'fixed', zIndex: '1000000002', width: 'max-content', maxWidth: 'calc(100vw - 8px)', touchAction: 'none' });
	document.body.appendChild(wrapper);
	wrapper.appendChild(node);
	node.style.setProperty('position', 'static', 'important');
	node.style.setProperty('transform', 'none', 'important');
	node.style.setProperty('translate', 'none', 'important');
	node.style.setProperty('margin', '0', 'important');
	node.style.setProperty('max-width', 'calc(100vw - 8px)', 'important');
	const placed = anchor ? initialPlacement(anchor, wrapper.getBoundingClientRect().width, wrapper.getBoundingClientRect().height) : original;
	let x = placed.x,
		y = placed.y;
	let drag: { id: number; x: number; y: number; left: number; top: number } | null = null;
	const position = () => {
		const bounds = wrapper.getBoundingClientRect();
		x = Math.max(4, Math.min(Math.max(4, innerWidth - bounds.width - 4), x));
		y = Math.max(4, Math.min(Math.max(4, innerHeight - bounds.height - 4), y));
		wrapper.style.left = `${x}px`;
		wrapper.style.top = `${y}px`;
	};
	const down = (event: PointerEvent) => {
		if (
			event.button !== 0 ||
			(event.target as Element).closest(
				'button,input,textarea,select,a,[role="slider"],[role="option"],[contenteditable="true"],[data-no-popover-drag]'
			)
		)
			return;
		event.preventDefault();
		event.stopPropagation();
		drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: x, top: y };
		wrapper.setPointerCapture(event.pointerId);
	};
	const move = (event: PointerEvent) => {
		if (!drag || event.pointerId !== drag.id) return;
		event.preventDefault();
		event.stopPropagation();
		x = drag.left + event.clientX - drag.x;
		y = drag.top + event.clientY - drag.y;
		position();
	};
	const end = (event: PointerEvent) => {
		if (drag?.id !== event.pointerId) return;
		event.stopPropagation();
		drag = null;
		if (wrapper.hasPointerCapture(event.pointerId)) wrapper.releasePointerCapture(event.pointerId);
	};
	wrapper.addEventListener('pointerdown', down, true);
	wrapper.addEventListener('pointermove', move);
	wrapper.addEventListener('pointerup', end);
	wrapper.addEventListener('pointercancel', end);
	const resize = new ResizeObserver(position);
	resize.observe(node);
	window.addEventListener('resize', position);
	position();
	return {
		destroy() {
			resize.disconnect();
			window.removeEventListener('resize', position);
			wrapper.removeEventListener('pointerdown', down, true);
			wrapper.removeEventListener('pointermove', move);
			wrapper.removeEventListener('pointerup', end);
			wrapper.removeEventListener('pointercancel', end);
			wrapper.remove();
		}
	};
}
