export type PlayerKind = 'team-a' | 'team-k' | 'team-b' | 'team-r';
export type MarkerKind = PlayerKind | 'ball' | 'flag' | 'deflag' | 'event';
export type PathKind = 'line' | 'run' | 'pass' | 'kick';
export type GuideKind = 'line-of-scrimmage' | 'line-to-gain' | 'custom';
export type GuideColor = 'orange' | 'gold' | 'yellow' | 'red' | 'cyan' | 'blue' | 'green' | 'purple' | 'black' | 'white' | 'gray';
export type GuideStyle = 'solid' | 'dashed' | 'dotted';
export type PlayBuilderFieldType = 'traditional' | 'four-v-four' | 'unified';
export type PlayBuilderFieldColor = 'green' | 'red' | 'navy' | 'light-blue' | 'orange' | 'purple';
export type PlayBuilderFieldSettings = {
	showYardNumbers: boolean;
	showGoalLetters: boolean;
	showEndZoneText: boolean;
	showPylons: boolean;
	showHashes: boolean;
	showThreeYardMarker: boolean;
	showTenYardMarker: boolean;
	showFourteenYardX: boolean;
	showThirtyYardMarker: boolean;
	showNoRunZoneText: boolean;
	showTeamBoxes: boolean;
	fieldType: PlayBuilderFieldType;
	fieldColor: PlayBuilderFieldColor;
};
export type Point = { x: number; y: number };
export type FieldMarker = Point & { id: number; kind: MarkerKind; label?: string; sequence?: number; color?: GuideColor };
export type FieldPath = { id: number; kind: PathKind; start: Point; end: Point; color: GuideColor; style: GuideStyle; startMarkerId?: number };
export type FieldGuide = { id: number; kind: GuideKind; x: number; color: GuideColor; style: GuideStyle };
export type FreeStroke = { id: number; color: GuideColor; points: Point[]; width?: number };
export type LayerType = 'guide' | 'path' | 'marker';
export type LayerRef = { type: LayerType; id: number };
export type PlayBuilderScene = {
	markers: FieldMarker[];
	paths: FieldPath[];
	guides: FieldGuide[];
	freeStrokes: FreeStroke[];
	layerOrder: LayerRef[];
};

const markerKinds: MarkerKind[] = ['team-a', 'team-k', 'team-b', 'team-r', 'ball', 'flag', 'deflag', 'event'];
const pathKinds: PathKind[] = ['line', 'run', 'pass', 'kick'];
const guideKinds: GuideKind[] = ['line-of-scrimmage', 'line-to-gain', 'custom'];
const colors: GuideColor[] = ['orange', 'gold', 'yellow', 'red', 'cyan', 'blue', 'green', 'purple', 'black', 'white', 'gray'];
const styles: GuideStyle[] = ['solid', 'dashed', 'dotted'];
const layerTypes: LayerType[] = ['guide', 'path', 'marker'];
const fieldTypes: PlayBuilderFieldType[] = ['traditional', 'four-v-four', 'unified'];
const fieldColors: PlayBuilderFieldColor[] = ['green', 'red', 'navy', 'light-blue', 'orange', 'purple'];
const fieldSettingKeys = [
	'showYardNumbers',
	'showGoalLetters',
	'showEndZoneText',
	'showPylons',
	'showHashes',
	'showThreeYardMarker',
	'showTenYardMarker',
	'showFourteenYardX',
	'showThirtyYardMarker',
	'showTeamBoxes',
	'showNoRunZoneText'
] as const;

type LegacyMarkerTuple = [number, number, number, number, string | null, number | null];
type MarkerTuple = [number, number, number, number, string | null, number | null, number | null];
type PathTuple = [number, number, number, number, number, number, number, number, number | null];
type GuideTuple = [number, number, number, number, number];
type LegacyStrokeTuple = [number, number, number[]];
type StrokeTuple = [number, number, number, number[]];
type FieldSettingsTuple = [number, number, number];

export type SerializedPlayBuilderScene = {
	v: 1;
	m: (LegacyMarkerTuple | MarkerTuple)[];
	p: PathTuple[];
	g: GuideTuple[];
	f: (LegacyStrokeTuple | StrokeTuple)[];
	o?: [number, number][];
};

