import {
	defaultPlayBuilderFieldSettings,
	formatPlayBuilderGameClock,
	type FieldGuide,
	type FieldMarker,
	type FieldPath,
	type GuideColor,
	type GuideStyle,
	type PlayBuilderDocument,
	type PlayBuilderFieldColor,
	type PlayBuilderFieldSettings,
	type PlayBuilderFieldType,
	type PlayBuilderScene,
	type Point
} from '$lib/play-builder-scene';
import beanBagBlackImage from './social-assets/bean-bag-black.png?inline';
import beanBagBlueImage from './social-assets/bean-bag-blue.png?inline';
import beanBagPinkImage from './social-assets/bean-bag-pink.png?inline';
import beanBagWhiteImage from './social-assets/bean-bag-white.png?inline';
import flagBeltBlueImage from './social-assets/flag-belt-blue.png?inline';
import flagBeltCyanImage from './social-assets/flag-belt-cyan.png?inline';
import flagBeltGreenImage from './social-assets/flag-belt-green.png?inline';
import flagBeltOrangeImage from './social-assets/flag-belt-orange.png?inline';
import flagBeltPurpleImage from './social-assets/flag-belt-purple.png?inline';
import flagBeltRedImage from './social-assets/flag-belt.png?inline';
import flagBeltYellowImage from './social-assets/flag-belt-yellow.png?inline';
import footballImage from './social-assets/football.png?inline';
import officialBackJudgeImage from './social-assets/official-back-judge.png?inline';
import officialFieldJudgeImage from './social-assets/official-field-judge.png?inline';
import officialLineJudgeImage from './social-assets/official-line-judge.png?inline';
import officialRefereeImage from './social-assets/official-referee.png?inline';
import penaltyFlagImage from './social-assets/penalty-flag.png?inline';
import dokdoFontDataUrl from './fonts/dokdo-latin.ttf?inline';
import interBlackFontDataUrl from './fonts/inter-black-latin.ttf?inline';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let socialImageDokdoFontPath: string | undefined;
let socialImageInterFontPath: string | undefined;
const getSocialImageDokdoFontPath = () => {
	if (socialImageDokdoFontPath) return socialImageDokdoFontPath;
	socialImageDokdoFontPath = join(tmpdir(), 'caseplay-dokdo.ttf');
	writeFileSync(socialImageDokdoFontPath, Buffer.from(dokdoFontDataUrl.slice(dokdoFontDataUrl.indexOf(',') + 1), 'base64'));
	return socialImageDokdoFontPath;
};
const getSocialImageInterFontPath = () => {
	if (socialImageInterFontPath) return socialImageInterFontPath;
	socialImageInterFontPath = join(tmpdir(), 'caseplay-inter-black.ttf');
	writeFileSync(socialImageInterFontPath, Buffer.from(interBlackFontDataUrl.slice(interBlackFontDataUrl.indexOf(',') + 1), 'base64'));
	return socialImageInterFontPath;
};

export const playBuilderSocialRenderOptions = () => ({
	fitTo: { mode: 'width' as const, value: 1200 },
	font: {
		fontFiles: [getSocialImageDokdoFontPath(), getSocialImageInterFontPath()],
		loadSystemFonts: false,
		defaultFontFamily: 'Inter',
		sansSerifFamily: 'Inter'
	}
});

type FieldLayout = {
	totalYards: number;
	widthYards: number;
	goalLines: number[];
	zoneLines: number[];
	shadedZones: [number, number][];
	hashLines: number[];
	hashYFractions: number[];
	threeYardMarkers: number[];
	tenYardMarkers: number[];
	tenYardXs: number[];
	fourteenYardXs: number[];
	thirtyYardMarkers: number[];
	noRunLines: number[];
	noRunZones: [number, number][];
	yardLabels: { x: number; label: string }[];
	goalLabelYards: number[];
	endZoneCenters: number[];
	teamBox: [number, number] | null;
	teamBoxSetbackYards: number;
	endZonePylonYards: number[];
};

