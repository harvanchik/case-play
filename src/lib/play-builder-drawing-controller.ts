import type { Point } from './play-builder-annotations';

export type DrawingShape = 'straight' | 'squiggle';
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