export type PlayBuilderDocument = {
	activePlayIndex: number;
	plays: { name: string; scene: PlayBuilderScene; settings: PlayBuilderFieldSettings }[];
};

export const PLAY_BUILDER_PLAY_NAME_MAX_LENGTH = 64;
export const PLAY_BUILDER_MAX_PLAYS = 4;

export const DEFAULT_PLAY_BUILDER_FIELD_SETTINGS: Readonly<PlayBuilderFieldSettings> = {
	showYardNumbers: true,
	showGoalLetters: true,
	showEndZoneText: true,
	showPylons: true,
	showHashes: true,
	showThreeYardMarker: true,
	showTenYardMarker: true,
	showFourteenYardX: true,
	showThirtyYardMarker: true,
	showNoRunZoneText: false,
	showTeamBoxes: true,
	fieldType: 'traditional',
	fieldColor: 'green'
};

export const defaultPlayBuilderFieldSettings = (): PlayBuilderFieldSettings => ({ ...DEFAULT_PLAY_BUILDER_FIELD_SETTINGS });

type SerializedPlayBuilderDocumentV2 = {
	v: 2;
	a: number;
	p: [string, SerializedPlayBuilderScene][];
};

type SerializedPlayBuilderDocumentV3 = {
	v: 3;
	a: number;
	p: [string, SerializedPlayBuilderScene, FieldSettingsTuple][];
};

export type SerializedPlayBuilderDocument = SerializedPlayBuilderDocumentV2 | SerializedPlayBuilderDocumentV3;

const quantize = (value: number) => Math.round(value * 10);
const dequantize = (value: number) => value / 10;
const indexOf = <T extends string>(items: readonly T[], value: T) => Math.max(0, items.indexOf(value));

export const encodePlayBuilderScene = (scene: PlayBuilderScene): SerializedPlayBuilderScene => ({
	v: 1,
	m: scene.markers.map((marker) => [
		marker.id,
		indexOf(markerKinds, marker.kind),
		quantize(marker.x),
		quantize(marker.y),
		marker.label ?? null,
		marker.sequence ?? null,
		marker.color === undefined ? null : indexOf(colors, marker.color)
	]),
	p: scene.paths.map((path) => [
		path.id,
		indexOf(pathKinds, path.kind),
		quantize(path.start.x),
		quantize(path.start.y),
		quantize(path.end.x),
		quantize(path.end.y),
		indexOf(colors, path.color),
		indexOf(styles, path.style),
		path.startMarkerId ?? null
	]),
	g: scene.guides.map((guide) => [
		guide.id,
		indexOf(guideKinds, guide.kind),
		quantize(guide.x),
		indexOf(colors, guide.color),
		indexOf(styles, guide.style)
	]),
	f: scene.freeStrokes.map((stroke) => {
		const points: number[] = [];
		let previousX = 0;
		let previousY = 0;
		stroke.points.forEach((point, index) => {
			const x = quantize(point.x);
			const y = quantize(point.y);
			points.push(index === 0 ? x : x - previousX, index === 0 ? y : y - previousY);
			previousX = x;
			previousY = y;
		});
		return [stroke.id, indexOf(colors, stroke.color), quantize(stroke.width ?? 5), points];
	}),
	o: scene.layerOrder.map((layer) => [indexOf(layerTypes, layer.type), layer.id])
});

const validInteger = (value: unknown) => Number.isInteger(value);
const validIndex = (value: unknown, length: number) => validInteger(value) && Number(value) >= 0 && Number(value) < length;
const validCoordinate = (value: unknown) => validInteger(value) && Math.abs(Number(value)) <= 100_000;