const fieldLayouts: Record<PlayBuilderFieldType, FieldLayout> = {
	traditional: {
		totalYards: 100,
		widthYards: 40,
		goalLines: [10, 90],
		zoneLines: [10, 30, 50, 70, 90],
		shadedZones: [
			[30, 50],
			[70, 90]
		],
		hashLines: [30, 50, 70],
		hashYFractions: [15 / 40, 25 / 40],
		threeYardMarkers: [13, 87],
		tenYardMarkers: [20, 80],
		tenYardXs: [],
		fourteenYardXs: [24, 76],
		thirtyYardMarkers: [40, 60],
		noRunLines: [],
		noRunZones: [],
		yardLabels: [
			{ x: 30, label: '20' },
			{ x: 50, label: '40' },
			{ x: 70, label: '20' }
		],
		goalLabelYards: [12, 88],
		endZoneCenters: [5, 95],
		teamBox: [30, 70],
		teamBoxSetbackYards: 1.5,
		endZonePylonYards: [0, 10, 90, 100]
	},
	'four-v-four': {
		totalYards: 60,
		widthYards: 30,
		goalLines: [10, 50],
		zoneLines: [10, 30, 50],
		shadedZones: [],
		hashLines: [30],
		hashYFractions: [0.5],
		threeYardMarkers: [13, 47],
		tenYardMarkers: [],
		tenYardXs: [20, 40],
		fourteenYardXs: [],
		thirtyYardMarkers: [],
		noRunLines: [],
		noRunZones: [],
		yardLabels: [{ x: 30, label: '20' }],
		goalLabelYards: [],
		endZoneCenters: [5, 55],
		teamBox: [13, 47],
		teamBoxSetbackYards: 1,
		endZonePylonYards: [0, 10, 50, 60]
	},
	unified: {
		totalYards: 60,
		widthYards: 25,
		goalLines: [10, 50],
		zoneLines: [10, 30, 50],
		shadedZones: [],
		hashLines: [],
		hashYFractions: [],
		threeYardMarkers: [],
		tenYardMarkers: [],
		tenYardXs: [],
		fourteenYardXs: [15, 45],
		thirtyYardMarkers: [],
		noRunLines: [15, 25, 35, 45],
		noRunZones: [
			[10, 15],
			[25, 30],
			[30, 35],
			[45, 50]
		],
		yardLabels: [],
		goalLabelYards: [],
		endZoneCenters: [5, 55],
		teamBox: [15, 45],
		teamBoxSetbackYards: 1,
		endZonePylonYards: [0, 10, 50, 60]
	}
};

const fieldPalettes: Record<PlayBuilderFieldColor, { field: string; endZone: string }> = {
	green: { field: '#356f49', endZone: '#244f38' },
	red: { field: '#914747', endZone: '#6d3232' },
	navy: { field: '#294967', endZone: '#1b334b' },
	'light-blue': { field: '#5997b8', endZone: '#3f7797' },
	orange: { field: '#b96a36', endZone: '#8b4d27' },
	purple: { field: '#73538f', endZone: '#543a6c' }
};

const colors: Record<GuideColor, string> = {
	orange: '#f97316',
	gold: '#d4a017',
	yellow: '#facc15',
	red: '#ef4444',
	cyan: '#22d3ee',
	blue: '#2563eb',
	green: '#22c55e',
	purple: '#c026d3',
	black: '#171717',
	white: '#ffffff',
	gray: '#9ca3af',
	pink: '#f06292'
};

const officialMarkerImages = {
	'official-r': officialRefereeImage,
	'official-l': officialLineJudgeImage,
	'official-b': officialBackJudgeImage,
	'official-f': officialFieldJudgeImage
} as const;
const flagBeltImages: Partial<Record<GuideColor, string>> = {
	red: flagBeltRedImage,
	orange: flagBeltOrangeImage,
	yellow: flagBeltYellowImage,
	green: flagBeltGreenImage,
	cyan: flagBeltCyanImage,
	blue: flagBeltBlueImage,
	purple: flagBeltPurpleImage
};
const beanBagImages: Partial<Record<GuideColor, string>> = {
	blue: beanBagBlueImage,
	white: beanBagWhiteImage,
	black: beanBagBlackImage,
	pink: beanBagPinkImage
};

const escapeXml = (value: string) =>
	value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[character] ?? character);
const dashArray = (style: GuideStyle, compact = false) =>
	style === 'dashed' ? (compact ? '10 7' : '16 10') : style === 'dotted' ? (compact ? '2 7' : '2 10') : undefined;
