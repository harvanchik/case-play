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