export const decodePlayBuilderScene = (value: unknown): PlayBuilderScene => {
	if (!value || typeof value !== 'object') throw new Error('Invalid play builder scene.');
	const scene = value as Partial<SerializedPlayBuilderScene>;
	if (scene.v !== 1 || !Array.isArray(scene.m) || !Array.isArray(scene.p) || !Array.isArray(scene.g) || !Array.isArray(scene.f)) {
		throw new Error('Unsupported play builder scene.');
	}
	if (scene.m.length > 500 || scene.p.length > 500 || scene.g.length > 250 || scene.f.length > 2_000)
		throw new Error('Play builder scene is too large.');

	const markers = scene.m.map((item) => {
		if (
			!Array.isArray(item) ||
			(item.length !== 6 && item.length !== 7) ||
			!validInteger(item[0]) ||
			!validIndex(item[1], markerKinds.length) ||
			!validCoordinate(item[2]) ||
			!validCoordinate(item[3])
		) {
			throw new Error('Invalid marker data.');
		}
		const label = item[4];
		const sequence = item[5];
		if (label !== null && (typeof label !== 'string' || label.length > 24)) throw new Error('Invalid marker label.');
		if (sequence !== null && !validInteger(sequence)) throw new Error('Invalid marker sequence.');
		const colorIndex = item.length === 7 ? item[6] : null;
		if (colorIndex !== null && !validIndex(colorIndex, colors.length)) throw new Error('Invalid marker color.');
		return {
			id: item[0],
			kind: markerKinds[item[1]],
			x: dequantize(item[2]),
			y: dequantize(item[3]),
			...(label === null ? {} : { label }),
			...(sequence === null ? {} : { sequence }),
			...(colorIndex === null ? {} : { color: colors[colorIndex] })
		};
	});
	const paths = scene.p.map((item) => {
		if (
			!Array.isArray(item) ||
			item.length !== 9 ||
			!validInteger(item[0]) ||
			!validIndex(item[1], pathKinds.length) ||
			![item[2], item[3], item[4], item[5]].every(validCoordinate) ||
			!validIndex(item[6], colors.length) ||
			!validIndex(item[7], styles.length) ||
			(item[8] !== null && !validInteger(item[8]))
		)
			throw new Error('Invalid path data.');
		return {
			id: item[0],
			kind: pathKinds[item[1]],
			start: { x: dequantize(item[2]), y: dequantize(item[3]) },
			end: { x: dequantize(item[4]), y: dequantize(item[5]) },
			color: colors[item[6]],
			style: styles[item[7]],
			...(item[8] === null ? {} : { startMarkerId: item[8] })
		};
	});
	const guides = scene.g.map((item) => {
		if (
			!Array.isArray(item) ||
			item.length !== 5 ||
			!validInteger(item[0]) ||
			!validIndex(item[1], guideKinds.length) ||
			!validCoordinate(item[2]) ||
			!validIndex(item[3], colors.length) ||
			!validIndex(item[4], styles.length)
		) {
			throw new Error('Invalid guide data.');
		}
		return { id: item[0], kind: guideKinds[item[1]], x: dequantize(item[2]), color: colors[item[3]], style: styles[item[4]] };
	});
	let pointCount = 0;
	const freeStrokes = scene.f.map((item) => {
		const pointDataIndex = item.length === 4 ? 3 : 2;
		const width = item.length === 4 ? item[2] : null;
		if (
			!Array.isArray(item) ||
			(item.length !== 3 && item.length !== 4) ||
			!validInteger(item[0]) ||
			!validIndex(item[1], colors.length) ||
			(width !== null && (!validInteger(width) || width < 10 || width > 200)) ||
			!Array.isArray(item[pointDataIndex]) ||
			item[pointDataIndex].length % 2 !== 0 ||
			!item[pointDataIndex].every(validCoordinate)
		) {
			throw new Error('Invalid drawing data.');
		}
		const pointData = item[pointDataIndex] as number[];
		pointCount += pointData.length / 2;
		if (pointCount > 100_000) throw new Error('Play builder drawing is too large.');
		const points: Point[] = [];
		let x = 0;
		let y = 0;
		for (let index = 0; index < pointData.length; index += 2) {
			x = index === 0 ? pointData[index] : x + pointData[index];
			y = index === 0 ? pointData[index + 1] : y + pointData[index + 1];
			points.push({ x: dequantize(x), y: dequantize(y) });
		}
		return { id: item[0], color: colors[item[1]], points, ...(width === null ? {} : { width: dequantize(width) }) };
	});
	const availableLayers: LayerRef[] = [
		...guides.map((guide) => ({ type: 'guide' as const, id: guide.id })),
		...paths.map((path) => ({ type: 'path' as const, id: path.id })),
		...markers.map((marker) => ({ type: 'marker' as const, id: marker.id }))
	];
	const availableKeys = new Set(availableLayers.map((layer) => `${layer.type}:${layer.id}`));
	const seenKeys = new Set<string>();
	const storedOrder = Array.isArray(scene.o)
		? scene.o.map((item) => {
				if (!Array.isArray(item) || item.length !== 2 || !validIndex(item[0], layerTypes.length) || !validInteger(item[1])) {
					throw new Error('Invalid layer data.');
				}
				return { type: layerTypes[item[0]], id: item[1] };
			})
		: [];
	const layerOrder = storedOrder.filter((layer) => {
		const key = `${layer.type}:${layer.id}`;
		if (!availableKeys.has(key) || seenKeys.has(key)) return false;
		seenKeys.add(key);
		return true;
	});
	for (const layer of availableLayers) {
		const key = `${layer.type}:${layer.id}`;
		if (!seenKeys.has(key)) layerOrder.push(layer);
	}
	return { markers, paths, guides, freeStrokes, layerOrder };
};

