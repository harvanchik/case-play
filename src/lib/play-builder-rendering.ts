import type { GuideColor, GuideStyle, Point } from '$lib/play-builder-scene';

export const PLAY_BUILDER_GUIDE_COLORS: Record<GuideColor, string> = {
	red: '#ef4444',
	orange: '#f97316',
	gold: '#d4a017',
	yellow: '#facc15',
	green: '#4ade80',
	cyan: '#22d3ee',
	blue: '#2563eb',
	purple: '#c084fc',
	white: '#ffffff',
	gray: '#9ca3af',
	black: '#000000',
	pink: '#f06292'
};

export const playBuilderGuideColor = (color: GuideColor) => PLAY_BUILDER_GUIDE_COLORS[color] ?? PLAY_BUILDER_GUIDE_COLORS.yellow;

export const playBuilderGuideDash = (style: GuideStyle) => (style === 'dashed' ? '16 10' : style === 'dotted' ? '0.01 12' : undefined);

const squaredDistanceToSegment = (point: Point, start: Point, end: Point) => {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	if (dx === 0 && dy === 0) return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
	const projected = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
	const nearestX = start.x + dx * projected;
	const nearestY = start.y + dy * projected;
	return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
};

// Pointer events capture a lot of nearly identical hand movement. First retain
// only meaningful direction changes, then round those turns into a clean route.
export const playBuilderSimplifyPathPoints = (points: readonly Point[], tolerance = 7): Point[] => {
	if (points.length < 3) return points.map((point) => ({ ...point }));
	const retained = new Set<number>([0, points.length - 1]);
	const threshold = tolerance ** 2;
	const retainSignificantPoint = (startIndex: number, endIndex: number): void => {
		let farthestIndex = -1;
		let farthestDistance = threshold;
		for (let index = startIndex + 1; index < endIndex; index += 1) {
			const distance = squaredDistanceToSegment(points[index], points[startIndex], points[endIndex]);
			if (distance > farthestDistance) {
				farthestDistance = distance;
				farthestIndex = index;
			}
		}
		if (farthestIndex === -1) return;
		retained.add(farthestIndex);
		retainSignificantPoint(startIndex, farthestIndex);
		retainSignificantPoint(farthestIndex, endIndex);
	};
	retainSignificantPoint(0, points.length - 1);
	return [...retained].sort((left, right) => left - right).map((index) => ({ ...points[index] }));
};

export const playBuilderSmoothPathPoints = (points: readonly Point[], iterations = 2): Point[] => {
	if (points.length < 3) return points.map((point) => ({ ...point }));
	let smoothed = playBuilderSimplifyPathPoints(points);
	for (let pass = 0; pass < iterations; pass += 1) {
		const next: Point[] = [{ ...smoothed[0] }];
		for (let index = 0; index < smoothed.length - 1; index += 1) {
			const current = smoothed[index];
			const following = smoothed[index + 1];
			next.push(
				{ x: current.x * 0.75 + following.x * 0.25, y: current.y * 0.75 + following.y * 0.25 },
				{ x: current.x * 0.25 + following.x * 0.75, y: current.y * 0.25 + following.y * 0.75 }
			);
		}
		next.push({ ...smoothed.at(-1)! });
		smoothed = next;
	}
	return smoothed;
};

export const playBuilderSmoothedPath = (points: readonly Point[]) => {
	const smoothed = playBuilderSmoothPathPoints(points);
	if (smoothed.length === 0) return '';
	if (smoothed.length === 1) return `M ${smoothed[0].x} ${smoothed[0].y}`;
	let data = `M ${smoothed[0].x} ${smoothed[0].y}`;
	for (let index = 0; index < smoothed.length - 1; index += 1) {
		const previous = smoothed[Math.max(0, index - 1)];
		const current = smoothed[index];
		const next = smoothed[index + 1];
		const following = smoothed[Math.min(smoothed.length - 1, index + 2)];
		const controlOne = {
			x: current.x + (next.x - previous.x) / 6,
			y: current.y + (next.y - previous.y) / 6
		};
		const controlTwo = {
			x: next.x - (following.x - current.x) / 6,
			y: next.y - (following.y - current.y) / 6
		};
		data += ` C ${controlOne.x} ${controlOne.y} ${controlTwo.x} ${controlTwo.y} ${next.x} ${next.y}`;
	}
	return data;
};

export const playBuilderAirborneLift = (kind: 'pass' | 'kick', start: Point, end: Point, fieldTop: number) => {
	const distance = Math.hypot(end.x - start.x, end.y - start.y);
	const desiredLift = kind === 'kick' ? Math.max(46, Math.min(160, distance * 0.52)) : Math.max(20, Math.min(58, distance * 0.18));
	const midpointY = (start.y + end.y) / 2;
	return Math.max(12, Math.min(desiredLift, midpointY - fieldTop - 18));
};

export const playBuilderAirbornePoint = (kind: 'pass' | 'kick', start: Point, end: Point, t: number, fieldTop: number): Point => {
	const inverse = 1 - t;
	const control = {
		x: (start.x + end.x) / 2,
		y: (start.y + end.y) / 2 - playBuilderAirborneLift(kind, start, end, fieldTop) * 2
	};
	return {
		x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
		y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
	};
};

export type PlayBuilderAirborneSegment = { d: string; width: number; linecap: 'round' | 'butt' };

export const playBuilderAirborneSegments = (
	kind: 'pass' | 'kick',
	start: Point,
	end: Point,
	style: GuideStyle,
	fieldTop: number,
	strokeWidth = 5
): PlayBuilderAirborneSegment[] => {
	const segmentCount = 64;
	const segments: PlayBuilderAirborneSegment[] = [];
	for (let index = 0; index < segmentCount; index += 1) {
		const t1 = index / segmentCount;
		const t2 = (index + 1) / segmentCount;
		const midpoint = (t1 + t2) / 2;
		const visible =
			style === 'solid' ||
			(style === 'dashed' && (index % 5 < 3 || index >= segmentCount - 2)) ||
			(style === 'dotted' && (index % 4 === 0 || index === segmentCount - 1));
		if (!visible) continue;
		const startPoint = playBuilderAirbornePoint(kind, start, end, t1, fieldTop);
		const endPoint = playBuilderAirbornePoint(kind, start, end, t2, fieldTop);
		const altitude = Math.sin(Math.PI * midpoint);
		const groundWidth = strokeWidth * 0.68;
		const peakBoost = strokeWidth * (kind === 'kick' ? 1 : 0.45);
		segments.push({
			d: `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`,
			width: groundWidth + peakBoost * altitude,
			linecap: style === 'solid' ? 'round' : style === 'dotted' ? 'round' : 'butt'
		});
	}
	return segments;
};