const dashAttribute = (style: GuideStyle, compact = false) => {
	const value = dashArray(style, compact);
	return value ? ` stroke-dasharray="${value}"` : '';
};
const freehandPath = (points: Point[]) => {
	if (points.length === 0) return '';
	if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
	let data = `M ${points[0].x} ${points[0].y}`;
	for (let index = 1; index < points.length - 1; index += 1) {
		const point = points[index];
		const next = points[index + 1];
		data += ` Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
	}
	const last = points.at(-1)!;
	return `${data} L ${last.x} ${last.y}`;
};

const renderMarker = (marker: FieldMarker) => {
	const label = escapeXml(marker.label ?? '');
	const renderImageMarker = (asset: string, size: number) =>
		`<g><image href="${asset}" x="${marker.x - size / 2}" y="${marker.y - size / 2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>${label ? `<text x="${marker.x}" y="${marker.y + size / 2 + 9}" text-anchor="middle" fill="#fff" stroke="#111827" stroke-width="2" paint-order="stroke" font-size="8" font-weight="900">${label}</text>` : ''}</g>`;
	if (marker.kind === 'team-a' || marker.kind === 'team-k' || marker.kind === 'team-b' || marker.kind === 'team-r') {
		const dark = marker.kind === 'team-a' || marker.kind === 'team-k';
		return `<g><circle cx="${marker.x}" cy="${marker.y}" r="14" fill="${dark ? '#1c1917' : '#ffffff'}" stroke="${dark ? '#ffffff' : '#1c1917'}" stroke-width="2.6"/><text x="${marker.x}" y="${marker.y + 4}" text-anchor="middle" fill="${dark ? '#ffffff' : '#1c1917'}" font-size="9" font-weight="900">${label}</text></g>`;
	}
	if (marker.kind.startsWith('official-')) {
		return renderImageMarker(officialMarkerImages[marker.kind as keyof typeof officialMarkerImages], 46.28);
	}
	if (marker.kind === 'ball') {
		return renderImageMarker(footballImage, 30);
	}
	if (marker.kind === 'event') {
		const width = Math.max(47, Math.min(154, (marker.label?.length ?? 5) * 6.6 + 16));
		return `<g><rect x="${marker.x - width / 2}" y="${marker.y - 10.5}" width="${width}" height="21" fill="#fff" stroke="#1c1917" stroke-width="2"/><text x="${marker.x}" y="${marker.y + 3.5}" text-anchor="middle" fill="#1c1917" font-size="8.5" font-weight="900">${label || 'EVENT'}</text></g>`;
	}
	if (marker.kind === 'flag') {
		return renderImageMarker(penaltyFlagImage, 31.5);
	}
	if (marker.kind === 'bean-bag') {
		return renderImageMarker(beanBagImages[marker.color ?? 'blue'] ?? beanBagBlueImage, 31.5);
	}
	return renderImageMarker(flagBeltImages[marker.color ?? 'red'] ?? flagBeltRedImage, 33.75);
};

const airborneLift = (kind: 'pass' | 'kick', start: Point, end: Point, fieldTop: number) => {
	const distance = Math.hypot(end.x - start.x, end.y - start.y);
	const desiredLift = kind === 'kick' ? Math.max(46, Math.min(160, distance * 0.52)) : Math.max(20, Math.min(58, distance * 0.18));
	return Math.max(12, Math.min(desiredLift, (start.y + end.y) / 2 - fieldTop - 18));
};

const renderPath = (path: FieldPath, scene: PlayBuilderScene, fieldTop: number) => {
	const attached = path.startMarkerId === undefined ? undefined : scene.markers.find((marker) => marker.id === path.startMarkerId);
	const start = attached ? { x: attached.x, y: attached.y } : path.start;
	const color = colors[path.color];
	if (path.kind === 'line') {
		return `<line x1="${start.x}" y1="${start.y}" x2="${path.end.x}" y2="${path.end.y}" stroke="${color}" stroke-width="7" stroke-linecap="${path.style === 'dotted' ? 'round' : 'square'}"${dashAttribute(path.style)}/>`;
	}
	if (path.kind === 'run') {
		return `<line x1="${start.x}" y1="${start.y}" x2="${path.end.x}" y2="${path.end.y}" stroke="${color}" stroke-width="5" stroke-linecap="round"${dashAttribute(path.style)} marker-end="url(#arrow-${path.color})"/>`;
	}
	const controlY = (start.y + path.end.y) / 2 - airborneLift(path.kind, start, path.end, fieldTop) * 2;
	return `<path d="M ${start.x} ${start.y} Q ${(start.x + path.end.x) / 2} ${controlY} ${path.end.x} ${path.end.y}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"${dashAttribute(path.style, true)} marker-end="url(#arrow-${path.color})"/>`;
};

const downText = (guide: FieldGuide, los: FieldGuide | undefined, yardsToPixels: number) => {
	if (guide.down === 'pat') return 'P.A.T.';
	if (!los) return guide.down ?? '1st';
	const distance = Math.round((Math.abs(guide.x - los.x) / yardsToPixels) * 2) / 2;
	return `${guide.down ?? '1st'} & ${distance}`;
};

const renderField = (scene: PlayBuilderScene, settings: PlayBuilderFieldSettings) => {
	const layout = fieldLayouts[settings.fieldType];
	const palette = fieldPalettes[settings.fieldColor];
	const fixtureScale =
		settings.showTeamBoxes && layout.teamBox ? (484 - 48) / (layout.widthYards + layout.teamBoxSetbackYards * 2) : Number.POSITIVE_INFINITY;
	const fieldWidth = Math.min(960, 384 * (layout.totalYards / layout.widthYards), fixtureScale * layout.totalYards);
	const fieldHeight = fieldWidth * (layout.widthYards / layout.totalYards);
	const fieldLeft = (1000 - fieldWidth) / 2;
	const fieldTop = (484 - fieldHeight) / 2;
	const fieldRight = fieldLeft + fieldWidth;
	const fieldBottom = fieldTop + fieldHeight;
	const yardsToPixels = fieldWidth / layout.totalYards;
	const xForYards = (yards: number) => fieldLeft + yards * yardsToPixels;
	const yardsForX = (x: number) => (x - fieldLeft) / yardsToPixels;
	const leftGoalYards = layout.goalLines[0];
	const rightGoalYards = layout.goalLines.at(-1) ?? layout.totalYards;
	const lineOfScrimmageMarkerDisplay = (x: number) => {
		const yards = yardsForX(x);
		const yardLine = Math.round(Math.min(yards - leftGoalYards, rightGoalYards - yards) * 2) / 2;
		const atMidfield = Math.abs(yards - (leftGoalYards + rightGoalYards) / 2) < 0.01;
		const side = yards <= (leftGoalYards + rightGoalYards) / 2 ? 'A' : 'B';
		const half = !Number.isInteger(yardLine);
		const wholeYards = Math.floor(yardLine);
		const base = atMidfield ? String(yardLine) : half && wholeYards === 0 ? `${side}'s` : `${side}'s ${half ? wholeYards : yardLine}`;
		return { base, half, baseWidth: base.length * 5.8 };
	};
	const fieldAngle = -(Math.atan2(fieldHeight, fieldWidth) * 180) / Math.PI;
	const arrowMarkers = (Object.keys(colors) as GuideColor[])
		.map(
			(color) =>
				`<marker id="arrow-${color}" viewBox="0 0 10 10" refX="0" refY="5" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${colors[color]}"/></marker>`
		)
		.join('');
	const teamBoxes =
		settings.showTeamBoxes && layout.teamBox
			? [fieldTop - layout.teamBoxSetbackYards * yardsToPixels - 20, fieldBottom + layout.teamBoxSetbackYards * yardsToPixels]
					.map((y, index) => {
						const x = xForYards(layout.teamBox![0]);
						const width = xForYards(layout.teamBox![1]) - x;
						const label = escapeXml(index === 0 ? settings.teamBoxTopLabel : settings.teamBoxBottomLabel);
						const scoreboard =
							index === 0
								? [
										{ x: x + 4, value: settings.gameQuarter.toUpperCase(), fontSize: 12, letterSpacing: 1.5 },
										{ x: x + width - 62, value: formatPlayBuilderGameClock(settings.gameClockSeconds), fontSize: 11, letterSpacing: 0.5 }
									]
									.map(
										(item) =>
											`<g><rect x="${item.x}" y="${y}" width="58" height="20" fill="#111827" stroke="#d2b48c" stroke-width="2"/><text x="${item.x + 29}" y="${y + 14}" text-anchor="middle" fill="#fef3c7" font-size="${item.fontSize}" font-weight="900" letter-spacing="${item.letterSpacing}">${item.value}</text></g>`
									)
									.join('')
								: '';
						return `<g><rect x="${x}" y="${y}" width="${width}" height="20" fill="#d2b48c" stroke="rgba(255,255,255,.85)" stroke-width="2"/><text x="${x + width / 2}" y="${y + 14}" text-anchor="middle" fill="#292524" font-size="12" font-weight="900" letter-spacing="2">${label}</text></g>${scoreboard}`;
					})
					.join('')
			: '';
	const yardNumbers = settings.showYardNumbers
		? [fieldTop + 35, fieldBottom - 15]
				.flatMap((y) =>
					layout.yardLabels.map(
						(marker) =>
							`<text x="${xForYards(marker.x)}" y="${y}" text-anchor="middle" fill="rgba(255,255,255,.72)" font-size="26" font-weight="900" letter-spacing="7">${marker.label}</text>`
					)
				)
				.join('')
		: '';
	const goalLetters = settings.showGoalLetters
		? [fieldTop + 35, fieldBottom - 15]
				.flatMap((y) =>
					layout.goalLabelYards.map(
						(yard) =>
							`<text x="${xForYards(yard)}" y="${y}" text-anchor="middle" fill="rgba(255,255,255,.72)" font-size="26" font-weight="900">G</text>`
					)
				)
				.join('')
		: '';
	const hashes = settings.showHashes
		? layout.hashLines
				.flatMap((yard) =>
					layout.hashYFractions.map(
						(fraction) =>
							`<line x1="${xForYards(yard) - 10}" y1="${fieldTop + fieldHeight * fraction}" x2="${xForYards(yard) + 10}" y2="${fieldTop + fieldHeight * fraction}" stroke="#fff" stroke-width="3"/>`
					)
				)
				.join('')
		: '';
	const shortLines = [
		...(settings.showThreeYardMarker ? layout.threeYardMarkers : []),
		...(settings.showTenYardMarker ? layout.tenYardMarkers : []),
		...(settings.showThirtyYardMarker ? layout.thirtyYardMarkers : [])
	]
		.map(
			(yard) =>
				`<line x1="${xForYards(yard)}" y1="${fieldTop + fieldHeight / 2 - 13}" x2="${xForYards(yard)}" y2="${fieldTop + fieldHeight / 2 + 13}" stroke="rgba(255,255,255,.9)" stroke-width="3"/>`
		)
		.join('');
	const xYards = [...(settings.showTenYardMarker ? layout.tenYardXs : []), ...(settings.showFourteenYardX ? layout.fourteenYardXs : [])];
	const xMarks = xYards
		.map(
			(yard) =>
				`<text x="${xForYards(yard)}" y="${fieldTop + fieldHeight / 2 + 7}" text-anchor="middle" fill="#fff" font-size="22" font-weight="900">×</text>`
		)
		.join('');
	const pylons = settings.showPylons
		? layout.endZonePylonYards
				.flatMap((yard) =>
					[fieldTop, fieldBottom].map(
						(y) => `<rect x="${xForYards(yard) - 4}" y="${y - 4}" width="8" height="8" fill="#f97316" stroke="#fff" stroke-width="1.5"/>`
					)
				)
				.join('')
		: '';
	const guideElements = scene.guides
		.map(
			(guide) =>
				`<line x1="${guide.x}" y1="${fieldTop + 4}" x2="${guide.x}" y2="${fieldBottom - 4}" stroke="${colors[guide.color]}" stroke-width="5"${dashAttribute(guide.style)}/>`
		)
		.join('');
	const renderLayers = () => {
		const items = new Map<string, string>();
		for (const path of scene.paths) items.set(`path:${path.id}`, renderPath(path, scene, fieldTop));
		for (const marker of scene.markers) items.set(`marker:${marker.id}`, renderMarker(marker));
		const ordered: string[] = [];
		for (const layer of scene.layerOrder) {
			if (layer.type === 'guide') continue;
			const key = `${layer.type}:${layer.id}`;
			const item = items.get(key);
			if (item) {
				ordered.push(item);
				items.delete(key);
			}
		}
		ordered.push(...items.values());
		return ordered.join('');
	};
	const freeDrawings = scene.freeStrokes
		.map((stroke) =>
			stroke.points.length === 1
				? `<circle cx="${stroke.points[0].x}" cy="${stroke.points[0].y}" r="${(stroke.width ?? 5) * 0.85}" fill="${colors[stroke.color]}"/>`
				: `<path d="${freehandPath(stroke.points)}" fill="none" stroke="${colors[stroke.color]}" stroke-width="${stroke.width ?? 5}" stroke-linecap="round" stroke-linejoin="round"/>`
		)
		.join('');
	const los = scene.guides.find((guide) => guide.kind === 'line-of-scrimmage');
	const ltg = scene.guides.find((guide) => guide.kind === 'line-to-gain');
	const losMarker = los ? lineOfScrimmageMarkerDisplay(los.x) : undefined;
	const indicators = `${
		settings.showDownMarker && ltg
			? `<g><rect x="${ltg.x - 32}" y="${fieldTop - 9}" width="64" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5"/><text x="${ltg.x}" y="${fieldTop + 4}" text-anchor="middle" fill="#ff5a1f" font-size="10" font-weight="900">${escapeXml(downText(ltg, los, yardsToPixels))}</text></g>`
			: ''
	}${
		settings.showLineOfScrimmageMarker && los && losMarker
			? `<g><rect x="${los.x - 26}" y="${fieldBottom - 9}" width="52" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5"/><text x="${los.x - (losMarker.half ? 3.5 : 0)}" y="${fieldBottom + 3.5}" text-anchor="middle" fill="#fff" font-size="10" font-weight="900">${escapeXml(losMarker.base)}</text>${
					losMarker.half
						? `<g fill="#fff" font-size="5.5" font-weight="900" text-anchor="middle"><text x="${los.x + losMarker.baseWidth / 2 - 1.5}" y="${fieldBottom - 1.5}">1</text><line x1="${los.x + losMarker.baseWidth / 2 - 4}" y1="${fieldBottom + 0.25}" x2="${los.x + losMarker.baseWidth / 2 + 1}" y2="${fieldBottom + 0.25}" stroke="#fff" stroke-width="0.8"/><text x="${los.x + losMarker.baseWidth / 2 - 1.5}" y="${fieldBottom + 5.5}">2</text></g>`
						: ''
				}</g>`
			: ''
	}`;

	return `<svg x="30" y="82" width="1140" height="480" viewBox="0 0 1000 484" preserveAspectRatio="xMidYMid meet">
		<defs>
			<pattern id="field-stripe" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="16" height="32" fill="rgba(255,255,255,.035)"/></pattern>
			${arrowMarkers}
		</defs>
		<rect width="1000" height="484" fill="${palette.endZone}"/>
		<rect width="1000" height="484" fill="url(#field-stripe)"/>
		${teamBoxes}
		<rect x="${fieldLeft}" y="${fieldTop}" width="${fieldWidth}" height="${fieldHeight}" fill="${palette.field}"/>
		<rect x="${fieldLeft}" y="${fieldTop}" width="${fieldWidth}" height="${fieldHeight}" fill="url(#field-stripe)"/>
		<rect x="${fieldLeft}" y="${fieldTop}" width="${xForYards(layout.goalLines[0]) - fieldLeft}" height="${fieldHeight}" fill="${palette.endZone}"/>
		<rect x="${xForYards(layout.goalLines.at(-1) ?? layout.totalYards)}" y="${fieldTop}" width="${fieldRight - xForYards(layout.goalLines.at(-1) ?? layout.totalYards)}" height="${fieldHeight}" fill="${palette.endZone}"/>
		<rect x="${fieldLeft}" y="${fieldTop}" width="${xForYards(layout.goalLines[0]) - fieldLeft}" height="${fieldHeight}" fill="url(#field-stripe)"/>
		<rect x="${xForYards(layout.goalLines.at(-1) ?? layout.totalYards)}" y="${fieldTop}" width="${fieldRight - xForYards(layout.goalLines.at(-1) ?? layout.totalYards)}" height="${fieldHeight}" fill="url(#field-stripe)"/>
		${layout.shadedZones.map((zone) => `<rect x="${xForYards(zone[0])}" y="${fieldTop}" width="${xForYards(zone[1]) - xForYards(zone[0])}" height="${fieldHeight}" fill="rgba(0,0,0,.06)"/>`).join('')}
		${layout.noRunZones.map((zone) => `<rect x="${xForYards(zone[0])}" y="${fieldTop}" width="${xForYards(zone[1]) - xForYards(zone[0])}" height="${fieldHeight}" fill="rgba(255,255,255,.16)"/>`).join('')}
		<rect x="${fieldLeft}" y="${fieldTop}" width="${fieldWidth}" height="${fieldHeight}" fill="none" stroke="#fff" stroke-width="3"/>
		${layout.zoneLines.map((yard) => `<line x1="${xForYards(yard)}" y1="${fieldTop}" x2="${xForYards(yard)}" y2="${fieldBottom}" stroke="rgba(255,255,255,.86)" stroke-width="3"/>`).join('')}
		${layout.noRunLines.map((yard) => `<line x1="${xForYards(yard)}" y1="${fieldTop}" x2="${xForYards(yard)}" y2="${fieldBottom}" stroke="rgba(255,255,255,.58)" stroke-width="3" stroke-dasharray="10 8"/>`).join('')}
		${hashes}${shortLines}${yardNumbers}${goalLetters}
		${settings.showEndZoneText ? layout.endZoneCenters.map((yard, index) => `<text x="${xForYards(yard)}" y="${fieldTop + fieldHeight / 2}" transform="rotate(${index === 0 ? -90 : 90} ${xForYards(yard)} ${fieldTop + fieldHeight / 2})" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,.72)" font-size="26" font-weight="900" letter-spacing="4">END ZONE</text>`).join('') : ''}
		<text x="${fieldLeft + fieldWidth / 2}" y="${fieldTop + fieldHeight / 2}" transform="rotate(${fieldAngle} ${fieldLeft + fieldWidth / 2} ${fieldTop + fieldHeight / 2})" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,.1)" font-size="52" font-weight="900" letter-spacing="7">CASEPLAY.ORG</text>
		${guideElements}${xMarks}${renderLayers()}${pylons}${indicators}${freeDrawings}
	</svg>`;
};

export const renderPlayBuilderSocialSvg = (document: PlayBuilderDocument) => {
	const activePlayIndex = document.plays[document.activePlayIndex] ? document.activePlayIndex : 0;
	const active = document.plays[activePlayIndex];
	const field = renderField(active.scene, active.settings);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Inter, sans-serif">
		<defs><pattern id="graph" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e7e5e4" stroke-width="1" opacity=".58"/></pattern></defs>
		<rect width="1200" height="630" fill="#fafaf9"/><rect width="1200" height="630" fill="url(#graph)"/>
		<text x="600" y="62" text-anchor="middle" fill="#1c1917" font-family="Dokdo" font-size="68" font-weight="400" letter-spacing="2.5">FLAG FOOTBALL PLAY BUILDER</text>
		${field}
		<rect x="350" y="574" width="500" height="46" fill="#1c1917"/>
		<text x="600" y="605" text-anchor="middle" fill="#fff" font-size="23" font-weight="900" letter-spacing="5">CASEPLAY.ORG/PLAY-BUILDER</text>
	</svg>`;
};

export const defaultSocialPlayBuilderDocument = (): PlayBuilderDocument => ({
	activePlayIndex: 0,
	plays: [
		{
			name: 'Play 1',
			settings: defaultPlayBuilderFieldSettings(),
			scene: {
				markers: [
					{ id: 1, kind: 'team-a', x: 430, y: 290, label: 'A-1', sequence: 1 },
					{ id: 2, kind: 'team-a', x: 570, y: 220, label: 'A-2', sequence: 2 },
					{ id: 3, kind: 'team-b', x: 760, y: 270, label: 'B-1', sequence: 1 },
					{ id: 4, kind: 'ball', x: 500, y: 270 }
				],
				paths: [{ id: 5, kind: 'pass', start: { x: 500, y: 270 }, end: { x: 850, y: 215 }, color: 'cyan', style: 'dashed', startMarkerId: 4 }],
				guides: [],
				freeStrokes: [],
				layerOrder: [
					{ type: 'marker', id: 1 },
					{ type: 'marker', id: 2 },
					{ type: 'marker', id: 3 },
					{ type: 'path', id: 5 },
					{ type: 'marker', id: 4 }
				]
			}
		}
	]
});
