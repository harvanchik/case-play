import type { Point } from './play-builder-annotations';

export type DrawingShape = 'straight' | 'squiggle';

/** A shared, color-aware drawing cursor; the hotspot stays on its drawing tip. */
export function crayonCursor(color: string) {
	const fill=color.replace(/[<>&"]/g,'');
	const tips='M4 28 7 18 14 25ZM22 4 25 1 31 7 28 10Z';
	const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g stroke="#292524" stroke-width="1.3" stroke-linejoin="round"><path d="${tips}" fill="${fill}"/><path d="${tips}" fill="white" fill-opacity=".55"/><path d="M7 18 22 4 28 10 14 25Z" fill="${fill}"/><path d="m10 16 6 6M20 6l6 6" fill="none" stroke="white" stroke-opacity=".6"/></g></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 28, crosshair`;
}
/** Sampling and completion rules shared by authored drawings on every sport surface. */
export function createDrawingController(minimumStraightLength: number, sampleDistance = 1.5) {
	return {
		move(points: Point[], point: Point, shape: DrawingShape): Point[] {
			if (!points.length) return [point];
			if (shape === 'straight') return Math.hypot(point.x - points[0].x, point.y - points[0].y) >= minimumStraightLength ? [points[0], point] : points;
			const last = points.at(-1)!;
			return Math.hypot(point.x - last.x, point.y - last.y) >= sampleDistance ? [...points, point] : points;
		},
		finish(points: Point[], eventPoint: Point, shape: DrawingShape): Point[] | null {
			if (!points.length) return null;
			// Pen drivers may report stale coordinates on tip-up: retain the last straight sample.
			const final = shape === 'straight' && points.length > 1 ? points.at(-1)! : eventPoint;
			if (shape === 'straight' && Math.hypot(final.x - points[0].x, final.y - points[0].y) < minimumStraightLength) return null;
			return shape === 'straight' ? [points[0], final] : this.move(points, final, shape);
		}
	};
}