const encodeFieldSettings = (settings: PlayBuilderFieldSettings): FieldSettingsTuple => [
	fieldSettingKeys.reduce((mask, key, index) => mask | (settings[key] ? 1 << index : 0), 0),
	indexOf(fieldTypes, settings.fieldType),
	indexOf(fieldColors, settings.fieldColor)
];

const decodeFieldSettings = (value: unknown): PlayBuilderFieldSettings => {
	if (
		!Array.isArray(value) ||
		value.length !== 3 ||
		!validInteger(value[0]) ||
		Number(value[0]) < 0 ||
		Number(value[0]) >= 1 << fieldSettingKeys.length ||
		!validIndex(value[1], fieldTypes.length) ||
		!validIndex(value[2], fieldColors.length)
	) {
		throw new Error('Invalid field settings.');
	}
	const settings = defaultPlayBuilderFieldSettings();
	fieldSettingKeys.forEach((key, index) => {
		settings[key] = (Number(value[0]) & (1 << index)) !== 0;
	});
	settings.fieldType = fieldTypes[Number(value[1])];
	settings.fieldColor = fieldColors[Number(value[2])];
	return settings;
};

export const encodePlayBuilderDocument = (document: PlayBuilderDocument): SerializedPlayBuilderDocument => ({
	v: 3,
	a: document.activePlayIndex,
	p: document.plays.map((play) => [play.name, encodePlayBuilderScene(play.scene), encodeFieldSettings(play.settings)])
});

export const decodePlayBuilderDocument = (value: unknown): PlayBuilderDocument => {
	if (value && typeof value === 'object' && (value as Partial<SerializedPlayBuilderScene>).v === 1) {
		return { activePlayIndex: 0, plays: [{ name: 'Play 1', scene: decodePlayBuilderScene(value), settings: defaultPlayBuilderFieldSettings() }] };
	}
	if (!value || typeof value !== 'object') throw new Error('Invalid play builder document.');
	const document = value as Partial<SerializedPlayBuilderDocument>;
	if (
		(document.v !== 2 && document.v !== 3) ||
		!Number.isInteger(document.a) ||
		!Array.isArray(document.p) ||
		document.p.length < 1 ||
		document.p.length > PLAY_BUILDER_MAX_PLAYS
	) {
		throw new Error('Unsupported play builder document.');
	}
	if (Number(document.a) < 0 || Number(document.a) >= document.p.length) throw new Error('Invalid active play.');
	const plays = document.p.map((item) => {
		const expectedLength = document.v === 3 ? 3 : 2;
		if (!Array.isArray(item) || item.length !== expectedLength || typeof item[0] !== 'string') throw new Error('Invalid play data.');
		const name = item[0].trim();
		if (name.length < 1 || name.length > PLAY_BUILDER_PLAY_NAME_MAX_LENGTH)
			throw new Error(`Play names must be between 1 and ${PLAY_BUILDER_PLAY_NAME_MAX_LENGTH} characters.`);
		return {
			name,
			scene: decodePlayBuilderScene(item[1]),
			settings: document.v === 3 ? decodeFieldSettings(item[2]) : defaultPlayBuilderFieldSettings()
		};
	});
	return { activePlayIndex: Number(document.a), plays };
};
