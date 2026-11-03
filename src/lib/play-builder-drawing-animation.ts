import type { FreeStroke, Point } from './play-builder-scene';
import type { Motion, PlayAnimation } from './play-builder-animation';
export type DrawingAnimation = {
	id: number;
	stepId: string;
	mode: 'draw' | 'instant' | 'linear' | 'jump';
	start: number;
	end: number;
	easing: Motion['easing'];
	speed?: number;
 jumpEffect?: 'cut'|'fade';
 jumpDuration?: number;
};
export const defaultDrawingAnimation = (id: number, stepId: string): DrawingAnimation => ({
	id,
	stepId,
	mode: 'draw',
	start: 0.5,
	end: 1,
	easing: 'linear',
	speed: 1
});
const ease = (t: number, kind: Motion['easing']) =>
	kind === 'in' ? t * t : kind === 'out' ? 1 - (1 - t) ** 2 : kind === 'in-out' ? (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2) : t;
export function revealDrawing(points: Point[], fraction: number): Point[] {
	if (fraction >= 1) return points;
	if (fraction <= 0 || !points.length) return [];
	let total = 0;
	for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
	let remaining = total * fraction;
	const result = [points[0]];
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1],
			b = points[i],
			length = Math.hypot(b.x - a.x, b.y - a.y);
		if (remaining >= length) {
			result.push(b);
			remaining -= length;
		} else {
			const t = length ? remaining / length : 0;
			result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
			break;
		}
	}
	return result;
}
export function evaluateDrawings(strokes: FreeStroke[], animation: PlayAnimation, index: number, progress: number): FreeStroke[] {
	const from = animation.steps[index],
		to = animation.steps[index + 1];
	const beforeIds = from.strokeIds ? new Set(from.strokeIds) : null,
		afterIds = to.strokeIds ? new Set(to.strokeIds) : null;
	const tracks = new Map(animation.drawings?.filter((item) => item.stepId === to.id).map((item) => [item.id, item]));
	return strokes.flatMap((stroke) => {
		const before = beforeIds?.has(stroke.id) ?? true,
			after = afterIds?.has(stroke.id) ?? true;
		if (!after) return [];
		const authored = tracks.get(stroke.id);
		const source = from.strokeOffsets?.find(item=>item.id===stroke.id) ?? {x:0,y:0};
        const destination = to.strokeOffsets?.find(item=>item.id===stroke.id) ?? {x:0,y:0};
        const timing = authored ?? {start:0,end:1,easing:'linear',speed:1};
        const arrivalTime = Math.min(1,timing.start+(timing.end-timing.start)/(timing.speed??1));
        const jumpElapsed=(progress-timing.start)*animation.transitions[index].duration;
        const jumpLength=Math.min(authored?.jumpDuration??.25,(1-timing.start)*animation.transitions[index].duration);
        const fading=authored?.mode==='jump'&&authored.jumpEffect==='fade';
        const movement = (authored?.mode==='jump'||before&&authored?.mode==='instant') ? (jumpElapsed>=(fading?jumpLength/2:0)?1:0) : ease(Math.max(0,Math.min(1,(progress-timing.start)/(arrivalTime-timing.start))),timing.easing);
        const offset = before ? {x:source.x+(destination.x-source.x)*movement,y:source.y+(destination.y-source.y)*movement} : destination;
        const palette:Record<string,string>={red:'#ff1744',orange:'#ff6d00',yellow:'#ffea00',green:'#00ff66',cyan:'#00e5ff',blue:'#2979ff',purple:'#d500f9',white:'#ffffff',gray:'#9ca3af',black:'#000000'};
        const fromColor=palette[('color' in source?source.color:undefined)??stroke.color],toColor=palette[('color' in destination?destination.color:undefined)??stroke.color];
        const colorProgress=authored?.mode==='jump'||authored?.mode==='instant'?movement:movement;
        const channels=[1,3,5].map(index=>Math.round(parseInt(fromColor.slice(index,index+2),16)*(1-colorProgress)+parseInt(toColor.slice(index,index+2),16)*colorProgress));
        stroke = {...stroke,animationOpacity:fading&&jumpElapsed>=0&&jumpElapsed<jumpLength?Math.abs(2*jumpElapsed/jumpLength-1):1,animationColor:`rgb(${channels.join(', ')})`,points:stroke.points.map(point=>({x:point.x+offset.x,y:point.y+offset.y}))};
        if (before) return [stroke];
		const motion = authored ?? defaultDrawingAnimation(stroke.id, to.id);
		if (progress >= 1) return [stroke];
		if (progress < motion.start) return [];
		const arrival = Math.min(1, motion.start + (motion.end - motion.start) / (motion.speed ?? 1));
		const fraction =
			motion.mode === 'instant' ? 1 : ease(Math.max(0, Math.min(1, (progress - motion.start) / (arrival - motion.start))), motion.easing);
		const points = revealDrawing(stroke.points, fraction);
		return points.length ? [{ ...stroke, points }] : [];
	});
}
