export type Point={x:number;y:number};
export type TrailPoint=Point & {createdAt:number};
export type LaserColor='red'|'green'|'blue'|'purple';
export type LaserDrawing={points:Point[];color:LaserColor|'rainbow';releasedAt:number|null;appearedAt?:number|null};
export type ActiveLaserDrawing={points:Point[];color:LaserColor|'rainbow'};
export type SpotlightStroke={points:Point[];radius:number;releasedAt:number|null};
export const laserFadeDuration=500;
	export const laserDrawingVisibility = (drawing: LaserDrawing, now: number) => {
		const fadeOut = drawing.releasedAt === null ? 1 : Math.min(1, Math.max(0, 1 - (now - drawing.releasedAt) / laserFadeDuration));
		const fadeIn = drawing.appearedAt == null ? 1 : Math.min(1, Math.max(0, (now - drawing.appearedAt) / laserFadeDuration));
		return Math.min(fadeOut, fadeIn);
	};
	export const laserDrawingFingerprint = (drawing: Pick<LaserDrawing, 'color' | 'points'>) =>
		`${drawing.color}:${drawing.points.map((point) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).join(';')}`;
	export const laserDrawingPath = (points: Point[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
	export const laserTrailPath = (points: (Point & { createdAt: number })[], now: number) => {
		if (points.length < 2) return '';
		const left: Point[] = [];
		const right: Point[] = [];
		for (let index = 0; index < points.length; index += 1) {
			const point = points[index];
			const previous = points[Math.max(0, index - 1)];
			const next = points[Math.min(points.length - 1, index + 1)];
			const dx = next.x - previous.x;
			const dy = next.y - previous.y;
			const length = Math.hypot(dx, dy) || 1;
			const freshness = Math.min(1, Math.max(0, 1 - (now - point.createdAt) / laserFadeDuration));
			const halfWidth = 0.08 + Math.pow(freshness, 0.72) * 2.1;
			const normalX = -dy / length;
			const normalY = dx / length;
			left.push({ x: point.x + normalX * halfWidth, y: point.y + normalY * halfWidth });
			right.push({ x: point.x - normalX * halfWidth, y: point.y - normalY * halfWidth });
		}
		const boundary = [...left, ...right.reverse()];
		const first = boundary[0];
		const last = boundary.at(-1)!;
		let path = `M ${(last.x + first.x) / 2} ${(last.y + first.y) / 2}`;
		for (let index = 0; index < boundary.length; index += 1) {
			const point = boundary[index];
			const next = boundary[(index + 1) % boundary.length];
			path += ` Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
		}
		return `${path} Z`;
	};
export type AnnotationState={
 laserTrailFrame:number | null;
 laserTrailClock:number;
 laserTrail:TrailPoint[];
 laserDrawings:LaserDrawing[];
 spotlightStrokes:SpotlightStroke[];
 laserPointer:Point | null;
 spotlightEnabled:boolean;
 spotlightRadius:number;
 activeSpotlightStroke:SpotlightStroke | null;
 activeLaserDrawing:ActiveLaserDrawing | null;
 laserDrawingPointerId:number | null;
 rainbowLaserEnabled:boolean;
 laserColor:LaserColor;
 presentation:boolean;
};
export interface AnnotationAdapter {
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
 let laserTrailFrame: number | null;
 let laserTrailClock: number;
 let laserTrail: TrailPoint[];
 let laserDrawings: LaserDrawing[];
 let spotlightStrokes: SpotlightStroke[];
 let laserPointer: Point | null;
 let spotlightEnabled: boolean;
 let spotlightRadius: number;
 let activeSpotlightStroke: SpotlightStroke | null;
 let activeLaserDrawing: ActiveLaserDrawing | null;
 let laserDrawingPointerId: number | null;
 let rainbowLaserEnabled: boolean;
 let laserColor: LaserColor;
 let presentation: boolean;
 function run<T>(operation:()=>T):T{ ({laserTrailFrame, laserTrailClock, laserTrail, laserDrawings, spotlightStrokes, laserPointer, spotlightEnabled, spotlightRadius, activeSpotlightStroke, activeLaserDrawing, laserDrawingPointerId, rainbowLaserEnabled, laserColor, presentation}=adapter.read()); try{return operation();}finally{adapter.write({laserTrailFrame, laserTrailClock, laserTrail, laserDrawings, spotlightStrokes, laserPointer, spotlightEnabled, spotlightRadius, activeSpotlightStroke, activeLaserDrawing, laserDrawingPointerId, rainbowLaserEnabled, laserColor, presentation});} }
	const startLaserAnimationFrame = () => {
		if (laserTrailFrame === null) laserTrailFrame = adapter.clock.request(() => run(refreshLaserTrail));
	};
	const refreshLaserTrail = () => {
		const now = adapter.clock.now();
		laserTrailClock = now;
		laserTrail = laserTrail.filter((point) => now - point.createdAt < laserFadeDuration);
		laserDrawings = laserDrawings
			.filter((drawing) => drawing.releasedAt === null || now - drawing.releasedAt < laserFadeDuration)
			.map((drawing) => (drawing.appearedAt != null && now - drawing.appearedAt >= laserFadeDuration ? { ...drawing, appearedAt: null } : drawing));
		spotlightStrokes=spotlightStrokes.filter(stroke=>stroke.releasedAt===null||now-stroke.releasedAt<laserFadeDuration);
  const hasAnimatingSpotlight=spotlightStrokes.some(stroke=>stroke.releasedAt!==null);
  const hasAnimatingDrawing = laserDrawings.some((drawing) => drawing.releasedAt !== null || drawing.appearedAt != null);
		laserTrailFrame = laserTrail.length || hasAnimatingDrawing || hasAnimatingSpotlight ? adapter.clock.request(() => run(refreshLaserTrail)) : null;
	};
	const updateLaserPointer = (point: Point) => {
		const now = adapter.clock.now();
		const lastPoint = laserTrail.at(-1);
		laserPointer = point;
		if (!spotlightEnabled && (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) >= 1.25)) {
			laserTrail = [...laserTrail.slice(-47), { ...point, createdAt: now }];
		}
		laserTrailClock = now;
		adapter.promoteLayer();
		startLaserAnimationFrame();
	};
	const beginLaserDrawing = (event: PointerEvent, point: Point) => {
		updateLaserPointer(point);
  if(spotlightEnabled){activeSpotlightStroke={points:[point],radius:spotlightRadius,releasedAt:null};laserDrawingPointerId=event.pointerId;adapter.capture(event.pointerId);return;}
		activeLaserDrawing = { points: [point], color: rainbowLaserEnabled ? 'rainbow' : laserColor };
		laserDrawingPointerId = event.pointerId;
		adapter.capture(event.pointerId);
	};
	const continueLaserDrawing = (event: PointerEvent, point: Point) => {
  if(laserDrawingPointerId===event.pointerId&&activeSpotlightStroke){
   const last=activeSpotlightStroke.points.at(-1)!;
   if(Math.hypot(point.x-last.x,point.y-last.y)>=1.25)activeSpotlightStroke={...activeSpotlightStroke,points:[...activeSpotlightStroke.points,point]};
   return;
  }
		if (laserDrawingPointerId !== event.pointerId || !activeLaserDrawing) return;
		const lastPoint = activeLaserDrawing.points.at(-1)!;
		if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 1.25) return;
		activeLaserDrawing = { ...activeLaserDrawing, points: [...activeLaserDrawing.points, point] };
	};
	const finishLaserDrawing = () => {
  if(activeSpotlightStroke){adapter.checkpoint('spotlight');spotlightStrokes=[...spotlightStrokes,activeSpotlightStroke];activeSpotlightStroke=null;}
		if (activeLaserDrawing && activeLaserDrawing.points.length > 1) {
			if(!presentation)adapter.checkpoint('laser');
			laserDrawings = [...laserDrawings, { ...activeLaserDrawing, releasedAt: null, appearedAt: null }];
		}
		activeLaserDrawing = null;
		laserDrawingPointerId = null;
	};
	const releaseLaserDrawings = () => {
  const spotlightNow=adapter.clock.now();
  if(activeSpotlightStroke){spotlightStrokes=[...spotlightStrokes,activeSpotlightStroke];activeSpotlightStroke=null;}
  if(spotlightStrokes.length){spotlightStrokes=spotlightStrokes.map(stroke=>({...stroke,releasedAt:stroke.releasedAt??spotlightNow}));startLaserAnimationFrame();}
		if (laserDrawingPointerId !== null) adapter.release(laserDrawingPointerId);
		const drawings =
			activeLaserDrawing && activeLaserDrawing.points.length > 1
				? [...laserDrawings, { ...activeLaserDrawing, releasedAt: null, appearedAt: null }]
				: laserDrawings;
		activeLaserDrawing = null;
		laserDrawingPointerId = null;
		laserPointer = null;
		if (drawings.length === 0) return;
		const now = adapter.clock.now();
		laserTrailClock = now;
		laserDrawings = drawings.map((drawing) => {
			const visibility = laserDrawingVisibility(drawing, now);
			return {
				...drawing,
				appearedAt: null,
				releasedAt: now - (1 - visibility) * laserFadeDuration
			};
		});
		startLaserAnimationFrame();
	};
	const fadeLaserDrawings = () => {
		if(spotlightStrokes.some(stroke=>stroke.releasedAt===null)||activeSpotlightStroke)adapter.checkpoint('spotlight');
  else if (laserDrawings.length > 0&&!presentation) adapter.checkpoint('laser');
		releaseLaserDrawings();
	};
return {
 startLaserAnimationFrame:(...args:Parameters<typeof startLaserAnimationFrame>)=>run(()=>startLaserAnimationFrame(...args)),
 updateLaserPointer:(...args:Parameters<typeof updateLaserPointer>)=>run(()=>updateLaserPointer(...args)),
 beginLaserDrawing:(...args:Parameters<typeof beginLaserDrawing>)=>run(()=>beginLaserDrawing(...args)),
 continueLaserDrawing:(...args:Parameters<typeof continueLaserDrawing>)=>run(()=>continueLaserDrawing(...args)),
 finishLaserDrawing:(...args:Parameters<typeof finishLaserDrawing>)=>run(()=>finishLaserDrawing(...args)),
 releaseLaserDrawings:(...args:Parameters<typeof releaseLaserDrawings>)=>run(()=>releaseLaserDrawings(...args)),
 fadeLaserDrawings:(...args:Parameters<typeof fadeLaserDrawings>)=>run(()=>fadeLaserDrawings(...args)),
 dispose:()=>run(()=>{if(laserTrailFrame!==null)adapter.clock.cancel(laserTrailFrame);laserTrailFrame=null;})
};
}
