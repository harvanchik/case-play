<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { exportPlayBuilderPdf, exportPlayBuilderPng, renderPlayBuilderCanvas } from '$lib/play-builder-export';
	import {
		DEFAULT_PLAY_BUILDER_FIELD_SETTINGS,
		decodePlayBuilderDocument,
		defaultPlayBuilderFieldSettings,
		encodePlayBuilderDocument,
		PLAY_BUILDER_MAX_PLAYS,
		PLAY_BUILDER_PLAY_NAME_MAX_LENGTH,
		type FieldGuide,
		type FieldMarker,
		type FieldPath,
		type FreeStroke,
		type GuideColor,
		type GuideKind,
		type GuideStyle,
		type LayerRef,
		type LayerType,
		type MarkerKind,
		type PathKind,
		type PlayBuilderFieldColor,
		type PlayBuilderFieldSettings,
		type PlayBuilderFieldType,
		type PlayBuilderScene,
		type PlayerKind,
		type Point,
		type SerializedPlayBuilderDocument
	} from '$lib/play-builder-scene';
	import HoverTooltip from './HoverTooltip.svelte';

	type Tool = PlayerKind | 'ball' | 'flag' | 'deflag' | 'event' | 'free-draw' | 'run' | 'pass' | 'kick' | 'line-of-scrimmage' | 'line-to-gain';
	type SelectedTarget = { type: 'marker' | 'path' | 'guide'; id: number };
	type DragTarget =
		| { type: 'marker'; id: number; pointerStart: Point; elementStart: Point; moved: boolean }
		| { type: 'guide'; id: number; pointerStart: Point; xStart: number; moved: boolean }
		| {
				type: 'path';
				id: number;
				pointerStart: Point;
				start: Point;
				end: Point;
				startMarkerId?: number;
				mode: 'whole' | 'start' | 'end';
				moved: boolean;
			};
	type Scene = PlayBuilderScene;

	export let initialDocument: SerializedPlayBuilderDocument | null = null;
	export let savedPlayId: string | null = null;

	type ToolIcon = 'event' | 'line-of-scrimmage' | 'line-to-gain';
	type ToolOption = {
		id: Tool;
		label: string;
		symbol: string;
		shortcut: string;
		shortcutKeys: string[];
		caption?: string;
		image?: string;
		icon?: ToolIcon;
	};
	const toolRows: ToolOption[][] = [
		[
			{ id: 'team-a', label: 'Team A', symbol: 'A', shortcut: 'a', shortcutKeys: ['A'] },
			{ id: 'team-k', label: 'Team K', symbol: 'K', shortcut: 'k', shortcutKeys: ['K'] }
		],
		[
			{ id: 'team-b', label: 'Team B', symbol: 'B', shortcut: 'b', shortcutKeys: ['B'] },
			{ id: 'team-r', label: 'Team R', symbol: 'R', shortcut: 'r', shortcutKeys: ['R'] }
		],
		[{ id: 'ball', label: 'Football', symbol: '', shortcut: 'o', shortcutKeys: ['O'], caption: 'Football', image: '/images/football.png' }],
		[{ id: 'flag', label: 'Penalty Flag', symbol: '', shortcut: 'f', shortcutKeys: ['F'], caption: 'Penalty', image: '/images/penalty-flag.png' }],
		[{ id: 'deflag', label: 'Flag Belt', symbol: '', shortcut: 'd', shortcutKeys: ['D'], caption: 'Flag Belt', image: '/images/flag-belt.png' }],
		[{ id: 'event', label: 'Event Tag', symbol: '', shortcut: 'e', shortcutKeys: ['E'], caption: 'Event Tag', icon: 'event' }],
		[
			{ id: 'run', label: 'Run Arrow', symbol: '', shortcut: 'shift+r', shortcutKeys: ['Shift', 'R'], caption: 'Run', image: '/images/run-arrow.png' }
		],
		[{ id: 'pass', label: 'Forward Pass', symbol: '', shortcut: 'p', shortcutKeys: ['P'], caption: 'Pass', image: '/images/punt-arrow.png' }],
		[{ id: 'kick', label: 'Punt / Kick', symbol: '', shortcut: 'u', shortcutKeys: ['U'], caption: 'Punt/Kick', image: '/images/pass-arrow.png' }],
		[
			{
				id: 'line-of-scrimmage',
				label: 'Line of Scrimmage',
				symbol: '',
				shortcut: 's',
				shortcutKeys: ['S'],
				caption: 'L.O.S.',
				icon: 'line-of-scrimmage'
			},
			{
				id: 'line-to-gain',
				label: 'Line to Gain',
				symbol: '',
				shortcut: 'shift+l',
				shortcutKeys: ['Shift', 'L'],
				caption: 'L.T.G.',
				icon: 'line-to-gain'
			}
		],
		[{ id: 'free-draw', label: 'Free Draw', symbol: '', shortcut: 'g', shortcutKeys: ['G'], caption: 'Draw', image: '/images/draw-pen.png' }]
	];
	const tools = toolRows.flat();
	const helpPlayerTools = tools.filter((item) => ['team-a', 'team-k', 'team-b', 'team-r'].includes(item.id));
	const helpElementTools = tools.filter((item) => ['ball', 'flag', 'deflag', 'event'].includes(item.id));
	const helpRouteTools = tools.filter((item) => ['run', 'pass', 'kick'].includes(item.id));
	const helpGuideTools = tools.filter((item) => ['line-of-scrimmage', 'line-to-gain'].includes(item.id));
	const helpDrawTool = tools.find((item) => item.id === 'free-draw')!;
	const toolHelp: Record<Tool, string> = {
		'team-a': 'Places Team A players as A-1, A-2, and so on. Double-click a player to rename it with up to four characters.',
		'team-k': 'Places kicking-team players as K-1, K-2, and so on. Double-click to rename.',
		'team-b': 'Places Team B players as B-1, B-2, and so on. Double-click to rename.',
		'team-r': 'Places receiving-team players as R-1, R-2, and so on. Double-click to rename.',
		ball: 'Places the football at the chosen spot on the field. Drag it to move it, or double-click to add an optional description beneath it.',
		flag: 'Marks a penalty spot. Double-click the flag to add or change the optional foul description shown beneath it.',
		deflag:
			'Marks the deflagging spot. Double-click to add an optional description or choose the flag color; that color becomes the default for the next belts you place.',
		event:
			'Places a resizable text tag and immediately opens its editor. Use it for catches, first touching, possession changes, or any event that needs a label.',
		run: 'Drag from any point—or directly from a player—to draw a solid running route. Double-click the route to change its color and line style.',
		pass: 'Drag to draw a dashed forward-pass arc. Its curve, changing thickness, and shadow show the ball traveling through the air. Double-click to format it.',
		kick: 'Drag to draw a higher punt or kick arc. Double-click to change its color or line style.',
		'line-of-scrimmage': 'Places one dashed white L.O.S. Reformatting its color or style turns it into a custom cross-field line.',
		'line-to-gain': 'Places a solid yellow L.T.G. Multiple lines to gain are allowed, and each can be reformatted independently.',
		'free-draw':
			'Draws annotations above every other element, including outside the field within the builder. Choose Straight or Squiggle, a color, and a thickness; tap for a dot, drag to draw, or erase whole strokes.'
	};
	const guideColors: { id: GuideColor; label: string; value: string }[] = [
		{ id: 'orange', label: 'Orange', value: '#f97316' },
		{ id: 'gold', label: 'Gold', value: '#d4a017' },
		{ id: 'yellow', label: 'Yellow', value: '#facc15' },
		{ id: 'red', label: 'Red', value: '#ef4444' },
		{ id: 'cyan', label: 'Cyan', value: '#22d3ee' },
		{ id: 'blue', label: 'Blue', value: '#2563eb' },
		{ id: 'green', label: 'Green', value: '#4ade80' },
		{ id: 'purple', label: 'Purple', value: '#c084fc' },
		{ id: 'black', label: 'Black', value: '#000000' },
		{ id: 'white', label: 'White', value: '#ffffff' },
		{ id: 'gray', label: 'Gray', value: '#9ca3af' }
	];
	const freeDrawColors: { id: GuideColor; label: string; value: string }[] = [
		{ id: 'red', label: 'Neon red', value: '#ff1744' },
		{ id: 'orange', label: 'Neon orange', value: '#ff6d00' },
		{ id: 'yellow', label: 'Neon yellow', value: '#ffea00' },
		{ id: 'green', label: 'Neon green', value: '#00ff66' },
		{ id: 'cyan', label: 'Neon cyan', value: '#00e5ff' },
		{ id: 'blue', label: 'Neon blue', value: '#2979ff' },
		{ id: 'purple', label: 'Neon purple', value: '#d500f9' },
		{ id: 'white', label: 'White', value: '#ffffff' },
		{ id: 'gray', label: 'Gray', value: '#9ca3af' },
		{ id: 'black', label: 'Black', value: '#000000' }
	];
	const guideStyles: GuideStyle[] = ['solid', 'dashed', 'dotted'];

	const blankScene = (): Scene => ({ markers: [], paths: [], guides: [], freeStrokes: [], layerOrder: [] });
	const loadedDocument = initialDocument
		? decodePlayBuilderDocument(initialDocument)
		: { activePlayIndex: 0, plays: [{ name: 'Play 1', scene: blankScene(), settings: defaultPlayBuilderFieldSettings() }] };
	type PlayEntry = { id: number; name: string; scene: Scene; settings: PlayBuilderFieldSettings };
	type BuilderState = {
		plays: PlayEntry[];
		activePlayId: number;
		nextPlayEntryId: number;
		nextPlayNumber: number;
	};
	let playEntries: PlayEntry[] = loadedDocument.plays.map((play, index) => ({
		id: index + 1,
		name: play.name,
		scene: play.scene,
		settings: { ...play.settings }
	}));
	let activePlayIndex = loadedDocument.activePlayIndex;
	let nextPlayEntryId = playEntries.length + 1;
	let nextPlayNumber =
		Math.max(
			0,
			...playEntries.map((play) => {
				const match = /^Play (\d+)$/.exec(play.name);
				return match ? Number(match[1]) : 0;
			})
		) + 1;
	const loadedScene = playEntries[activePlayIndex].scene;
	const loadedIds = [...loadedScene.markers, ...loadedScene.paths, ...loadedScene.guides, ...loadedScene.freeStrokes].map((item) => item.id);
	let svg: SVGSVGElement;
	let tool: Tool = 'team-a';
	let markers: FieldMarker[] = loadedScene.markers;
	let paths: FieldPath[] = loadedScene.paths;
	let guides: FieldGuide[] = loadedScene.guides;
	let freeStrokes: FreeStroke[] = loadedScene.freeStrokes;
	let layerOrder: LayerRef[] = loadedScene.layerOrder;
	let fieldSettings: PlayBuilderFieldSettings = { ...playEntries[activePlayIndex].settings };
	let history: BuilderState[] = [];
	let future: BuilderState[] = [];
	let nextId = Math.max(0, ...loadedIds) + 1;
	let actionInProgress: 'save' | 'png' | 'pdf' | null = null;
	let actionMessage = '';
	let actionMessageTimer: ReturnType<typeof setTimeout> | null = null;
	let copyConfirmed = false;
	let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
	let showHelp = false;
	let helpCloseButton: HTMLButtonElement;
	let showSettings = false;
	let settingsCloseButton: HTMLButtonElement;
	let showNewPrompt = false;
	let newPromptCloseButton: HTMLButtonElement;
	let editingPlayId: number | null = null;
	let playNameValue = '';
	let playNameInput: HTMLInputElement;
	let playMenuElement: HTMLElement;
	let playStripElement: HTMLElement;
	let playMenuLeft = 0;
	let drawing: { kind: PathKind; start: Point; end: Point; pointerStart: Point; startMarkerId?: number } | null = null;
	let activeFreeStroke: FreeStroke | null = null;
	let freeDrawColor: GuideColor = 'red';
	let freeDrawMode: 'draw' | 'erase' = 'draw';
	let freeDrawShape: 'straight' | 'squiggle' = 'squiggle';
	let activeFreeDrawShape: 'straight' | 'squiggle' = 'squiggle';
	let freeDrawThickness = 5;
	let erasingFreeStrokes = false;
	let stylusEraserActive = false;
	let eraseHistorySaved = false;
	let lastErasePoint: Point | null = null;
	let deflagPlacementColor: GuideColor = 'red';
	let dragTarget: DragTarget | null = null;
	let editingMarkerId: number | null = null;
	let editingMarker: FieldMarker | undefined;
	let editValue = '';
	let editInput: HTMLInputElement;
	let editingGuideId: number | null = null;
	let editingGuide: FieldGuide | undefined;
	let editingPathId: number | null = null;
	let editingPath: FieldPath | undefined;
	let lineEditorPoint: Point | null = null;
	let guideEditColor: GuideColor = 'yellow';
	let guideEditStyle: GuideStyle = 'solid';
	let editorElement: HTMLElement;
	let deleteTarget: SelectedTarget | null = null;
	let deletePosition: Point | null = null;
	let deleteButtonElement: HTMLElement;
	let hoverPoint: Point | null = null;
	let pointerOnField = false;
	let hoveringElement = false;
	let placementSnapX: number | null = null;
	let placementSnapTimer: ReturnType<typeof setTimeout> | null = null;
	let lastPlacementHoverPoint: Point | null = null;
	let suppressNextClick = false;
	let primaryModifierKey = 'Ctrl';
	let currentSceneKey = JSON.stringify(encodePlayBuilderDocument(loadedDocument));
	let savedSceneKey = currentSceneKey;
	let hasUnsavedChanges = false;
	$: editingMarker = markers.find((marker) => marker.id === editingMarkerId);
	$: editingGuide = guides.find((guide) => guide.id === editingGuideId);
	$: editingPath = paths.find((path) => path.id === editingPathId);
	$: lineEditorPoint = editingGuide
		? { x: editingGuide.x, y: fieldTop + fieldHeight / 2 }
		: editingPath
			? {
					x: (pathStart(editingPath).x + editingPath.end.x) / 2,
					y: (pathStart(editingPath).y + editingPath.end.y) / 2
				}
			: null;
	$: currentSceneKey = JSON.stringify(
		encodePlayBuilderDocument({
			activePlayIndex,
			plays: playEntries.map((play, index) => ({
				name: play.name,
				scene: index === activePlayIndex ? { markers, paths, guides, freeStrokes, layerOrder } : play.scene,
				settings: index === activePlayIndex ? fieldSettings : play.settings
			}))
		})
	);
	$: hasUnsavedChanges = currentSceneKey !== savedSceneKey;

	const fieldMaxWidth = 960;
	const fieldMaxHeight = 384;
	let fieldLeft = 20;
	let fieldRight = 980;
	let fieldTop = 50;
	let fieldBottom = 434;
	let fieldWidth = fieldMaxWidth;
	let fieldHeight = fieldMaxHeight;
	const fieldLineWidth = 3;
	const playerRadius = 14.025;
	const playerStrokeWidth = 2.55;
	const footballSize = 24.15;
	const deflagSize = 33.75;
	const foulFlagSize = 31.5;
	const eventTagWidth = 46.5;
	const eventTagHeight = 21;
	const markerHitPadding = 3;
	const pathStrokeWidth = 5;
	const plainLineStrokeWidth = 7.5;
	const guideStrokeWidth = 5;
	const freeDrawStrokeWidth = 5;
	const guideSidelineInset = (fieldLineWidth + guideStrokeWidth) / 2;

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
		endZonePylonYards: number[];
		endLinePylonFractions: number[];
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
			endZonePylonYards: [0, 10, 90, 100],
			endLinePylonFractions: [15 / 40, 25 / 40]
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
			endZonePylonYards: [0, 10, 50, 60],
			endLinePylonFractions: [0.5]
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
			teamBox: null,
			endZonePylonYards: [0, 10, 50, 60],
			endLinePylonFractions: []
		}
	};
	const fieldColorOptions: { id: PlayBuilderFieldColor; label: string; field: string; endZone: string }[] = [
		{ id: 'green', label: 'Green', field: '#356f49', endZone: '#244f38' },
		{ id: 'red', label: 'Red', field: '#914747', endZone: '#6d3232' },
		{ id: 'navy', label: 'Navy Blue', field: '#294967', endZone: '#1b334b' },
		{ id: 'light-blue', label: 'Light Blue', field: '#5997b8', endZone: '#3f7797' },
		{ id: 'orange', label: 'Orange', field: '#b96a36', endZone: '#8b4d27' },
		{ id: 'purple', label: 'Purple', field: '#73538f', endZone: '#543a6c' }
	];
	const fieldTypeOptions: { id: PlayBuilderFieldType; label: string; dimensions: string; description: string }[] = [
		{ id: 'traditional', label: 'Traditional', dimensions: '100 × 40 yards', description: 'NIRSA 7v7 field with four 20-yard zones.' },
		{ id: 'four-v-four', label: '4v4', dimensions: '60 × 30 yards', description: 'Two 20-yard playing zones and 10-yard end zones.' },
		{ id: 'unified', label: 'Unified', dimensions: '60 × 25 yards', description: 'SONA/NIRSA Unified field with 5-yard no-run zones.' }
	];
	const fieldToggleOptions: {
		key: keyof Pick<
			PlayBuilderFieldSettings,
			| 'showYardNumbers'
			| 'showGoalLetters'
			| 'showEndZoneText'
			| 'showPylons'
			| 'showHashes'
			| 'showThreeYardMarker'
			| 'showTenYardMarker'
			| 'showFourteenYardX'
			| 'showThirtyYardMarker'
			| 'showNoRunZoneText'
			| 'showTeamBoxes'
		>;
		label: string;
		description: string;
		fieldTypes: PlayBuilderFieldType[];
	}[] = [
		{
			key: 'showYardNumbers',
			label: '20 and 40 Yard Numbers',
			description: 'Show the traditional field numbers on both sidelines.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showYardNumbers',
			label: '20-Yard Midfield Number',
			description: 'Show the 20-yard midfield number on both sidelines.',
			fieldTypes: ['four-v-four']
		},
		{
			key: 'showGoalLetters',
			label: 'Goal Letters',
			description: 'Show the G labels immediately inside each goal line.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showEndZoneText',
			label: 'End Zone Text',
			description: 'Show the vertical END ZONE labels.',
			fieldTypes: ['traditional', 'four-v-four', 'unified']
		},
		{
			key: 'showPylons',
			label: 'End Zone Pylons',
			description: 'Show pylons at the end-line and goal-line corners.',
			fieldTypes: ['traditional', 'four-v-four', 'unified']
		},
		{
			key: 'showHashes',
			label: 'Hash Marks and Pylons',
			description: 'Show field hashes and their matching pylons behind the end zones.',
			fieldTypes: ['traditional', 'four-v-four']
		},
		{
			key: 'showThreeYardMarker',
			label: '3-Yard Try Line',
			description: 'Show the short Try lines three yards from each goal line.',
			fieldTypes: ['traditional', 'four-v-four']
		},
		{
			key: 'showTenYardMarker',
			label: '10-Yard Try Line',
			description: 'Show the short Try lines ten yards from each goal line.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showTenYardMarker',
			label: '10-Yard X',
			description: 'Show the 10-yard X on each half of the 4v4 field.',
			fieldTypes: ['four-v-four']
		},
		{
			key: 'showFourteenYardX',
			label: '14-Yard X',
			description: 'Show each X used for the traditional starting spot.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showFourteenYardX',
			label: '5-Yard X',
			description: 'Show each X used for the Unified starting spot.',
			fieldTypes: ['unified']
		},
		{
			key: 'showThirtyYardMarker',
			label: '30-Yard Marker',
			description: 'Show the short 30-yard marks near midfield.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showNoRunZoneText',
			label: 'No-Run Zone Text',
			description: 'Label each shaded Unified no-run zone.',
			fieldTypes: ['unified']
		},
		{
			key: 'showTeamBoxes',
			label: 'Team Boxes',
			description: 'Show the labeled team boxes outside both sidelines.',
			fieldTypes: ['traditional', 'four-v-four']
		}
	];
	$: fieldLayout = fieldLayouts[fieldSettings.fieldType];
	$: fieldPalette = fieldColorOptions.find((option) => option.id === fieldSettings.fieldColor) ?? fieldColorOptions[0];
	$: currentFieldDefaults = { ...DEFAULT_PLAY_BUILDER_FIELD_SETTINGS, fieldType: fieldSettings.fieldType };
	$: fieldSettingsAreDefault = JSON.stringify(fieldSettings) === JSON.stringify(currentFieldDefaults);
	$: fieldWidth = Math.min(fieldMaxWidth, fieldMaxHeight * (fieldLayout.totalYards / fieldLayout.widthYards));
	$: fieldHeight = fieldWidth * (fieldLayout.widthYards / fieldLayout.totalYards);
	$: fieldLeft = (1000 - fieldWidth) / 2;
	$: fieldRight = fieldLeft + fieldWidth;
	$: fieldTop = (484 - fieldHeight) / 2;
	$: fieldBottom = fieldTop + fieldHeight;
	$: fieldWatermarkAngle = -(Math.atan2(fieldHeight, fieldWidth) * 180) / Math.PI;
	const xForYards = (yards: number) => fieldLeft + yards * (fieldWidth / fieldLayout.totalYards);
	$: fieldSnapXs = [
		...fieldLayout.zoneLines,
		...fieldLayout.threeYardMarkers,
		...fieldLayout.tenYardMarkers,
		...fieldLayout.tenYardXs,
		...fieldLayout.fourteenYardXs,
		...fieldLayout.thirtyYardMarkers,
		...fieldLayout.noRunLines
	].map(xForYards);
	const placementSnapThreshold = 10;
	const clampPoint = ({ x, y }: Point): Point => ({
		x: Math.max(fieldLeft, Math.min(fieldRight, x)),
		y: Math.max(fieldTop, Math.min(fieldBottom, y))
	});
	const isPointOnField = ({ x, y }: Point) => x >= fieldLeft && x <= fieldRight && y >= fieldTop && y <= fieldBottom;
	const pointFromEvent = (event: PointerEvent) => {
		const rect = svg.getBoundingClientRect();
		return clampPoint({
			x: ((event.clientX - rect.left) / rect.width) * 1000,
			y: ((event.clientY - rect.top) / rect.height) * 484
		});
	};
	const canvasPointFromEvent = (event: PointerEvent): Point => {
		const rect = svg.getBoundingClientRect();
		return {
			x: Math.max(0, Math.min(1000, ((event.clientX - rect.left) / rect.width) * 1000)),
			y: Math.max(0, Math.min(484, ((event.clientY - rect.top) / rect.height) * 484))
		};
	};
	const snapStraightDrawPoint = (start: Point, point: Point): Point => {
		const dx = point.x - start.x;
		const dy = point.y - start.y;
		const distance = Math.hypot(dx, dy);
		if (distance === 0) return point;

		const angleStep = Math.PI / 4;
		const angle = Math.round(Math.atan2(dy, dx) / angleStep) * angleStep;
		const directionX = Math.cos(angle);
		const directionY = Math.sin(angle);
		let maximumDistance = Number.POSITIVE_INFINITY;
		if (directionX > 0) maximumDistance = Math.min(maximumDistance, (1000 - start.x) / directionX);
		else if (directionX < 0) maximumDistance = Math.min(maximumDistance, -start.x / directionX);
		if (directionY > 0) maximumDistance = Math.min(maximumDistance, (484 - start.y) / directionY);
		else if (directionY < 0) maximumDistance = Math.min(maximumDistance, -start.y / directionY);
		const constrainedDistance = Math.min(distance, maximumDistance);

		return {
			x: start.x + directionX * constrainedDistance,
			y: start.y + directionY * constrainedDistance
		};
	};
	const sceneSnapshot = (): Scene => ({
		markers: markers.map((marker) => ({ ...marker })),
		paths: paths.map((path) => ({ ...path, start: { ...path.start }, end: { ...path.end } })),
		guides: guides.map((guide) => ({ ...guide })),
		freeStrokes: freeStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })),
		layerOrder: layerOrder.map((layer) => ({ ...layer }))
	});
	const clearEditorState = () => {
		editingMarkerId = null;
		editingGuideId = null;
		editingPathId = null;
	};
	const clearDeleteState = () => {
		deleteTarget = null;
		deletePosition = null;
	};
	const applyScene = (scene: Scene) => {
		clearEditorState();
		clearDeleteState();
		drawing = null;
		activeFreeStroke = null;
		dragTarget = null;
		erasingFreeStrokes = false;
		eraseHistorySaved = false;
		lastErasePoint = null;
		markers = scene.markers.map((marker) => ({ ...marker }));
		paths = scene.paths.map((path) => ({ ...path, start: { ...path.start }, end: { ...path.end } }));
		guides = scene.guides.map((guide) => ({ ...guide }));
		freeStrokes = scene.freeStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) }));
		layerOrder = scene.layerOrder.map((layer) => ({ ...layer }));
		syncLayerDom();
	};
	const cloneScene = (scene: Scene): Scene => ({
		markers: scene.markers.map((marker) => ({ ...marker })),
		paths: scene.paths.map((path) => ({ ...path, start: { ...path.start }, end: { ...path.end } })),
		guides: scene.guides.map((guide) => ({ ...guide })),
		freeStrokes: scene.freeStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) })),
		layerOrder: scene.layerOrder.map((layer) => ({ ...layer }))
	});
	const maxSceneId = (scene: Scene) =>
		Math.max(0, ...[...scene.markers, ...scene.paths, ...scene.guides, ...scene.freeStrokes].map((item) => item.id));
	const builderSnapshot = (): BuilderState => ({
		plays: playEntries.map((play, index) => ({
			...play,
			scene: cloneScene(index === activePlayIndex ? sceneSnapshot() : play.scene),
			settings: { ...(index === activePlayIndex ? fieldSettings : play.settings) }
		})),
		activePlayId: playEntries[activePlayIndex]?.id ?? playEntries[0].id,
		nextPlayEntryId,
		nextPlayNumber
	});
	const pushBuilderState = (stack: BuilderState[], state: BuilderState) => [...stack.slice(-29), state];
	const saveHistory = () => {
		history = pushBuilderState(history, builderSnapshot());
		future = [];
	};
	const applyBuilderState = (state: BuilderState) => {
		playEntries = state.plays.map((play) => ({ ...play, scene: cloneScene(play.scene), settings: { ...play.settings } }));
		nextPlayEntryId = state.nextPlayEntryId;
		nextPlayNumber = state.nextPlayNumber;
		editingPlayId = null;
		const index = Math.max(
			0,
			playEntries.findIndex((play) => play.id === state.activePlayId)
		);
		activePlayIndex = index;
		fieldSettings = { ...playEntries[index].settings };
		nextId = maxSceneId(playEntries[index].scene) + 1;
		applyScene(playEntries[index].scene);
		void tick().then(() => {
			playStripElement
				?.querySelector<HTMLElement>(`[data-play-id="${playEntries[index].id}"]`)
				?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
	};
	const storeActivePlayState = () => {
		playEntries = playEntries.map((play, index) =>
			index === activePlayIndex ? { ...play, scene: sceneSnapshot(), settings: { ...fieldSettings } } : play
		);
	};
	const loadPlayAtIndex = (index: number) => {
		const play = playEntries[index];
		if (!play) return;
		activePlayIndex = index;
		fieldSettings = { ...play.settings };
		nextId = maxSceneId(play.scene) + 1;
		applyScene(play.scene);
		void tick().then(() => {
			playStripElement?.querySelector<HTMLElement>(`[data-play-id="${play.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
	};
	const switchPlay = (playId: number) => {
		if (dismissEditorForAction() || suppressNextClick) return;
		const nextIndex = playEntries.findIndex((play) => play.id === playId);
		if (nextIndex < 0 || nextIndex === activePlayIndex) return;
		storeActivePlayState();
		editingPlayId = null;
		loadPlayAtIndex(nextIndex);
	};
	const uniquePlayName = (base: string) => {
		const existing = new Set(playEntries.map((play) => play.name.toLowerCase()));
		if (!existing.has(base.toLowerCase())) return base.slice(0, PLAY_BUILDER_PLAY_NAME_MAX_LENGTH);
		for (let suffix = 2; suffix < 100; suffix += 1) {
			const suffixText = ` ${suffix}`;
			const candidate = `${base.slice(0, PLAY_BUILDER_PLAY_NAME_MAX_LENGTH - suffixText.length)}${suffixText}`;
			if (!existing.has(candidate.toLowerCase())) return candidate;
		}
		return `Play ${nextPlayNumber}`;
	};
	const addPlay = () => {
		if (dismissEditorForAction() || suppressNextClick || playEntries.length >= PLAY_BUILDER_MAX_PLAYS) return;
		saveHistory();
		storeActivePlayState();
		const play: PlayEntry = {
			id: nextPlayEntryId++,
			name: uniquePlayName(`Play ${nextPlayNumber++}`),
			scene: blankScene(),
			settings: { ...fieldSettings }
		};
		playEntries = [...playEntries, play];
		loadPlayAtIndex(playEntries.length - 1);
	};
	const openPlayMenu = async (event: MouseEvent, playId: number) => {
		event.preventDefault();
		event.stopPropagation();
		const index = playEntries.findIndex((play) => play.id === playId);
		if (index < 0) return;
		if (index !== activePlayIndex) {
			storeActivePlayState();
			loadPlayAtIndex(index);
		}
		editingPlayId = playId;
		playNameValue = playEntries[index].name;
		const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const stripRect = playStripElement.getBoundingClientRect();
		playMenuLeft = Math.max(0, Math.min(buttonRect.left - stripRect.left, stripRect.width - 176));
		await tick();
		playNameInput?.focus();
		playNameInput?.select();
	};
	const renamePlay = () => {
		const name = playNameValue.trim();
		if (editingPlayId === null || !name) return;
		const renamedValue = name.slice(0, PLAY_BUILDER_PLAY_NAME_MAX_LENGTH);
		const existingPlay = playEntries.find((play) => play.id === editingPlayId);
		if (!existingPlay || existingPlay.name === renamedValue) {
			editingPlayId = null;
			return;
		}
		saveHistory();
		playEntries = playEntries.map((play) => (play.id === editingPlayId ? { ...play, name: renamedValue } : play));
		editingPlayId = null;
	};
	const duplicatePlay = () => {
		if (editingPlayId === null || playEntries.length >= PLAY_BUILDER_MAX_PLAYS) return;
		saveHistory();
		storeActivePlayState();
		const sourceIndex = playEntries.findIndex((play) => play.id === editingPlayId);
		const source = playEntries[sourceIndex];
		if (!source) return;
		const duplicate: PlayEntry = {
			id: nextPlayEntryId++,
			name: uniquePlayName(`${source.name} Copy`),
			scene: cloneScene(source.scene),
			settings: { ...source.settings }
		};
		playEntries = [...playEntries.slice(0, sourceIndex + 1), duplicate, ...playEntries.slice(sourceIndex + 1)];
		editingPlayId = null;
		loadPlayAtIndex(sourceIndex + 1);
	};
	const deletePlay = () => {
		if (editingPlayId === null || playEntries.length <= 1) return;
		saveHistory();
		storeActivePlayState();
		const deleteIndex = playEntries.findIndex((play) => play.id === editingPlayId);
		if (deleteIndex < 0) return;
		const previousActiveId = playEntries[activePlayIndex]?.id;
		playEntries = playEntries.filter((play) => play.id !== editingPlayId);
		editingPlayId = null;
		const retainedActiveIndex = playEntries.findIndex((play) => play.id === previousActiveId);
		loadPlayAtIndex(retainedActiveIndex >= 0 ? retainedActiveIndex : Math.min(deleteIndex, playEntries.length - 1));
	};
	const undo = () => {
		const previous = history.at(-1);
		if (!previous) return;
		future = pushBuilderState(future, builderSnapshot());
		history = history.slice(0, -1);
		applyBuilderState(previous);
	};
	const redo = () => {
		const next = future.at(-1);
		if (!next) return;
		history = pushBuilderState(history, builderSnapshot());
		future = future.slice(0, -1);
		applyBuilderState(next);
	};
	const clear = () => {
		if (markers.length === 0 && paths.length === 0 && guides.length === 0 && freeStrokes.length === 0) return;
		saveHistory();
		clearEditorState();
		clearDeleteState();
		markers = [];
		paths = [];
		guides = [];
		freeStrokes = [];
		activeFreeStroke = null;
		layerOrder = [];
	};
	const clearFreeDrawings = () => {
		if (freeStrokes.length === 0 && !activeFreeStroke) return;
		if (freeStrokes.length > 0) saveHistory();
		clearEditorState();
		clearDeleteState();
		freeStrokes = [];
		activeFreeStroke = null;
	};
	const handleBeforeUnload = (event: BeforeUnloadEvent) => {
		if (!hasUnsavedChanges) return;
		event.preventDefault();
		event.returnValue = '';
	};
	const currentSerializedDocument = () =>
		encodePlayBuilderDocument({
			activePlayIndex,
			plays: playEntries.map((play, index) => ({
				name: play.name,
				scene: index === activePlayIndex ? sceneSnapshot() : play.scene,
				settings: index === activePlayIndex ? fieldSettings : play.settings
			}))
		});
	const clearActionMessageTimer = () => {
		if (actionMessageTimer !== null) clearTimeout(actionMessageTimer);
		actionMessageTimer = null;
	};
	const showActionMessage = (message: string, duration = 10_000) => {
		clearActionMessageTimer();
		actionMessage = message;
		actionMessageTimer = setTimeout(() => {
			actionMessage = '';
			actionMessageTimer = null;
		}, duration);
	};
	const showPendingActionMessage = (message: string) => {
		clearActionMessageTimer();
		actionMessage = message;
	};
	const createSavedPlay = async () => {
		const response = await fetch('/api/play-builders', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ document: currentSerializedDocument() })
		});
		const result = (await response.json()) as { id?: string; editToken?: string; message?: string };
		if (!response.ok || !result.id || !result.editToken) throw new Error(result.message || 'Unable to save play.');
		sessionStorage.setItem(`play-builder-edit:${result.id}`, result.editToken);
		return result.id;
	};
	const savePlay = async (): Promise<boolean> => {
		if (actionInProgress) return false;
		actionInProgress = 'save';
		showPendingActionMessage('Saving…');
		try {
			const editToken = savedPlayId ? sessionStorage.getItem(`play-builder-edit:${savedPlayId}`) : null;
			if (savedPlayId && editToken) {
				const response = await fetch(`/api/play-builders/${savedPlayId}`, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ document: currentSerializedDocument(), editToken })
				});
				if (response.ok) {
					savedSceneKey = JSON.stringify(currentSerializedDocument());
					showActionMessage('Saved');
					return true;
				}
				if (response.status !== 403) {
					const result = (await response.json()) as { message?: string };
					throw new Error(result.message || 'Unable to save play.');
				}
			}
			const id = await createSavedPlay();
			savedSceneKey = JSON.stringify(currentSerializedDocument());
			showActionMessage('Saved');
			sessionStorage.setItem('play-builder-action-message', JSON.stringify({ message: 'Saved', expiresAt: Date.now() + 10_000 }));
			await goto(`/play-builder/${id}`, { replaceState: true, keepFocus: true, noScroll: true });
			return true;
		} catch (error) {
			showActionMessage(error instanceof Error ? error.message : 'Unable to save play.');
			return false;
		} finally {
			actionInProgress = null;
		}
	};
	const exportImage = async (format: 'png' | 'pdf') => {
		if (actionInProgress) return;
		actionInProgress = format;
		showPendingActionMessage(`Preparing ${format.toUpperCase()}…`);
		let restorePlayId: number | null = null;
		try {
			if (format === 'png') await exportPlayBuilderPng(svg);
			else {
				storeActivePlayState();
				restorePlayId = playEntries[activePlayIndex].id;
				const canvases: HTMLCanvasElement[] = [];
				for (let index = 0; index < playEntries.length; index += 1) {
					loadPlayAtIndex(index);
					await tick();
					await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
					canvases.push(await renderPlayBuilderCanvas(svg, { pdfOutlines: true }));
				}
				await exportPlayBuilderPdf(canvases);
			}
			showActionMessage(`${format.toUpperCase()} exported`);
		} catch (error) {
			showActionMessage(error instanceof Error ? error.message : 'Unable to export play.');
		} finally {
			if (restorePlayId !== null) {
				const restoreIndex = playEntries.findIndex((play) => play.id === restorePlayId);
				if (restoreIndex >= 0) {
					loadPlayAtIndex(restoreIndex);
					await tick();
				}
			}
			actionInProgress = null;
		}
	};
	const copyShareUrl = async () => {
		if (copyFeedbackTimer) {
			clearTimeout(copyFeedbackTimer);
			copyFeedbackTimer = null;
		}
		copyConfirmed = false;
		const url = window.location.href;
		let copied = false;
		if (navigator.clipboard?.writeText) {
			try {
				await Promise.race([
					navigator.clipboard.writeText(url),
					new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Clipboard timed out.')), 1200))
				]);
				copied = true;
			} catch {
				copied = false;
			}
		}
		if (!copied) {
			const input = document.createElement('textarea');
			input.value = url;
			input.setAttribute('readonly', '');
			input.style.position = 'fixed';
			input.style.opacity = '0';
			document.body.appendChild(input);
			input.select();
			copied = document.execCommand('copy');
			input.remove();
		}
		if (copied) {
			copyConfirmed = true;
			copyFeedbackTimer = setTimeout(() => {
				copyConfirmed = false;
				copyFeedbackTimer = null;
			}, 3_000);
		} else showActionMessage('Unable to copy link');
	};
	const playerKinds: PlayerKind[] = ['team-a', 'team-k', 'team-b', 'team-r'];
	const isMarkerTool = (value: Tool): value is MarkerKind => [...playerKinds, 'ball', 'flag', 'deflag', 'event'].includes(value as MarkerKind);
	const isTeamMarker = (marker: FieldMarker): marker is FieldMarker & { kind: PlayerKind } => playerKinds.includes(marker.kind as PlayerKind);
	const isEditableMarker = (marker: FieldMarker) => isTeamMarker(marker) || ['event', 'ball', 'flag', 'deflag'].includes(marker.kind);
	const isPathTool = (value: Tool): value is Exclude<PathKind, 'line'> => ['run', 'pass', 'kick'].includes(value);
	const isArrowPath = (value: Tool | PathKind): value is Exclude<PathKind, 'line'> => ['run', 'pass', 'kick'].includes(value);
	const isGuideTool = (value: Tool): value is 'line-of-scrimmage' | 'line-to-gain' => ['line-of-scrimmage', 'line-to-gain'].includes(value);
	const hasLength = (start: Point, end: Point) => Math.hypot(end.x - start.x, end.y - start.y) > 12;
	const previewPathFrom = (start: Point) => ({
		start,
		end: {
			x: start.x + (start.x <= fieldRight - 70 ? 70 : -70),
			y: start.y
		}
	});
	const drawingPathEnd = (activeDrawing: { start: Point; pointerStart: Point }, pointer: Point): Point => {
		const dx = pointer.x - activeDrawing.pointerStart.x;
		const dy = pointer.y - activeDrawing.pointerStart.y;
		const pointerDistance = Math.hypot(dx, dy);
		if (pointerDistance < 4) return previewPathFrom(activeDrawing.start).end;

		const length = Math.max(70, pointerDistance);
		return clampPoint({
			x: activeDrawing.start.x + (dx / pointerDistance) * length,
			y: activeDrawing.start.y + (dy / pointerDistance) * length
		});
	};
	const nextPlayerSequence = (kind: PlayerKind) =>
		Math.max(0, ...markers.filter((marker) => marker.kind === kind).map((marker) => marker.sequence ?? 0)) + 1;
	const createMarker = (kind: MarkerKind, point: Point): FieldMarker => {
		if (playerKinds.includes(kind as PlayerKind)) {
			const sequence = nextPlayerSequence(kind as PlayerKind);
			return { id: nextId++, kind, sequence, label: `${kind.slice(-1).toUpperCase()}-${sequence}`, ...point };
		}
		if (kind === 'event') return { id: nextId++, kind, label: 'EVENT', ...point };
		if (kind === 'deflag') return { id: nextId++, kind, color: deflagPlacementColor, ...point };
		return { id: nextId++, kind, ...point };
	};
	const editorLeft = (marker: FieldMarker) => Math.max(10, Math.min(90, marker.x / 10));
	const editorTop = (marker: FieldMarker) => Math.max(12, Math.min(88, (marker.y / 484) * 100));
	const guideColor = (color: GuideColor) => guideColors.find((option) => option.id === color)?.value ?? '#facc15';
	const drawingColor = (color: GuideColor) => freeDrawColors.find((option) => option.id === color)?.value ?? guideColor(color);
	const deflagColors = freeDrawColors.filter((option) => !['white', 'gray', 'black'].includes(option.id));
	const deflagImage = (color: GuideColor | undefined) =>
		color && color !== 'red' && deflagColors.some((option) => option.id === color) ? `/images/flag-belt-${color}.png` : '/images/flag-belt.png';
	const eventWidth = (label = 'EVENT') => Math.max(eventTagWidth, Math.min(154, label.length * 6.6 + 16));
	const penaltyLabelLines = (label = '') => {
		const maxCharacters = 12;
		const lines: string[] = [];
		let currentLine = '';
		for (const originalWord of label.trim().split(/\s+/).filter(Boolean)) {
			let word = originalWord;
			if (currentLine && `${currentLine} ${word}`.length <= maxCharacters) {
				currentLine = `${currentLine} ${word}`;
				continue;
			}
			if (currentLine) {
				lines.push(currentLine);
				currentLine = '';
			}
			while (word.length > maxCharacters) {
				lines.push(word.slice(0, maxCharacters));
				word = word.slice(maxCharacters);
			}
			currentLine = word;
		}
		if (currentLine) lines.push(currentLine);
		return lines;
	};
	const markerLabelMaxLength = (marker: FieldMarker) =>
		isTeamMarker(marker) ? 4 : marker.kind === 'event' ? 20 : ['ball', 'flag', 'deflag'].includes(marker.kind) ? 24 : 0;
	const markerDescriptionName = (marker: FieldMarker) =>
		marker.kind === 'ball' ? 'Football description' : marker.kind === 'deflag' ? 'Flag belt description' : 'Penalty description';
	const markerDescriptionPlaceholder = (marker: FieldMarker) =>
		marker.kind === 'ball' ? 'Football Note' : marker.kind === 'deflag' ? 'Flag Belt Note' : 'Penalty';
	const markerDescriptionY = (marker: FieldMarker) =>
		marker.y + (marker.kind === 'ball' ? footballSize : marker.kind === 'deflag' ? deflagSize : foulFlagSize) / 2 + 9;
	const guideDash = (style: GuideStyle) => (style === 'dashed' ? '16 10' : style === 'dotted' ? '2 10' : undefined);
	const renderedGuideColor = (guide: FieldGuide) => guideColor(guide.color);
	const renderedGuideDash = (guide: FieldGuide) => guideDash(guide.style);
	const guideLabel = (guide: FieldGuide) =>
		guide.kind === 'line-of-scrimmage' ? 'Line of Scrimmage' : guide.kind === 'line-to-gain' ? 'Line to Gain' : 'Custom cross-field line';
	const defaultGuideColor = (guideTool: 'line-of-scrimmage' | 'line-to-gain'): GuideColor => (guideTool === 'line-of-scrimmage' ? 'white' : 'yellow');
	const defaultGuideStyle = (guideTool: 'line-of-scrimmage' | 'line-to-gain'): GuideStyle => (guideTool === 'line-of-scrimmage' ? 'dashed' : 'solid');
	const syncLayerDom = async () => {
		await tick();
		if (!svg) return;
		for (const layer of layerOrder.filter((item) => item.type === 'guide')) {
			const element = svg.querySelector<SVGGElement>(`[data-layer-type="${layer.type}"][data-layer-id="${layer.id}"]`);
			if (element) svg.appendChild(element);
		}
		const fieldXLayer = svg.querySelector<SVGGElement>('[data-field-x-layer]');
		if (fieldXLayer) svg.appendChild(fieldXLayer);
		const footballMarkerIds = new Set(markers.filter((marker) => marker.kind === 'ball').map((marker) => marker.id));
		for (const layer of layerOrder.filter((item) => item.type !== 'guide' && !(item.type === 'marker' && footballMarkerIds.has(item.id)))) {
			const element = svg.querySelector<SVGGElement>(`[data-layer-type="${layer.type}"][data-layer-id="${layer.id}"]`);
			if (element) svg.appendChild(element);
		}
		const fixtureLayer = svg.querySelector<SVGGElement>('[data-field-fixtures-layer]');
		if (fixtureLayer) svg.appendChild(fixtureLayer);
		for (const layer of layerOrder.filter((item) => item.type === 'marker' && footballMarkerIds.has(item.id))) {
			const element = svg.querySelector<SVGGElement>(`[data-layer-type="marker"][data-layer-id="${layer.id}"]`);
			if (element) svg.appendChild(element);
		}
		const drawingLayer = svg.querySelector<SVGGElement>('[data-free-drawing-layer]');
		if (drawingLayer) svg.appendChild(drawingLayer);
	};
	const raiseLayer = (type: LayerType, id: number) => {
		layerOrder = [...layerOrder.filter((layer) => layer.type !== type || layer.id !== id), { type, id }];
		syncLayerDom();
	};
	const removeLayer = (type: LayerType, id: number) => {
		layerOrder = layerOrder.filter((layer) => layer.type !== type || layer.id !== id);
	};
	const clearPlacementSnap = () => {
		if (placementSnapTimer !== null) clearTimeout(placementSnapTimer);
		placementSnapTimer = null;
		placementSnapX = null;
	};
	const nearestSnapX = (candidates: number[], pointerX: number) => {
		if (candidates.length === 0) return null;
		const nearest = candidates.reduce((closest, candidate) => (Math.abs(candidate - pointerX) < Math.abs(closest - pointerX) ? candidate : closest));
		return Math.abs(nearest - pointerX) <= placementSnapThreshold ? nearest : null;
	};
	const schedulePlacementSnap = (point: Point, instant = false) => {
		clearPlacementSnap();
		if ((!isGuideTool(tool) && tool !== 'ball') || hoveringElement || drawing || dragTarget || activeFreeStroke) return;
		const priorityCandidates = isGuideTool(tool)
			? markers.filter((marker) => marker.kind === 'ball').map((marker) => marker.x)
			: guides.map((guide) => guide.x);
		const targetX = nearestSnapX(priorityCandidates, point.x) ?? nearestSnapX(fieldSnapXs, point.x);
		if (targetX === null) return;
		if (instant) {
			placementSnapX = targetX;
			return;
		}
		placementSnapTimer = setTimeout(() => {
			placementSnapTimer = null;
			if ((!isGuideTool(tool) && tool !== 'ball') || hoveringElement || drawing || dragTarget || activeFreeStroke) return;
			placementSnapX = targetX;
		}, 1000);
	};
	const scheduleDragSnap = (target: DragTarget, pointerX: number, instant = false) => {
		clearPlacementSnap();
		if (!target.moved || (target.type !== 'guide' && target.type !== 'marker')) return;
		const draggedMarker = target.type === 'marker' ? markers.find((marker) => marker.id === target.id) : undefined;
		if (target.type === 'marker' && draggedMarker?.kind !== 'ball') return;
		const priorityCandidates =
			target.type === 'guide' ? markers.filter((marker) => marker.kind === 'ball').map((marker) => marker.x) : guides.map((guide) => guide.x);
		const targetX = nearestSnapX(priorityCandidates, pointerX) ?? nearestSnapX(fieldSnapXs, pointerX);
		if (targetX === null) return;
		const targetType = target.type;
		const targetId = target.id;
		const applySnap = () => {
			if (!dragTarget?.moved || dragTarget.type !== targetType || dragTarget.id !== targetId) return;
			placementSnapX = targetX;
			if (targetType === 'guide') {
				guides = guides.map((guide) => (guide.id === targetId ? { ...guide, x: targetX } : guide));
				return;
			}
			const snappedPoint = markers.find((marker) => marker.id === targetId);
			if (!snappedPoint || snappedPoint.kind !== 'ball') return;
			markers = markers.map((marker) => (marker.id === targetId ? { ...marker, x: targetX } : marker));
			paths = paths.map((path) => (path.startMarkerId === targetId ? { ...path, start: { ...path.start, x: targetX } } : path));
		};
		if (instant) {
			applySnap();
			return;
		}
		placementSnapTimer = setTimeout(() => {
			placementSnapTimer = null;
			applySnap();
		}, 1000);
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
	const pathStart = (path: FieldPath): Point => {
		const marker = path.startMarkerId === undefined ? undefined : markers.find((item) => item.id === path.startMarkerId);
		return marker ? { x: marker.x, y: marker.y } : path.start;
	};
	const setDeleteTargetAtPointer = (target: SelectedTarget, event: PointerEvent) => {
		const point = pointFromEvent(event);
		deleteTarget = target;
		deletePosition = {
			x: Math.max(fieldLeft + 8, Math.min(fieldRight - 42, point.x + 18)),
			y: Math.max(fieldTop + 18, Math.min(fieldBottom - 8, point.y - 18))
		};
	};
	const deleteHoveredElement = () => {
		if (!deleteTarget) return;
		saveHistory();
		removeElementTarget(deleteTarget);
		clearDeleteState();
	};
	const removeElementTarget = (target: SelectedTarget) => {
		if (target.type === 'marker') markers = markers.filter((item) => item.id !== target.id);
		if (target.type === 'path') paths = paths.filter((item) => item.id !== target.id);
		if (target.type === 'guide') guides = guides.filter((item) => item.id !== target.id);
		removeLayer(target.type, target.id);
	};
	const commitMarkerEditor = () => {
		if (!editingMarker) return;
		const label = editValue.trim();
		const optionalLabel = ['ball', 'flag', 'deflag'].includes(editingMarker.kind);
		const nextLabel = optionalLabel ? label || undefined : label;
		if (nextLabel !== editingMarker.label && (nextLabel || optionalLabel)) {
			saveHistory();
			markers = markers.map((marker) => (marker.id === editingMarkerId ? { ...marker, label: nextLabel } : marker));
		}
		editingMarkerId = null;
	};
	const updateDeflagColor = (color: GuideColor) => {
		if (!editingMarker || editingMarker.kind !== 'deflag') return;
		const markerId = editingMarker.id;
		const nextLabel = editValue.trim() || undefined;
		deflagPlacementColor = color;
		if ((editingMarker.color ?? 'red') !== color || editingMarker.label !== nextLabel) {
			saveHistory();
			markers = markers.map((marker) => (marker.id === markerId ? { ...marker, color, label: nextLabel } : marker));
		}
		editingMarkerId = null;
	};
	const commitGuideEditor = () => {
		editingGuideId = null;
	};
	const commitPathEditor = () => {
		editingPathId = null;
	};
	const updateGuideColor = (color: GuideColor) => {
		if (editingGuide && editingGuide.color === color) return;
		if (editingPath && editingPath.color === color) return;
		if (!editingGuide && !editingPath) return;
		saveHistory();
		guideEditColor = color;
		if (editingGuide)
			guides = guides.map((guide) =>
				guide.id === editingGuideId ? { ...guide, color, kind: guide.kind === 'line-of-scrimmage' ? 'custom' : guide.kind } : guide
			);
		if (editingPath) paths = paths.map((path) => (path.id === editingPathId ? { ...path, color } : path));
	};
	const updateGuideStyle = (style: GuideStyle) => {
		if (editingGuide && editingGuide.style === style) return;
		if (editingPath && editingPath.style === style) return;
		if (!editingGuide && !editingPath) return;
		saveHistory();
		guideEditStyle = style;
		if (editingGuide)
			guides = guides.map((guide) =>
				guide.id === editingGuideId ? { ...guide, style, kind: guide.kind === 'line-of-scrimmage' ? 'custom' : guide.kind } : guide
			);
		if (editingPath) paths = paths.map((path) => (path.id === editingPathId ? { ...path, style } : path));
	};
	const deleteEditingLine = () => {
		if (!editingGuide && !editingPath) return;
		saveHistory();
		if (editingGuide) guides = guides.filter((guide) => guide.id !== editingGuideId);
		if (editingPath) paths = paths.filter((path) => path.id !== editingPathId);
		if (editingGuideId !== null) removeLayer('guide', editingGuideId);
		if (editingPathId !== null) removeLayer('path', editingPathId);
		editingGuideId = null;
		editingPathId = null;
		clearDeleteState();
	};
	const commitActiveEditor = () => {
		if (editingMarkerId !== null) commitMarkerEditor();
		else if (editingGuideId !== null) commitGuideEditor();
		else if (editingPathId !== null) commitPathEditor();
	};
	const startEditingMarker = async (event: Event, marker: FieldMarker) => {
		if (!isEditableMarker(marker)) return;
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = marker.id;
		editingGuideId = null;
		editingPathId = null;
		editValue = marker.label ?? '';
		await tick();
		editInput?.focus();
		editInput?.select();
	};
	const startEditingGuide = (event: Event, guide: FieldGuide) => {
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = guide.id;
		editingPathId = null;
		guideEditColor = guide.color;
		guideEditStyle = guide.style;
	};
	const startEditingPath = (event: Event, path: FieldPath) => {
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = null;
		editingPathId = path.id;
		guideEditColor = path.color;
		guideEditStyle = path.style;
	};
	const handleEditorKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || (editingMarkerId === null && editingGuideId === null && editingPathId === null)) return;
		event.preventDefault();
		clearEditorState();
	};
	const handleGlobalKeydown = (event: KeyboardEvent) => {
		if (showNewPrompt) {
			if (event.key === 'Escape' && actionInProgress !== 'save') {
				event.preventDefault();
				showNewPrompt = false;
			}
			return;
		}
		if (showSettings) {
			if (event.key === 'Escape') {
				event.preventDefault();
				showSettings = false;
			}
			return;
		}
		if (showHelp) {
			if (event.key === 'Escape') {
				event.preventDefault();
				showHelp = false;
			}
			return;
		}
		if (editingPlayId !== null) {
			if (event.key === 'Escape') {
				event.preventDefault();
				editingPlayId = null;
			}
			return;
		}
		if (editingMarkerId !== null || editingGuideId !== null || editingPathId !== null) {
			handleEditorKeydown(event);
			return;
		}
		const target = event.target as HTMLElement | null;
		if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
		if (tool === 'free-draw' && !event.ctrlKey && !event.metaKey && !event.altKey) {
			if (!event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
				event.preventDefault();
				const currentIndex = Math.max(
					0,
					freeDrawColors.findIndex((option) => option.id === freeDrawColor)
				);
				const direction = event.key === 'ArrowRight' ? 1 : -1;
				freeDrawColor = freeDrawColors[(currentIndex + direction + freeDrawColors.length) % freeDrawColors.length].id;
				freeDrawMode = 'draw';
				return;
			}
			if (!event.shiftKey && event.key.toLowerCase() === 'c') {
				event.preventDefault();
				clearFreeDrawings();
				return;
			}
			const colorIndex = event.key === '0' ? 9 : /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
			if (!event.shiftKey && colorIndex >= 0 && freeDrawColors[colorIndex]) {
				event.preventDefault();
				freeDrawColor = freeDrawColors[colorIndex].id;
				freeDrawMode = 'draw';
				return;
			}
		}
		if ((event.ctrlKey || event.metaKey) && !event.altKey) {
			const key = event.key.toLowerCase();
			if (!event.shiftKey && key === 's') {
				event.preventDefault();
				if (actionInProgress === null) void savePlay();
				return;
			}
			if (!event.shiftKey && key === 'n') {
				event.preventDefault();
				if (actionInProgress === null) void requestNewBoard();
				return;
			}
			if (!event.shiftKey && key === 'c' && savedPlayId) {
				event.preventDefault();
				void copyShareUrl();
				return;
			}
			if (!event.shiftKey && key === 'h') {
				event.preventDefault();
				void openHelp();
				return;
			}
			if ((key === 'z' && event.shiftKey) || (key === 'y' && !event.shiftKey)) {
				if (future.length === 0) return;
				event.preventDefault();
				redo();
				return;
			}
			if (key === 'z' && !event.shiftKey) {
				if (history.length === 0) return;
				event.preventDefault();
				undo();
				return;
			}
		}
		if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'Delete') {
			if (markers.length === 0 && paths.length === 0 && guides.length === 0 && freeStrokes.length === 0) return;
			event.preventDefault();
			clear();
			return;
		}
		if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && event.key === 'Delete' && deleteTarget) {
			event.preventDefault();
			deleteHoveredElement();
			return;
		}
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		const pressedShortcut = `${event.shiftKey ? 'shift+' : ''}${event.key.toLowerCase()}`;
		const selectedTool = tools.find((item) => item.shortcut === pressedShortcut);
		if (!selectedTool) return;
		event.preventDefault();
		selectTool(selectedTool.id);
	};
	const handleDrawColorKeydown = (event: KeyboardEvent, colorIndex: number) => {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		event.stopPropagation();
		const direction = event.key === 'ArrowRight' ? 1 : -1;
		const nextIndex = (colorIndex + direction + freeDrawColors.length) % freeDrawColors.length;
		freeDrawColor = freeDrawColors[nextIndex].id;
		freeDrawMode = 'draw';
		const buttons = (event.currentTarget as HTMLElement | null)?.parentElement?.querySelectorAll<HTMLButtonElement>('[data-draw-color]');
		buttons?.[nextIndex]?.focus();
	};
	const handleWindowPointerDown = (event: PointerEvent) => {
		const target = event.target as Node;
		if (editingPlayId !== null && !playMenuElement?.contains(target)) editingPlayId = null;
		if (deleteTarget && !deleteButtonElement?.contains(target)) clearDeleteState();
		if (editingMarkerId === null && editingGuideId === null && editingPathId === null) return;
		if (editorElement?.contains(target)) return;
		if (target instanceof Element && target.closest('[data-builder-tool]')) {
			commitActiveEditor();
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		suppressNextClick = true;
		commitActiveEditor();
	};
	const handleWindowClick = (event: MouseEvent) => {
		if (!suppressNextClick) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		setTimeout(() => (suppressNextClick = false), 0);
	};
	const dismissEditorForAction = () => {
		if (editingMarkerId === null && editingGuideId === null && editingPathId === null) return false;
		commitActiveEditor();
		suppressNextClick = true;
		setTimeout(() => (suppressNextClick = false), 0);
		return true;
	};
	const selectTool = (nextTool: Tool) => {
		if (suppressNextClick) return;
		if (editingMarkerId !== null || editingGuideId !== null || editingPathId !== null) commitActiveEditor();
		clearDeleteState();
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		tool = nextTool;
	};
	const openHelp = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		showHelp = true;
		await tick();
		helpCloseButton?.focus();
	};
	const openSettings = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		showSettings = true;
		await tick();
		settingsCloseButton?.focus();
	};
	const updateFieldSetting = <Key extends keyof PlayBuilderFieldSettings>(key: Key, value: PlayBuilderFieldSettings[Key]) => {
		if (fieldSettings[key] === value) return;
		saveHistory();
		fieldSettings = { ...fieldSettings, [key]: value };
		clearPlacementSnap();
	};
	const toggleFieldSetting = (
		key: keyof Pick<
			PlayBuilderFieldSettings,
			| 'showYardNumbers'
			| 'showGoalLetters'
			| 'showEndZoneText'
			| 'showPylons'
			| 'showHashes'
			| 'showThreeYardMarker'
			| 'showTenYardMarker'
			| 'showFourteenYardX'
			| 'showThirtyYardMarker'
			| 'showNoRunZoneText'
			| 'showTeamBoxes'
		>
	) => updateFieldSetting(key, !fieldSettings[key]);
	const resetFieldSettings = () => {
		const defaults = { ...defaultPlayBuilderFieldSettings(), fieldType: fieldSettings.fieldType };
		if (JSON.stringify(fieldSettings) === JSON.stringify(defaults)) return;
		saveHistory();
		fieldSettings = defaults;
		clearPlacementSnap();
	};
	const resetToBlankBoard = () => {
		fieldSettings = defaultPlayBuilderFieldSettings();
		playEntries = [{ id: 1, name: 'Play 1', scene: blankScene(), settings: { ...fieldSettings } }];
		activePlayIndex = 0;
		nextPlayEntryId = 2;
		nextPlayNumber = 2;
		applyScene({ markers: [], paths: [], guides: [], freeStrokes: [], layerOrder: [] });
		history = [];
		future = [];
		nextId = 1;
		tool = 'team-a';
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		savedSceneKey = JSON.stringify(
			encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Play 1', scene: blankScene(), settings: { ...fieldSettings } }] })
		);
	};
	const openBlankBoard = async () => {
		showNewPrompt = false;
		const isAlreadyNewBoard = window.location.pathname.replace(/\/$/, '') === '/play-builder' && savedPlayId === null;
		if (isAlreadyNewBoard) {
			resetToBlankBoard();
			return;
		}
		savedSceneKey = currentSceneKey;
		await goto('/play-builder');
	};
	const requestNewBoard = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		clearDeleteState();
		if (!hasUnsavedChanges) {
			await openBlankBoard();
			return;
		}
		showNewPrompt = true;
		await tick();
		newPromptCloseButton?.focus();
	};
	const saveFromNewPrompt = async () => {
		const saved = await savePlay();
		if (saved) showNewPrompt = false;
	};
	const setupDefaultScenario = () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		saveHistory();
		clearEditorState();
		clearDeleteState();
		clearPlacementSnap();
		const setupByFieldType: Record<PlayBuilderFieldType, { lineOfScrimmage: number; lineToGain: number; quarterbackDepth: number }> = {
			traditional: { lineOfScrimmage: 24, lineToGain: 30, quarterbackDepth: 5 },
			'four-v-four': { lineOfScrimmage: 20, lineToGain: 30, quarterbackDepth: 5 },
			unified: { lineOfScrimmage: 15, lineToGain: 30, quarterbackDepth: 5 }
		};
		const setup = setupByFieldType[fieldSettings.fieldType];
		const lineOfScrimmageX = xForYards(setup.lineOfScrimmage);
		const lineToGainX = xForYards(setup.lineToGain);
		const centerY = fieldTop + fieldHeight / 2;
		const quarterbackX = xForYards(setup.lineOfScrimmage - setup.quarterbackDepth);
		const lineOfScrimmage: FieldGuide = {
			id: nextId++,
			kind: 'line-of-scrimmage',
			x: lineOfScrimmageX,
			color: 'white',
			style: 'dashed'
		};
		const lineToGain: FieldGuide = { id: nextId++, kind: 'line-to-gain', x: lineToGainX, color: 'yellow', style: 'solid' };
		const football: FieldMarker = { id: nextId++, kind: 'ball', x: lineOfScrimmageX, y: centerY };
		const quarterback: FieldMarker = { id: nextId++, kind: 'team-a', sequence: 1, label: 'A-1', x: quarterbackX, y: centerY };
		markers = [football, quarterback];
		paths = [];
		guides = [lineOfScrimmage, lineToGain];
		freeStrokes = [];
		activeFreeStroke = null;
		layerOrder = [
			{ type: 'guide', id: lineOfScrimmage.id },
			{ type: 'guide', id: lineToGain.id },
			{ type: 'marker', id: football.id },
			{ type: 'marker', id: quarterback.id }
		];
		tool = 'team-a';
		syncLayerDom();
	};
	const runGuardedAction = (action: () => void) => {
		if (dismissEditorForAction() || suppressNextClick) return;
		action();
	};
	const handleMarkerKeydown = (event: KeyboardEvent, marker: FieldMarker) => {
		if (event.key === 'Enter' || event.key === 'F2') {
			startEditingMarker(event, marker);
			return;
		}
		if (event.key !== 'Delete' && event.key !== 'Backspace') return;
		event.preventDefault();
		deleteTarget = { type: 'marker', id: marker.id };
		deleteHoveredElement();
	};
	const handleGuideKeydown = (event: KeyboardEvent, guide: FieldGuide) => {
		if (event.key === 'Enter' || event.key === 'F2') {
			startEditingGuide(event, guide);
			return;
		}
		if (event.key !== 'Delete' && event.key !== 'Backspace') return;
		event.preventDefault();
		deleteTarget = { type: 'guide', id: guide.id };
		deleteHoveredElement();
	};
	const handlePathKeydown = (event: KeyboardEvent, path: FieldPath) => {
		if (event.key === 'Enter' || event.key === 'F2') {
			startEditingPath(event, path);
			return;
		}
		if (event.key !== 'Delete' && event.key !== 'Backspace') return;
		event.preventDefault();
		deleteTarget = { type: 'path', id: path.id };
		deleteHoveredElement();
	};
	const distanceToSegment = (point: Point, start: Point, end: Point) => {
		const dx = end.x - start.x;
		const dy = end.y - start.y;
		if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
		const amount = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
		return Math.hypot(point.x - (start.x + amount * dx), point.y - (start.y + amount * dy));
	};
	const strokeContainsPoint = (stroke: FreeStroke, point: Point) => {
		const hitDistance = 10 + (stroke.width ?? freeDrawStrokeWidth) / 2;
		if (stroke.points.length === 0) return false;
		if (stroke.points.length === 1) return Math.hypot(point.x - stroke.points[0].x, point.y - stroke.points[0].y) <= hitDistance;
		for (let index = 1; index < stroke.points.length; index += 1) {
			if (distanceToSegment(point, stroke.points[index - 1], stroke.points[index]) <= hitDistance) return true;
		}
		return false;
	};
	const eraseFreeStrokeAt = (point: Point) => {
		const hitIds = new Set(freeStrokes.filter((stroke) => strokeContainsPoint(stroke, point)).map((stroke) => stroke.id));
		if (hitIds.size === 0) return;
		if (!eraseHistorySaved) {
			saveHistory();
			eraseHistorySaved = true;
		}
		freeStrokes = freeStrokes.filter((stroke) => !hitIds.has(stroke.id));
	};
	const eraseFreeStrokesAlong = (start: Point, end: Point) => {
		const distance = Math.hypot(end.x - start.x, end.y - start.y);
		const steps = Math.max(1, Math.ceil(distance / 5));
		for (let step = 0; step <= steps; step += 1) {
			const amount = step / steps;
			eraseFreeStrokeAt({ x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount });
		}
	};
	const isStylusEraserEvent = (event: PointerEvent) => event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) === 32);
	const selectedTargetAtClientPoint = (clientX: number, clientY: number): SelectedTarget | null => {
		const hit = document.elementFromPoint(clientX, clientY);
		const layer = hit?.closest<SVGElement>('[data-layer-type][data-layer-id]');
		if (!layer || !svg.contains(layer)) return null;
		const type = layer.dataset.layerType;
		const id = Number(layer.dataset.layerId);
		if ((type !== 'marker' && type !== 'path' && type !== 'guide') || !Number.isInteger(id)) return null;
		return { type, id };
	};
	const eraseElementAtClientPoint = (clientX: number, clientY: number) => {
		const target = selectedTargetAtClientPoint(clientX, clientY);
		if (!target) return;
		if (!eraseHistorySaved) {
			saveHistory();
			eraseHistorySaved = true;
		}
		removeElementTarget(target);
	};
	const beginStylusEraser = (event: PointerEvent) => {
		if (!isStylusEraserEvent(event)) return;
		event.preventDefault();
		event.stopPropagation();
		commitActiveEditor();
		clearDeleteState();
		clearPlacementSnap();
		stylusEraserActive = true;
		eraseHistorySaved = false;
		const point = canvasPointFromEvent(event);
		lastErasePoint = point;
		eraseFreeStrokeAt(point);
		eraseElementAtClientPoint(event.clientX, event.clientY);
		try {
			svg.setPointerCapture(event.pointerId);
		} catch {
			// Some browser/driver combinations expose the eraser signal without allowing pointer capture.
		}
	};
	const beginFreeDrawing = (event: PointerEvent) => {
		event.preventDefault();
		clearDeleteState();
		clearPlacementSnap();
		const point = canvasPointFromEvent(event);
		if (freeDrawMode === 'erase') {
			erasingFreeStrokes = true;
			eraseHistorySaved = false;
			lastErasePoint = point;
			eraseFreeStrokeAt(point);
			svg.setPointerCapture(event.pointerId);
			return;
		}
		activeFreeDrawShape = freeDrawShape;
		activeFreeStroke = { id: nextId++, color: freeDrawColor, width: freeDrawThickness, points: [point] };
		syncLayerDom();
		svg.setPointerCapture(event.pointerId);
	};
	const placeGuide = (kind: 'line-of-scrimmage' | 'line-to-gain', x: number) => {
		saveHistory();
		const guide: FieldGuide = {
			id: nextId++,
			kind,
			x,
			color: defaultGuideColor(kind),
			style: defaultGuideStyle(kind)
		};
		if (kind === 'line-of-scrimmage') {
			const removedIds = new Set(guides.filter((item) => item.kind === 'line-of-scrimmage').map((item) => item.id));
			guides = [...guides.filter((item) => item.kind !== 'line-of-scrimmage'), guide];
			layerOrder = layerOrder.filter((layer) => layer.type !== 'guide' || !removedIds.has(layer.id));
		} else guides = [...guides, guide];
		raiseLayer('guide', guide.id);
	};
	const placeBall = (point: Point) => {
		saveHistory();
		const marker = createMarker('ball', point);
		markers = [...markers, marker];
		raiseLayer('marker', marker.id);
	};

	const beginOnField = async (event: PointerEvent) => {
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		clearDeleteState();
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		if (!isPointOnField(canvasPointFromEvent(event))) return;
		const point = pointFromEvent(event);
		if (isGuideTool(tool)) {
			const x = placementSnapX ?? point.x;
			clearPlacementSnap();
			lastPlacementHoverPoint = null;
			placeGuide(tool, x);
			return;
		}

		if (isMarkerTool(tool)) {
			const markerPoint = tool === 'ball' ? { ...point, x: placementSnapX ?? point.x } : point;
			if (tool === 'ball') {
				clearPlacementSnap();
				lastPlacementHoverPoint = null;
			}
			saveHistory();
			const marker = createMarker(tool, markerPoint);
			markers = [...markers, marker];
			raiseLayer('marker', marker.id);
			if (marker.kind === 'event') {
				editingMarkerId = marker.id;
				editingGuideId = null;
				editingPathId = null;
				editValue = marker.label ?? '';
				await tick();
				editInput?.focus();
				editInput?.select();
			}
			return;
		}

		if (isPathTool(tool)) {
			const preview = previewPathFrom(point);
			drawing = { kind: tool, start: preview.start, end: preview.end, pointerStart: point };
			svg.setPointerCapture(event.pointerId);
		}
	};
	const beginOnMarker = (event: PointerEvent, marker: FieldMarker) => {
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		const snappedX = placementSnapX;
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		if (isGuideTool(tool) && marker.kind === 'ball') {
			placeGuide(tool, snappedX ?? marker.x);
			return;
		}
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		if (isArrowPath(tool)) {
			clearDeleteState();
			const start = { x: marker.x, y: marker.y };
			const preview = previewPathFrom(start);
			drawing = {
				kind: tool,
				start: preview.start,
				end: preview.end,
				pointerStart: pointFromEvent(event),
				startMarkerId: marker.id
			};
			svg.setPointerCapture(event.pointerId);
			return;
		}
		setDeleteTargetAtPointer({ type: 'marker', id: marker.id }, event);
		dragTarget = { type: 'marker', id: marker.id, pointerStart: pointFromEvent(event), elementStart: { x: marker.x, y: marker.y }, moved: false };
	};
	const beginOnPath = (event: PointerEvent, path: FieldPath, mode: 'whole' | 'start' | 'end' = 'whole') => {
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		clearPlacementSnap();
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		setDeleteTargetAtPointer({ type: 'path', id: path.id }, event);
		const start = pathStart(path);
			dragTarget = {
				type: 'path',
				id: path.id,
			pointerStart: pointFromEvent(event),
			start: { ...start },
				end: { ...path.end },
				startMarkerId: path.startMarkerId,
				mode,
				moved: false
			};
	};
	const beginOnGuide = (event: PointerEvent, guide: FieldGuide) => {
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		const snappedX = placementSnapX;
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		if (tool === 'ball') {
			const point = pointFromEvent(event);
			placeBall({ ...point, x: snappedX ?? guide.x });
			return;
		}
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		setDeleteTargetAtPointer({ type: 'guide', id: guide.id }, event);
		dragTarget = { type: 'guide', id: guide.id, pointerStart: pointFromEvent(event), xStart: guide.x, moved: false };
	};
	const continuePointer = (event: PointerEvent) => {
		if (stylusEraserActive) {
			event.preventDefault();
			const point = canvasPointFromEvent(event);
			eraseFreeStrokesAlong(lastErasePoint ?? point, point);
			eraseElementAtClientPoint(event.clientX, event.clientY);
			lastErasePoint = point;
			return;
		}
		if (erasingFreeStrokes) {
			const point = canvasPointFromEvent(event);
			eraseFreeStrokesAlong(lastErasePoint ?? point, point);
			lastErasePoint = point;
			return;
		}
		const canvasPoint = canvasPointFromEvent(event);
		pointerOnField = isPointOnField(canvasPoint);
		const point = pointFromEvent(event);
		if (!pointerOnField && tool !== 'free-draw' && !drawing && !dragTarget) {
			hoverPoint = null;
			hoveringElement = false;
			clearPlacementSnap();
			lastPlacementHoverPoint = null;
			return;
		}
		hoverPoint = point;
		const hoveredFieldElement = (event.target as Element).closest?.('[data-field-element]');
		const canSnapThroughHoveredElement =
			(isGuideTool(tool) && hoveredFieldElement?.getAttribute('data-field-kind') === 'ball') ||
			(tool === 'ball' && hoveredFieldElement?.getAttribute('data-field-type') === 'guide');
		hoveringElement = Boolean(hoveredFieldElement) && !canSnapThroughHoveredElement;
		const placementPointerMoved =
			!lastPlacementHoverPoint || Math.hypot(point.x - lastPlacementHoverPoint.x, point.y - lastPlacementHoverPoint.y) > 0.1;
		if (drawing || activeFreeStroke || (dragTarget && placementPointerMoved)) clearPlacementSnap();
		else if (!dragTarget && placementPointerMoved) schedulePlacementSnap(point, event.shiftKey);
		lastPlacementHoverPoint = point;
		if (activeFreeStroke) {
			const strokePoint =
				activeFreeDrawShape === 'straight' && event.shiftKey ? snapStraightDrawPoint(activeFreeStroke.points[0], canvasPoint) : canvasPoint;
			const last = activeFreeStroke.points.at(-1)!;
			if (Math.hypot(strokePoint.x - last.x, strokePoint.y - last.y) >= 1.5) {
				activeFreeStroke = {
					...activeFreeStroke,
					points: activeFreeDrawShape === 'straight' ? [activeFreeStroke.points[0], strokePoint] : [...activeFreeStroke.points, strokePoint]
				};
			}
			return;
		}
		if (!drawing && !dragTarget) return;
		if (drawing) drawing = { ...drawing, end: drawingPathEnd(drawing, point) };
		if (!dragTarget) return;
		const rawDx = point.x - dragTarget.pointerStart.x;
		const rawDy = point.y - dragTarget.pointerStart.y;
		if (!dragTarget.moved && Math.hypot(rawDx, rawDy) < 4) return;
		if (!dragTarget.moved) {
			saveHistory();
			clearDeleteState();
			dragTarget = { ...dragTarget, moved: true } as DragTarget;
			if (!svg.hasPointerCapture(event.pointerId)) svg.setPointerCapture(event.pointerId);
		}
		if (dragTarget.type === 'marker') {
			const next = clampPoint({ x: dragTarget.elementStart.x + rawDx, y: dragTarget.elementStart.y + rawDy });
			markers = markers.map((marker) => (marker.id === dragTarget?.id ? { ...marker, ...next } : marker));
			paths = paths.map((path) => (path.startMarkerId === dragTarget?.id ? { ...path, start: { ...next } } : path));
			if (placementPointerMoved) scheduleDragSnap(dragTarget, next.x, event.shiftKey);
		}
		if (dragTarget.type === 'guide') {
			const x = Math.max(fieldLeft, Math.min(fieldRight, dragTarget.xStart + rawDx));
			guides = guides.map((guide) => (guide.id === dragTarget?.id ? { ...guide, x } : guide));
			if (placementPointerMoved) scheduleDragSnap(dragTarget, x, event.shiftKey);
		}
		if (dragTarget.type === 'path') {
			const target = dragTarget;
			if (target.mode === 'end') {
				const end = clampPoint({ x: target.end.x + rawDx, y: target.end.y + rawDy });
				paths = paths.map((path) => (path.id === target.id ? { ...path, end } : path));
				return;
			}
			if (target.mode === 'start') {
				const start = clampPoint({ x: target.start.x + rawDx, y: target.start.y + rawDy });
				paths = paths.map((path) => (path.id === target.id ? { ...path, start, startMarkerId: undefined } : path));
				return;
			}
			const minX = Math.min(target.start.x, target.end.x);
			const maxX = Math.max(target.start.x, target.end.x);
			const minY = Math.min(target.start.y, target.end.y);
			const maxY = Math.max(target.start.y, target.end.y);
			const dx = Math.max(fieldLeft - minX, Math.min(fieldRight - maxX, rawDx));
			const dy = Math.max(fieldTop - minY, Math.min(fieldBottom - maxY, rawDy));
			paths = paths.map((path) =>
				path.id === target.id
					? {
							...path,
							start: { x: target.start.x + dx, y: target.start.y + dy },
							end: { x: target.end.x + dx, y: target.end.y + dy },
							startMarkerId: undefined
						}
					: path
			);
		}
	};
	const endPointer = (event: PointerEvent) => {
		if (stylusEraserActive) {
			const point = canvasPointFromEvent(event);
			eraseFreeStrokesAlong(lastErasePoint ?? point, point);
			eraseElementAtClientPoint(event.clientX, event.clientY);
			stylusEraserActive = false;
			eraseHistorySaved = false;
			lastErasePoint = null;
			if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
			return;
		}
		if (erasingFreeStrokes) {
			const point = canvasPointFromEvent(event);
			eraseFreeStrokesAlong(lastErasePoint ?? point, point);
			erasingFreeStrokes = false;
			eraseHistorySaved = false;
			lastErasePoint = null;
			if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
			return;
		}
		if (activeFreeStroke) {
			const first = activeFreeStroke.points[0];
			const rawFinalPoint = canvasPointFromEvent(event);
			const finalPoint = activeFreeDrawShape === 'straight' && event.shiftKey ? snapStraightDrawPoint(first, rawFinalPoint) : rawFinalPoint;
			const last = activeFreeStroke.points.at(-1)!;
			const points =
				activeFreeDrawShape === 'straight'
					? Math.hypot(finalPoint.x - first.x, finalPoint.y - first.y) >= 1.5
						? [first, finalPoint]
						: [first]
					: Math.hypot(finalPoint.x - last.x, finalPoint.y - last.y) >= 1.5
						? [...activeFreeStroke.points, finalPoint]
						: activeFreeStroke.points;
			saveHistory();
			freeStrokes = [...freeStrokes, { ...activeFreeStroke, points }];
			activeFreeStroke = null;
			activeFreeDrawShape = freeDrawShape;
			syncLayerDom();
			if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
			return;
		}
		const droppedTarget: SelectedTarget | null = dragTarget?.moved ? { type: dragTarget.type, id: dragTarget.id } : null;
		if (drawing && hasLength(drawing.start, drawing.end)) {
			saveHistory();
			const pathId = nextId++;
			paths = [
				...paths,
				{
					id: pathId,
					...drawing,
					color: drawing.kind === 'pass' ? 'cyan' : drawing.kind === 'kick' ? 'blue' : drawing.kind === 'run' ? 'white' : 'yellow',
					style: drawing.kind === 'pass' || drawing.kind === 'kick' ? 'dashed' : 'solid'
				}
			];
			raiseLayer('path', pathId);
		}
		drawing = null;
		clearPlacementSnap();
		dragTarget = null;
		if (droppedTarget) {
			raiseLayer(droppedTarget.type, droppedTarget.id);
			setDeleteTargetAtPointer(droppedTarget, event);
		}
		if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
	};
	const cancelPointer = () => {
		drawing = null;
		activeFreeStroke = null;
		activeFreeDrawShape = freeDrawShape;
		dragTarget = null;
		erasingFreeStrokes = false;
		stylusEraserActive = false;
		eraseHistorySaved = false;
		lastErasePoint = null;
		clearPlacementSnap();
		clearDeleteState();
	};
	const isDragging = (type: DragTarget['type'], id: number) => dragTarget?.type === type && dragTarget.id === id && dragTarget.moved;
	const defaultPathColor = (kind: PathKind) => guideColor(kind === 'pass' ? 'cyan' : kind === 'kick' ? 'blue' : kind === 'run' ? 'white' : 'yellow');
	const defaultPathStyle = (kind: PathKind): GuideStyle => (kind === 'pass' || kind === 'kick' ? 'dashed' : 'solid');
	const pathMarker = (kind: PathKind) => (isArrowPath(kind) ? 'url(#builder-path-arrow)' : undefined);
	const airborneLift = (kind: 'pass' | 'kick', start: Point, end: Point) => {
		const distance = Math.hypot(end.x - start.x, end.y - start.y);
		const desiredLift = kind === 'kick' ? Math.max(46, Math.min(160, distance * 0.52)) : Math.max(20, Math.min(58, distance * 0.18));
		const midpointY = (start.y + end.y) / 2;
		return Math.max(12, Math.min(desiredLift, midpointY - fieldTop - 18));
	};
	const airbornePoint = (kind: 'pass' | 'kick', start: Point, end: Point, t: number): Point => {
		const inverse = 1 - t;
		const control = {
			x: (start.x + end.x) / 2,
			y: (start.y + end.y) / 2 - airborneLift(kind, start, end) * 2
		};
		return {
			x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
			y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
		};
	};
	const pathData = (kind: 'pass' | 'kick', start: Point, end: Point) => {
		const controlY = (start.y + end.y) / 2 - airborneLift(kind, start, end) * 2;
		return `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${controlY} ${end.x} ${end.y}`;
	};
	type AirborneSegment = { d: string; width: number; linecap: 'round' | 'butt' };
	const airborneSegments = (kind: 'pass' | 'kick', start: Point, end: Point, style: GuideStyle): AirborneSegment[] => {
		const segmentCount = 64;
		const segments: AirborneSegment[] = [];
		for (let index = 0; index < segmentCount; index += 1) {
			const t1 = index / segmentCount;
			const t2 = (index + 1) / segmentCount;
			const midpoint = (t1 + t2) / 2;
			const visible =
				style === 'solid' ||
				(style === 'dashed' && (index % 5 < 3 || index >= segmentCount - 2)) ||
				(style === 'dotted' && (index % 4 === 0 || index === segmentCount - 1));
			if (!visible) continue;
			const startPoint = airbornePoint(kind, start, end, t1);
			const endPoint = airbornePoint(kind, start, end, t2);
			const altitude = Math.sin(Math.PI * midpoint);
			const groundWidth = pathStrokeWidth * 0.68;
			const peakBoost = pathStrokeWidth * (kind === 'kick' ? 1 : 0.45);
			segments.push({
				d: `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`,
				width: groundWidth + peakBoost * altitude,
				linecap: style === 'solid' ? 'round' : style === 'dotted' ? 'round' : 'butt'
			});
		}
		return segments;
	};
	const airShadowPath = (start: Point, end: Point) => {
		const startY = Math.min(fieldBottom - 5, start.y + 9);
		const endY = Math.min(fieldBottom - 5, end.y + 9);
		return `M ${start.x} ${startY} Q ${(start.x + end.x) / 2} ${(startY + endY) / 2 + 8} ${end.x} ${endY}`;
	};

	onMount(() => {
		const browserNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
		primaryModifierKey = /Mac|iPhone|iPad|iPod/i.test(browserNavigator.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent)
			? '⌘'
			: 'Ctrl';
		const storedActionMessage = sessionStorage.getItem('play-builder-action-message');
		if (storedActionMessage) {
			sessionStorage.removeItem('play-builder-action-message');
			try {
				const stored = JSON.parse(storedActionMessage) as { message?: unknown; expiresAt?: unknown };
				const remaining = Number(stored.expiresAt) - Date.now();
				if (typeof stored.message === 'string' && remaining > 0) showActionMessage(stored.message, remaining);
			} catch {
				// Ignore malformed transient feedback from an older session.
			}
		}
		document.addEventListener('pointerdown', handleWindowPointerDown, true);
		document.addEventListener('click', handleWindowClick, true);
		syncLayerDom();
		return () => {
			clearPlacementSnap();
			clearActionMessageTimer();
			if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
			document.removeEventListener('pointerdown', handleWindowPointerDown, true);
			document.removeEventListener('click', handleWindowClick, true);
		};
	});
</script>

<svelte:window on:keydown={handleGlobalKeydown} on:beforeunload={handleBeforeUnload} />

<section class="relative border-2 border-stone-900 bg-stone-800 shadow-lg select-none" aria-label="Flag football play builder">
	<div class="flex gap-2 p-2">
		<div class="relative my-auto w-10 shrink-0 sm:w-12">
			<div class="flex w-full flex-col gap-px bg-stone-500 p-px" role="toolbar" aria-label="Drawing tools">
				{#each toolRows as row}
					<div
						class="flex min-h-0 w-full shrink-0"
						style={`aspect-ratio: ${row.some((item) => item.id === 'line-of-scrimmage') ? 1 : row.length} / 1;`}
					>
						{#each row as item, itemIndex}
							<HoverTooltip text={item.label} shortcutKeys={item.shortcutKeys} minWidthPx={0} wrapperClass="flex h-full min-w-0 flex-1">
								<button
									type="button"
									data-builder-tool
									aria-label={item.label}
									aria-pressed={tool === item.id}
									on:pointerdown={() => selectTool(item.id)}
									on:click={(event) => event.detail === 0 && selectTool(item.id)}
									class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 bg-stone-100 text-xs font-bold text-stone-600 transition-colors hover:bg-white hover:text-stone-900 sm:text-sm"
									class:border-r={row.length === 2 && itemIndex === 0}
									class:border-stone-400={row.length === 2 && itemIndex === 0}
									class:!bg-stone-900={tool === item.id}
									class:!text-white={tool === item.id}
								>
									{#if item.image}
										<img
											src={item.image}
											alt=""
											class="h-8 w-8 object-contain"
											class:invert={(item.id === 'run' || item.id === 'free-draw') && tool === item.id}
											draggable="false"
										/>
									{:else if item.icon === 'event'}
										<svg viewBox="0 0 24 24" class="h-7 w-7" aria-hidden="true">
											<path d="M4 5h16v11H9l-4 3v-3H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
											<path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2" />
										</svg>
									{:else if item.icon === 'line-of-scrimmage' || item.icon === 'line-to-gain'}
										<span class="relative block h-8 w-4 border border-stone-900 bg-[#356f49]" aria-hidden="true">
											<span
												class="absolute top-0.5 bottom-0.5 left-1/2 -translate-x-1/2 border-l-2"
												class:border-dashed={item.icon === 'line-of-scrimmage'}
												class:border-white={item.icon === 'line-of-scrimmage'}
												class:border-solid={item.icon === 'line-to-gain'}
												class:border-yellow-400={item.icon === 'line-to-gain'}
											></span>
										</span>
									{:else}
										<span class="text-lg" aria-hidden="true">{item.symbol}</span>
									{/if}
									{#if item.caption}
										<span class="max-w-full text-[8px] leading-none font-medium tracking-tight whitespace-nowrap sm:text-[9px]">{item.caption}</span>
									{/if}
								</button>
							</HoverTooltip>
						{/each}
					</div>
				{/each}
			</div>

			{#if tool === 'free-draw'}
				<div class="relative z-30 mt-px w-full border-2 border-stone-900 bg-stone-900 p-px shadow-xl" role="group" aria-label="Drawing options">
					<div class="grid grid-cols-2 gap-px" role="group" aria-label="Drawing line type">
						<button
							type="button"
							aria-label="Draw squiggle lines"
							aria-pressed={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
							on:pointerdown|stopPropagation
							on:click|stopPropagation={() => {
								freeDrawShape = 'squiggle';
								freeDrawMode = 'draw';
							}}
							class="flex h-7 cursor-pointer items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
							class:!bg-stone-600={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
							class:!text-white={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
						>
							<svg viewBox="0 0 24 12" class="h-3 w-4" aria-hidden="true">
								<path d="M2 8c4-8 6 8 10 0s6 8 10 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
							</svg>
							<span class="sr-only">Squiggle</span>
						</button>
						<button
							type="button"
							aria-label="Draw straight lines"
							aria-pressed={freeDrawShape === 'straight' && freeDrawMode === 'draw'}
							on:pointerdown|stopPropagation
							on:click|stopPropagation={() => {
								freeDrawShape = 'straight';
								freeDrawMode = 'draw';
							}}
							class="flex h-7 cursor-pointer items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
							class:!bg-stone-600={freeDrawShape === 'straight' && freeDrawMode === 'draw'}
							class:!text-white={freeDrawShape === 'straight' && freeDrawMode === 'draw'}
						>
							<svg viewBox="0 0 24 12" class="h-3 w-4" aria-hidden="true">
								<path d="M2 10 22 2" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
							</svg>
							<span class="sr-only">Straight</span>
						</button>
					</div>

					<label class="mt-px block bg-stone-100 px-0.5 py-0.5 text-[7px] font-bold text-stone-800">
						<span class="flex items-center justify-between"><span>Line</span><span>{freeDrawThickness}</span></span>
						<input
							type="range"
							min="2"
							max="8"
							step="1"
							bind:value={freeDrawThickness}
							on:pointerdown|stopPropagation
							aria-label="Drawing line thickness"
							class="block h-3 w-full cursor-pointer accent-red-600"
						/>
					</label>

					<div class="mt-px grid grid-cols-2 gap-px" role="group" aria-label="Drawing color">
						{#each freeDrawColors as option, colorIndex}
							<button
								data-draw-color
								type="button"
								title={`${colorIndex === 9 ? 0 : colorIndex + 1}: ${option.label}`}
								aria-label={`${option.label} drawing color`}
								aria-pressed={freeDrawColor === option.id}
								on:pointerdown|stopPropagation
								on:keydown={(event) => handleDrawColorKeydown(event, colorIndex)}
								on:click|stopPropagation={() => {
									freeDrawColor = option.id;
									freeDrawMode = 'draw';
								}}
								class="flex aspect-square min-h-0 cursor-pointer items-center justify-center border border-stone-500 text-[8px] font-black ring-offset-1 ring-offset-stone-900 outline-none hover:ring-1 hover:ring-white"
								class:ring-2={freeDrawColor === option.id}
								class:ring-white={freeDrawColor === option.id}
								class:text-white={!['yellow', 'white', 'gray'].includes(option.id)}
								class:text-stone-900={['yellow', 'white', 'gray'].includes(option.id)}
								style:background={option.value}>{colorIndex === 9 ? 0 : colorIndex + 1}</button
							>
						{/each}
					</div>

					<div class="mt-px grid grid-cols-2 gap-px">
						<button
							type="button"
							aria-label="Erase drawing strokes"
							aria-pressed={freeDrawMode === 'erase'}
							on:pointerdown|stopPropagation
							on:click|stopPropagation={() => (freeDrawMode = freeDrawMode === 'erase' ? 'draw' : 'erase')}
							class="flex h-7 cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white hover:text-stone-950"
							class:!bg-stone-600={freeDrawMode === 'erase'}
							class:!text-white={freeDrawMode === 'erase'}
						>
							<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
								<path d="m4 15 9-10 7 6-8 9H7zM10 20h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
							</svg>
							<span class="sr-only">Eraser</span>
						</button>
						<button
							type="button"
							aria-label="Clear free drawings"
							disabled={freeStrokes.length === 0 && !activeFreeStroke}
							on:pointerdown|stopPropagation
							on:click|stopPropagation={() => runGuardedAction(clearFreeDrawings)}
							class="flex h-7 cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-35"
						>
							<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
								<path d="M4 16c3-5 5 5 8 0s5 3 8-2M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
							</svg>
							<span class="sr-only">Clear</span>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="relative min-w-0 flex-1">
			<div class="absolute top-2 left-2 z-30 flex items-start gap-1.5" role="toolbar" aria-label="Play actions">
				<HoverTooltip text="Undo" shortcutKeys={[primaryModifierKey, 'Z']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Undo"
						disabled={history.length === 0}
						on:click={() => runGuardedAction(undo)}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path
								d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="square"
								stroke-linejoin="miter"
							/>
						</svg>
						<span class="text-[8px] leading-none font-semibold">Undo</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Redo" shortcutKeys={[primaryModifierKey, 'Shift', 'Z']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Redo"
						disabled={future.length === 0}
						on:click={() => runGuardedAction(redo)}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path
								d="m15 7 5 5-5 5m4-5h-8a6 6 0 0 0-6 6"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="square"
								stroke-linejoin="miter"
							/>
						</svg>
						<span class="text-[8px] leading-none font-semibold">Redo</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Clear All" shortcutKeys={['Shift', 'Del']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Clear all"
						disabled={markers.length === 0 && paths.length === 0 && guides.length === 0 && freeStrokes.length === 0}
						on:click={() => runGuardedAction(clear)}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
					>
						<img src="/images/trash-can.png" alt="" class="h-4 w-4 object-contain" draggable="false" />
						<span class="text-[8px] leading-none font-semibold">Clear All</span>
					</button>
				</HoverTooltip>

				<div class="ml-2 flex gap-1.5">
					<HoverTooltip text="New Play" shortcutKeys={[primaryModifierKey, 'N']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							type="button"
							aria-label="Start a new play"
							disabled={actionInProgress !== null}
							on:click={requestNewBoard}
							class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-wait disabled:opacity-50"
						>
							<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
								<path d="M5 3h10l4 4v14H5zM15 3v5h4M12 11v7M8.5 14.5h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
							</svg>
							<span class="text-[8px] leading-none font-semibold">New</span>
						</button>
					</HoverTooltip>
					<HoverTooltip text="Save Play" shortcutKeys={[primaryModifierKey, 'S']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							type="button"
							aria-label="Save play"
							disabled={actionInProgress !== null}
							on:click={savePlay}
							class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-wait disabled:opacity-50"
						>
							<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
								<path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 20v-7h8v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
							</svg>
							<span class="text-[8px] leading-none font-semibold">Save</span>
						</button>
					</HoverTooltip>
					{#if savedPlayId}
						<HoverTooltip text="Copy URL" shortcutKeys={[primaryModifierKey, 'C']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
							<button
								type="button"
								aria-label="Copy shareable URL"
								on:click={copyShareUrl}
								class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 transition-colors duration-500 hover:bg-white"
								class:!bg-green-500={copyConfirmed}
								class:!text-white={copyConfirmed}
							>
								<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
									<path
										d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
								<span class="text-[8px] leading-none font-semibold">{copyConfirmed ? 'Copied!' : 'Copy'}</span>
							</button>
						</HoverTooltip>
					{/if}
				</div>
			</div>

			<div class="absolute bottom-2 left-2 z-30" style="right: 70.5%;" aria-label="Plays in this play builder">
				<div bind:this={playStripElement} class="play-tabs-scroll overflow-x-auto overflow-y-hidden">
					<div class="flex w-max items-stretch gap-1">
						{#each playEntries as play, index (play.id)}
							<button
								data-play-id={play.id}
								type="button"
								aria-label={`Open ${play.name}`}
								aria-pressed={index === activePlayIndex}
								title={`${play.name} — double-click for play options`}
								on:click={() => switchPlay(play.id)}
								on:dblclick={(event) => openPlayMenu(event, play.id)}
								class="flex h-9 min-w-20 shrink-0 cursor-pointer items-center justify-center border border-stone-500 bg-stone-100 px-3 text-[10px] font-black whitespace-nowrap text-stone-800 hover:bg-white aria-pressed:border-stone-950 aria-pressed:bg-stone-900 aria-pressed:text-white"
							>
								{play.name}
							</button>
						{/each}
						<HoverTooltip
							text={playEntries.length >= PLAY_BUILDER_MAX_PLAYS ? 'Play Limit Reached' : 'Add Play'}
							minWidthPx={0}
							wrapperClass="flex h-9 w-9 shrink-0"
						>
							<button
								type="button"
								aria-label="Add another play"
								disabled={playEntries.length >= PLAY_BUILDER_MAX_PLAYS}
								on:click={addPlay}
								class="flex h-9 w-9 cursor-pointer items-center justify-center border border-stone-500 bg-stone-100 text-xl font-black text-stone-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
							>
								+
							</button>
						</HoverTooltip>
					</div>
				</div>
				{#if editingPlayId !== null}
					<div
						bind:this={playMenuElement}
						class="absolute bottom-12 w-44 border-2 border-stone-900 bg-stone-50 p-2 text-stone-800 shadow-xl"
						style:left={`${playMenuLeft}px`}
					>
						<label for={`play-name-${editingPlayId}`} class="mb-1 block text-[9px] font-black tracking-wide text-stone-600 uppercase">Play Name</label
						>
						<div class="flex">
							<input
								bind:this={playNameInput}
								bind:value={playNameValue}
								id={`play-name-${editingPlayId}`}
								maxlength={PLAY_BUILDER_PLAY_NAME_MAX_LENGTH}
								on:keydown={(event) => {
									if (event.key === 'Enter') renamePlay();
									if (event.key === 'Escape') editingPlayId = null;
								}}
								class="h-8 min-w-0 flex-1 border border-stone-500 bg-white px-2 text-xs font-semibold outline-none focus:border-stone-950"
							/>
							<button
								type="button"
								on:click={renamePlay}
								class="h-8 cursor-pointer bg-stone-900 px-2 text-[9px] font-black text-white uppercase hover:bg-stone-700"
							>
								Rename
							</button>
						</div>
						<div class="mt-2 grid grid-cols-2 gap-1">
							<button
								type="button"
								disabled={playEntries.length >= PLAY_BUILDER_MAX_PLAYS}
								on:click={duplicatePlay}
								class="h-8 cursor-pointer border border-stone-500 bg-white text-[9px] font-black uppercase hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Duplicate
							</button>
							<button
								type="button"
								disabled={playEntries.length <= 1}
								on:click={deletePlay}
								class="h-8 cursor-pointer border border-red-700 bg-white text-[9px] font-black text-red-700 uppercase hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
							>
								Delete
							</button>
						</div>
					</div>
				{/if}
			</div>
			<div class="absolute right-2 bottom-2 z-20 flex items-end gap-1.5" aria-label="Field and export controls">
				{#if actionMessage}
					<span
						class="mr-1 max-w-48 border border-stone-600 bg-stone-950/90 px-2 py-1 text-[9px] leading-tight font-semibold text-white"
						aria-live="polite"
					>
						{actionMessage}
					</span>
				{/if}
				<HoverTooltip text="Default Setup" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Set up default play"
						on:click={setupDefaultScenario}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path d="M4 5h16v14H4zM8 5v14M13 5v14M18 5v14" fill="none" stroke="currentColor" stroke-width="1.6" />
							<circle cx="10.5" cy="12" r="1.5" fill="currentColor" />
							<path d="M10.5 12h4" stroke="currentColor" stroke-width="1.6" stroke-dasharray="1.5 1" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">Setup</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Field Settings" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Open field settings"
						on:click={openSettings}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path
								d="M9.6 3h4.8l.7 2.2 2 .8 2.1-1 2.4 4.1-1.7 1.5.2 2.2 1.5 1.7-2.4 4.1-2.1-1-2 .8-.7 2.2H9.6l-.7-2.2-2-.8-2.1 1-2.4-4.1 1.7-1.7.2-2.2-1.7-1.5L4.8 5l2.1 1 2-.8z"
								fill="none"
								stroke="currentColor"
								stroke-width="1.7"
								stroke-linejoin="miter"
							/>
							<circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">Settings</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Help" shortcutKeys={[primaryModifierKey, 'H']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Open play builder help"
						on:click={openHelp}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
							<path d="M9.7 9a2.5 2.5 0 1 1 3.1 2.4c-.8.3-.8.9-.8 1.6M12 17h.01" fill="none" stroke="currentColor" stroke-width="2" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">Help</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Export PNG" minWidthPx={0} wrapperClass="ml-2 flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Export PNG image"
						disabled={actionInProgress !== null}
						on:click={() => exportImage('png')}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-wait disabled:opacity-50"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<rect x="3" y="4" width="18" height="16" fill="none" stroke="currentColor" stroke-width="2" />
							<circle cx="8" cy="9" r="1.5" fill="currentColor" />
							<path d="m5 18 5-5 3 3 2-2 4 4" fill="none" stroke="currentColor" stroke-width="2" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">PNG</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Export PDF" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Export PDF"
						disabled={actionInProgress !== null}
						on:click={() => exportImage('pdf')}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-wait disabled:opacity-50"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path d="M6 2h8l4 4v16H6zM14 2v5h4" fill="none" stroke="currentColor" stroke-width="2" />
							<path d="M8 16h8M8 12h8" stroke="currentColor" stroke-width="2" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">PDF</span>
					</button>
				</HoverTooltip>
			</div>
			<svg
				bind:this={svg}
				viewBox="0 0 1000 484"
				font-family="ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
				class="block h-auto w-full select-none"
				class:cursor-none={!dragTarget?.moved && tool !== 'free-draw' && pointerOnField}
				class:drawing-cursor={tool === 'free-draw'}
				class:!cursor-grabbing={dragTarget?.moved}
				style="touch-action: none;"
				role="application"
				aria-label="Blank horizontal NIRSA flag football field drawing area"
				on:pointerdown|capture={beginStylusEraser}
				on:pointerdown={beginOnField}
				on:pointermove={continuePointer}
				on:pointerenter={(event) => {
					hoveringElement = false;
					pointerOnField = isPointOnField(canvasPointFromEvent(event));
					const point = pointFromEvent(event);
					hoverPoint = pointerOnField || tool === 'free-draw' ? point : null;
					lastPlacementHoverPoint = pointerOnField ? point : null;
					if (pointerOnField) schedulePlacementSnap(point, event.shiftKey);
				}}
				on:pointerleave={() => {
					hoverPoint = null;
					pointerOnField = false;
					hoveringElement = false;
					clearPlacementSnap();
					lastPlacementHoverPoint = null;
				}}
				on:pointerup={endPointer}
				on:pointercancel={cancelPointer}
			>
				<defs>
					<pattern id="builder-grass-stripe" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
						<rect width="16" height="32" fill="rgba(255,255,255,0.025)" />
					</pattern>
					<filter id="builder-air-shadow" x="-15%" y="-40%" width="130%" height="180%">
						<feGaussianBlur stdDeviation="3" />
					</filter>
					<marker
						id="builder-path-arrow"
						viewBox="0 0 10 10"
						refX="0"
						refY="5"
						markerUnits="userSpaceOnUse"
						markerWidth="22.5"
						markerHeight="22.5"
						orient="auto"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
					</marker>
				</defs>

				{#key fieldSettings.fieldType}
					{#if fieldSettings.showTeamBoxes && fieldLayout.teamBox}
						{@const teamBox = fieldLayout.teamBox}
						{#each [fieldTop - 28, fieldBottom + 8] as teamBoxY}
							<rect
								data-pdf-outline
								x={xForYards(teamBox[0]) - 4}
								y={teamBoxY - 4}
								width={xForYards(teamBox[1]) - xForYards(teamBox[0]) + 8}
								height="28"
								fill="none"
								stroke="#1c1917"
								stroke-width="6"
								display="none"
								pointer-events="none"
							/>
							<rect
								data-export-team-box
								x={xForYards(teamBox[0])}
								y={teamBoxY}
								width={xForYards(teamBox[1]) - xForYards(teamBox[0])}
								height="20"
								fill="#d2b48c"
								stroke="rgba(255,255,255,0.82)"
								stroke-width="2"
								pointer-events="none"
							/>
							<text
								x={(xForYards(teamBox[0]) + xForYards(teamBox[1])) / 2}
								y={teamBoxY + 14}
								text-anchor="middle"
								fill="#292524"
								font-size="12"
								font-weight="800"
								letter-spacing="2"
								pointer-events="none">TEAM BOX</text
							>
						{/each}
					{/if}

					<rect x={fieldLeft} y={fieldTop} width={fieldWidth} height={fieldHeight} fill={fieldPalette.field} />
					<rect x={fieldLeft} y={fieldTop} width={fieldWidth} height={fieldHeight} fill="url(#builder-grass-stripe)" />
					<rect x={fieldLeft} y={fieldTop} width={xForYards(fieldLayout.goalLines[0]) - fieldLeft} height={fieldHeight} fill={fieldPalette.endZone} />
					<rect
						x={xForYards(fieldLayout.goalLines[1])}
						y={fieldTop}
						width={fieldRight - xForYards(fieldLayout.goalLines[1])}
						height={fieldHeight}
						fill={fieldPalette.endZone}
					/>
					<rect
						x={fieldLeft}
						y={fieldTop}
						width={xForYards(fieldLayout.goalLines[0]) - fieldLeft}
						height={fieldHeight}
						fill="url(#builder-grass-stripe)"
					/>
					<rect
						x={xForYards(fieldLayout.goalLines[1])}
						y={fieldTop}
						width={fieldRight - xForYards(fieldLayout.goalLines[1])}
						height={fieldHeight}
						fill="url(#builder-grass-stripe)"
					/>
					{#each fieldLayout.shadedZones as zone}
						<rect x={xForYards(zone[0])} y={fieldTop} width={xForYards(zone[1]) - xForYards(zone[0])} height={fieldHeight} fill="rgba(0,0,0,0.06)" />
					{/each}
					{#each fieldLayout.noRunZones as zone}
						<rect
							x={xForYards(zone[0])}
							y={fieldTop}
							width={xForYards(zone[1]) - xForYards(zone[0])}
							height={fieldHeight}
							fill="rgba(255,255,255,0.16)"
							pointer-events="none"
						/>
					{/each}
					<rect
						data-pdf-outline
						x={fieldLeft - fieldLineWidth * 2}
						y={fieldTop - fieldLineWidth * 2}
						width={fieldWidth + fieldLineWidth * 4}
						height={fieldHeight + fieldLineWidth * 4}
						fill="none"
						stroke="#1c1917"
						stroke-width={fieldLineWidth * 3}
						display="none"
						pointer-events="none"
					/>
					<rect
						data-export-field-boundary
						x={fieldLeft}
						y={fieldTop}
						width={fieldWidth}
						height={fieldHeight}
						fill="none"
						stroke="#ffffff"
						stroke-width={fieldLineWidth}
						pointer-events="none"
					/>

					{#each fieldLayout.zoneLines as yards}
						<line
							x1={xForYards(yards)}
							y1={fieldTop}
							x2={xForYards(yards)}
							y2={fieldBottom}
							stroke="rgba(255,255,255,0.82)"
							stroke-width={fieldLineWidth}
							pointer-events="none"
						/>
					{/each}
					{#if fieldSettings.showHashes}
						{#each fieldLayout.hashLines as yards}
							{#each fieldLayout.hashYFractions as yFraction}
								<line
									x1={xForYards(yards) - 10}
									y1={fieldTop + fieldHeight * yFraction}
									x2={xForYards(yards) + 10}
									y2={fieldTop + fieldHeight * yFraction}
									stroke="#fff"
									stroke-width={fieldLineWidth}
									pointer-events="none"
								/>
							{/each}
						{/each}
					{/if}
					{#if fieldSettings.showThreeYardMarker}
						{#each fieldLayout.threeYardMarkers as yards}
							<line
								x1={xForYards(yards)}
								y1={fieldTop + fieldHeight / 2 - 12}
								x2={xForYards(yards)}
								y2={fieldTop + fieldHeight / 2 + 12}
								stroke="rgba(255,255,255,0.9)"
								stroke-width={fieldLineWidth}
								pointer-events="none"
							/>
						{/each}
					{/if}
					{#if fieldSettings.showTenYardMarker}
						{#each fieldLayout.tenYardMarkers as yards}
							<line
								x1={xForYards(yards)}
								y1={fieldTop + fieldHeight / 2 - 12}
								x2={xForYards(yards)}
								y2={fieldTop + fieldHeight / 2 + 12}
								stroke="rgba(255,255,255,0.9)"
								stroke-width={fieldLineWidth}
								pointer-events="none"
							/>
						{/each}
					{/if}
					{#if fieldSettings.showThirtyYardMarker}
						{#each fieldLayout.thirtyYardMarkers as yards}
							<line
								x1={xForYards(yards)}
								y1={fieldTop + fieldHeight / 2 - 16}
								x2={xForYards(yards)}
								y2={fieldTop + fieldHeight / 2 + 16}
								stroke="rgba(255,255,255,0.78)"
								stroke-width={fieldLineWidth}
								pointer-events="none"
							/>
						{/each}
					{/if}
					{#each fieldLayout.noRunLines as yards}
						<line
							x1={xForYards(yards)}
							y1={fieldTop}
							x2={xForYards(yards)}
							y2={fieldBottom}
							stroke="rgba(255,255,255,0.58)"
							stroke-width={fieldLineWidth}
							stroke-dasharray="10 8"
							pointer-events="none"
						/>
					{/each}
					{#if fieldSettings.fieldType === 'unified' && fieldSettings.showNoRunZoneText}
						{#each fieldLayout.noRunZones as zone}
							{@const noRunCenter = (xForYards(zone[0]) + xForYards(zone[1])) / 2}
							<text
								x={noRunCenter}
								y={fieldTop + fieldHeight / 2}
								transform={`rotate(-90 ${noRunCenter} ${fieldTop + fieldHeight / 2})`}
								text-anchor="middle"
								fill="rgba(255,255,255,0.72)"
								font-size="15"
								font-weight="900"
								letter-spacing="1.5"
								pointer-events="none">NO RUN ZONE</text
							>
						{/each}
					{/if}
					{#if fieldSettings.showEndZoneText}
						<text
							x={xForYards(fieldLayout.endZoneCenters[0])}
							y={fieldTop + fieldHeight / 2}
							transform={`rotate(-90 ${xForYards(fieldLayout.endZoneCenters[0])} ${fieldTop + fieldHeight / 2})`}
							text-anchor="middle"
							fill="#ffffff"
							fill-opacity="0.72"
							font-size="26"
							font-weight="800"
							letter-spacing="4"
							pointer-events="none">END ZONE</text
						>
						<text
							x={xForYards(fieldLayout.endZoneCenters[1])}
							y={fieldTop + fieldHeight / 2}
							transform={`rotate(90 ${xForYards(fieldLayout.endZoneCenters[1])} ${fieldTop + fieldHeight / 2})`}
							text-anchor="middle"
							fill="#ffffff"
							fill-opacity="0.72"
							font-size="26"
							font-weight="800"
							letter-spacing="4"
							pointer-events="none">END ZONE</text
						>
					{/if}
					{#if fieldSettings.showYardNumbers}
						{#each [fieldTop + 25, fieldBottom - 5] as yardLabelY}
							{#each fieldLayout.yardLabels as fieldMarker}
								<text
									x={xForYards(fieldMarker.x) - 5}
									y={yardLabelY}
									text-anchor="end"
									fill="rgba(255,255,255,0.72)"
									font-size="26"
									font-weight="900"
									pointer-events="none">{fieldMarker.label[0]}</text
								>
								<text
									x={xForYards(fieldMarker.x) + 5}
									y={yardLabelY}
									text-anchor="start"
									fill="rgba(255,255,255,0.72)"
									font-size="26"
									font-weight="900"
									pointer-events="none">{fieldMarker.label[1]}</text
								>
							{/each}
						{/each}
					{/if}
					{#if fieldSettings.showGoalLetters}
						{#each [fieldTop + 25, fieldBottom - 5] as goalLabelY}
							{#each fieldLayout.goalLabelYards as goalLabelYards}
								<text
									x={xForYards(goalLabelYards)}
									y={goalLabelY}
									text-anchor="middle"
									fill="rgba(255,255,255,0.72)"
									font-size="26"
									font-weight="900"
									pointer-events="none">G</text
								>
							{/each}
						{/each}
					{/if}

					<g data-field-watermark aria-hidden="true" pointer-events="none">
						<text
							x={fieldLeft + fieldWidth / 2}
							y={fieldTop + fieldHeight / 2}
							transform={`rotate(${fieldWatermarkAngle} ${fieldLeft + fieldWidth / 2} ${fieldTop + fieldHeight / 2})`}
							text-anchor="middle"
							dominant-baseline="middle"
							fill="#ffffff"
							fill-opacity="0.1"
							font-size="52"
							font-weight="900"
							letter-spacing="7">CASEPLAY.ORG</text
						>
					</g>
				{/key}

				{#if hoverPoint && !hoveringElement && !drawing && !dragTarget}
					{#if isGuideTool(tool)}
						<line
							x1={placementSnapX ?? hoverPoint.x}
							y1={fieldTop + guideSidelineInset}
							x2={placementSnapX ?? hoverPoint.x}
							y2={fieldBottom - guideSidelineInset}
							stroke={guideColor(defaultGuideColor(tool))}
							stroke-width={guideStrokeWidth}
							stroke-dasharray={guideDash(defaultGuideStyle(tool))}
							opacity="0.45"
							pointer-events="none"
						/>
					{:else if isPathTool(tool)}
						{@const preview = previewPathFrom(hoverPoint)}
						{@const previewStart = preview.start}
						{@const previewEnd = preview.end}
						{#if tool === 'pass' || tool === 'kick'}
							<g opacity="0.48" pointer-events="none">
								<path
									d={airShadowPath(previewStart, previewEnd)}
									fill="none"
									stroke="#10291b"
									stroke-width={tool === 'kick' ? 7 : 5}
									opacity="0.28"
									filter="url(#builder-air-shadow)"
								/>
								{#each airborneSegments(tool, previewStart, previewEnd, defaultPathStyle(tool)) as segment}
									<path d={segment.d} fill="none" stroke={defaultPathColor(tool)} stroke-width={segment.width} stroke-linecap={segment.linecap} />
								{/each}
								<path
									d={pathData(tool, previewStart, previewEnd)}
									fill="none"
									stroke={defaultPathColor(tool)}
									stroke-width="0.01"
									marker-end={pathMarker(tool)}
								/>
							</g>
						{:else}
							<line
								x1={previewStart.x}
								y1={previewStart.y}
								x2={previewEnd.x}
								y2={previewEnd.y}
								stroke={defaultPathColor(tool)}
								stroke-width={pathStrokeWidth}
								stroke-dasharray={guideDash(defaultPathStyle(tool))}
								stroke-linecap={defaultPathStyle(tool) === 'dotted' ? 'round' : 'square'}
								marker-end={pathMarker(tool)}
								opacity="0.48"
								pointer-events="none"
							/>
						{/if}
					{:else if tool === 'team-a' || tool === 'team-k' || tool === 'team-b' || tool === 'team-r'}
						<circle
							cx={hoverPoint.x}
							cy={hoverPoint.y}
							r={playerRadius}
							fill={tool === 'team-a' || tool === 'team-k' ? '#1c1917' : '#fff'}
							stroke={tool === 'team-a' || tool === 'team-k' ? '#fff' : '#1c1917'}
							stroke-width={playerStrokeWidth}
							opacity="0.55"
							pointer-events="none"
						/>
						<text
							x={hoverPoint.x}
							y={hoverPoint.y + 3.4}
							text-anchor="middle"
							fill={tool === 'team-a' || tool === 'team-k' ? '#fff' : '#1c1917'}
							font-size="8.925"
							font-weight="900"
							opacity="0.65"
							pointer-events="none">{tool.slice(-1).toUpperCase()}</text
						>
					{:else if tool === 'ball'}
						<image
							href="/images/football.png"
							x={(placementSnapX ?? hoverPoint.x) - footballSize / 2}
							y={hoverPoint.y - footballSize / 2}
							width={footballSize}
							height={footballSize}
							opacity="0.58"
							pointer-events="none"
						/>
					{:else if tool === 'deflag'}
						<image
							href={deflagImage(deflagPlacementColor)}
							x={hoverPoint.x - deflagSize / 2}
							y={hoverPoint.y - deflagSize / 2}
							width={deflagSize}
							height={deflagSize}
							opacity="0.58"
							pointer-events="none"
						/>
					{:else if tool === 'flag'}
						<image
							href="/images/penalty-flag.png"
							x={hoverPoint.x - foulFlagSize / 2}
							y={hoverPoint.y - foulFlagSize / 2}
							width={foulFlagSize}
							height={foulFlagSize}
							opacity="0.58"
							pointer-events="none"
						/>
					{:else if tool === 'event'}
						<g opacity="0.58" pointer-events="none">
							<rect
								x={hoverPoint.x - eventTagWidth / 2}
								y={hoverPoint.y - eventTagHeight / 2}
								width={eventTagWidth}
								height={eventTagHeight}
								fill="#fff"
								stroke="#1c1917"
								stroke-width="2.25"
							/>
							<text x={hoverPoint.x} y={hoverPoint.y + 3.5} text-anchor="middle" fill="#1c1917" font-size="9" font-weight="900">EVENT</text>
						</g>
					{/if}
				{/if}

				{#each guides as guide}
					<g
						data-layer-type="guide"
						data-layer-id={guide.id}
						data-field-element
						data-field-type="guide"
						role="button"
						tabindex="0"
						aria-label={`${guideLabel(guide)}, double-click to format`}
						on:pointerdown|stopPropagation={(event) => beginOnGuide(event, guide)}
						on:pointerenter={() => (hoveringElement = tool !== 'ball')}
						on:pointerleave={() => (hoveringElement = false)}
						on:dblclick|stopPropagation={(event) => startEditingGuide(event, guide)}
						on:keydown|stopPropagation={(event) => handleGuideKeydown(event, guide)}
						class="focus:outline-none"
						class:cursor-pointer={tool !== 'free-draw' && !isDragging('guide', guide.id)}
						class:cursor-grabbing={tool !== 'free-draw' && isDragging('guide', guide.id)}
					>
						<line x1={guide.x} y1={fieldTop} x2={guide.x} y2={fieldBottom} stroke="transparent" stroke-width="28" />
						<line
							x1={guide.x}
							y1={fieldTop + guideSidelineInset}
							x2={guide.x}
							y2={fieldBottom - guideSidelineInset}
							stroke={renderedGuideColor(guide)}
							stroke-width={guideStrokeWidth}
							stroke-dasharray={renderedGuideDash(guide)}
							stroke-linecap={guide.style === 'dotted' ? 'round' : 'square'}
							pointer-events="none"
						/>
					</g>
				{/each}

				<g data-field-x-layer aria-hidden="true" pointer-events="none">
					{#if fieldSettings.showTenYardMarker}
						{#each fieldLayout.tenYardXs as yards}
							<text
								x={xForYards(yards)}
								y={fieldTop + fieldHeight / 2 + 7}
								text-anchor="middle"
								fill="rgba(255,255,255,0.9)"
								font-size="24"
								font-weight="900">×</text
							>
						{/each}
					{/if}
					{#if fieldSettings.showFourteenYardX}
						{#each fieldLayout.fourteenYardXs as yards}
							<text
								x={xForYards(yards)}
								y={fieldTop + fieldHeight / 2 + 7}
								text-anchor="middle"
								fill="rgba(255,255,255,0.9)"
								font-size="24"
								font-weight="900">×</text
							>
						{/each}
					{/if}
				</g>

				<!-- Keep fixtures in one layer so z-ordering never detaches them from Svelte's visibility blocks. -->
				<g data-field-fixtures-layer pointer-events="none">
					{#key fieldSettings.fieldType}
						{#if fieldSettings.showPylons}
							{#each fieldLayout.endZonePylonYards as yards}
								{#each [fieldTop, fieldBottom] as pylonY}
									<rect
										data-field-fixture="pylon"
										x={xForYards(yards) - 3.5}
										y={pylonY - 3.5}
										width="7"
										height="7"
										fill="#f97316"
										stroke="#fff"
										stroke-width="1.5"
										pointer-events="none"
									/>
								{/each}
							{/each}
							{#if fieldSettings.showHashes}
								{#each fieldLayout.endLinePylonFractions as yFraction}
									{#each [fieldLeft - 7, fieldRight + 7] as pylonX}
										<rect
											data-field-fixture="pylon"
											x={pylonX - 3.5}
											y={fieldTop + fieldHeight * yFraction - 3.5}
											width="7"
											height="7"
											fill="#f97316"
											stroke="#fff"
											stroke-width="1.5"
											pointer-events="none"
										/>
									{/each}
								{/each}
							{/if}
						{/if}
					{/key}
				</g>

				{#each paths as path}
					{@const start = pathStart(path)}
					<g data-layer-type="path" data-layer-id={path.id}>
						{#if path.kind === 'pass' || path.kind === 'kick'}
							<path
								data-field-element
								data-field-type="path"
								d={pathData(path.kind, start, path.end)}
								fill="none"
								stroke="transparent"
								stroke-width="32"
								role="button"
								tabindex="0"
								aria-label={`${path.kind} line`}
								class="focus:outline-none"
								class:cursor-pointer={tool !== 'free-draw' && !isDragging('path', path.id)}
								class:cursor-grabbing={tool !== 'free-draw' && isDragging('path', path.id)}
								on:pointerenter={() => (hoveringElement = true)}
								on:pointerleave={() => (hoveringElement = false)}
								on:pointerdown|stopPropagation={(event) => beginOnPath(event, path)}
								on:dblclick|stopPropagation={(event) => startEditingPath(event, path)}
								on:keydown={(event) => handlePathKeydown(event, path)}
							/>
							<g pointer-events="none">
								<path
									d={airShadowPath(start, path.end)}
									fill="none"
									stroke="#10291b"
									stroke-width={path.kind === 'kick' ? 7 : 5}
									opacity="0.24"
									filter="url(#builder-air-shadow)"
								/>
								{#each airborneSegments(path.kind, start, path.end, path.style) as segment}
									<path d={segment.d} fill="none" stroke={guideColor(path.color)} stroke-width={segment.width} stroke-linecap={segment.linecap} />
								{/each}
								<path
									d={pathData(path.kind, start, path.end)}
									fill="none"
									stroke={guideColor(path.color)}
									stroke-width="0.01"
									marker-end={pathMarker(path.kind)}
								/>
							</g>
						{:else}
							<line
								data-field-element
								data-field-type="path"
								x1={start.x}
								y1={start.y}
								x2={path.end.x}
								y2={path.end.y}
								stroke="transparent"
								stroke-width="32"
								role="button"
								tabindex="0"
								aria-label={`${path.kind} line`}
								class="focus:outline-none"
								class:cursor-pointer={tool !== 'free-draw' && !isDragging('path', path.id)}
								class:cursor-grabbing={tool !== 'free-draw' && isDragging('path', path.id)}
								on:pointerenter={() => (hoveringElement = true)}
								on:pointerleave={() => (hoveringElement = false)}
								on:pointerdown|stopPropagation={(event) => beginOnPath(event, path)}
								on:dblclick|stopPropagation={(event) => startEditingPath(event, path)}
								on:keydown={(event) => handlePathKeydown(event, path)}
							/>
							<line
								x1={start.x}
								y1={start.y}
								x2={path.end.x}
								y2={path.end.y}
								stroke={guideColor(path.color)}
								stroke-width={path.kind === 'line' ? plainLineStrokeWidth : pathStrokeWidth}
								stroke-linecap={path.style === 'dotted' ? 'round' : 'square'}
								stroke-dasharray={guideDash(path.style)}
								marker-end={pathMarker(path.kind)}
								pointer-events="none"
							/>
						{/if}
						{#if isArrowPath(path.kind)}
							<circle
								data-field-element
								data-field-type="path"
								data-path-endpoint="start"
								cx={start.x}
								cy={start.y}
								r="14"
								fill="transparent"
								pointer-events="all"
								role="button"
								tabindex="-1"
								aria-label={`Move ${path.kind} origin`}
								class:cursor-pointer={tool !== 'free-draw' && !isDragging('path', path.id)}
								class:cursor-grabbing={tool !== 'free-draw' && isDragging('path', path.id)}
								on:pointerenter={() => (hoveringElement = true)}
								on:pointerleave={() => (hoveringElement = false)}
								on:pointerdown|stopPropagation={(event) => beginOnPath(event, path, 'start')}
								on:dblclick|stopPropagation={(event) => startEditingPath(event, path)}
								on:keydown={(event) => handlePathKeydown(event, path)}
							/>
							<circle
								data-field-element
								data-field-type="path"
								data-path-endpoint="end"
								cx={path.end.x}
								cy={path.end.y}
								r="26"
								fill="transparent"
								pointer-events="all"
								role="button"
								tabindex="-1"
								aria-label={`Move ${path.kind} destination`}
								class:cursor-pointer={tool !== 'free-draw' && !isDragging('path', path.id)}
								class:cursor-grabbing={tool !== 'free-draw' && isDragging('path', path.id)}
								on:pointerenter={() => (hoveringElement = true)}
								on:pointerleave={() => (hoveringElement = false)}
								on:pointerdown|stopPropagation={(event) => beginOnPath(event, path, 'end')}
								on:dblclick|stopPropagation={(event) => startEditingPath(event, path)}
								on:keydown={(event) => handlePathKeydown(event, path)}
							/>
						{/if}
					</g>
				{/each}
				{#if drawing}
					{#if drawing.kind === 'pass' || drawing.kind === 'kick'}
						<g opacity="0.65" pointer-events="none">
							<path
								d={airShadowPath(drawing.start, drawing.end)}
								fill="none"
								stroke="#10291b"
								stroke-width={drawing.kind === 'kick' ? 7 : 5}
								opacity="0.24"
								filter="url(#builder-air-shadow)"
							/>
							{#each airborneSegments(drawing.kind, drawing.start, drawing.end, defaultPathStyle(drawing.kind)) as segment}
								<path
									d={segment.d}
									fill="none"
									stroke={defaultPathColor(drawing.kind)}
									stroke-width={segment.width}
									stroke-linecap={segment.linecap}
								/>
							{/each}
							<path
								d={pathData(drawing.kind, drawing.start, drawing.end)}
								fill="none"
								stroke={defaultPathColor(drawing.kind)}
								stroke-width="0.01"
								marker-end={pathMarker(drawing.kind)}
							/>
						</g>
					{:else}
						<line
							x1={drawing.start.x}
							y1={drawing.start.y}
							x2={drawing.end.x}
							y2={drawing.end.y}
							stroke={defaultPathColor(drawing.kind)}
							stroke-width={drawing.kind === 'line' ? plainLineStrokeWidth : pathStrokeWidth}
							stroke-linecap={defaultPathStyle(drawing.kind) === 'dotted' ? 'round' : 'square'}
							stroke-dasharray={guideDash(defaultPathStyle(drawing.kind))}
							marker-end={pathMarker(drawing.kind)}
							opacity="0.65"
							pointer-events="none"
						/>
					{/if}
				{/if}

				{#each markers as marker}
					<g
						data-layer-type="marker"
						data-layer-id={marker.id}
						data-field-element
						data-field-type="marker"
						data-field-kind={marker.kind}
						on:pointerdown|stopPropagation={(event) => beginOnMarker(event, marker)}
						on:pointerenter={() => (hoveringElement = !(isGuideTool(tool) && marker.kind === 'ball'))}
						on:pointerleave={() => (hoveringElement = false)}
						on:dblclick|stopPropagation={(event) => startEditingMarker(event, marker)}
						on:keydown|stopPropagation={(event) => handleMarkerKeydown(event, marker)}
						role="button"
						tabindex={isEditableMarker(marker) ? 0 : -1}
						aria-label={isTeamMarker(marker)
							? `${marker.label}, double-click to rename`
							: marker.kind === 'event'
								? `${marker.label}, double-click to edit`
								: marker.kind === 'flag'
									? `${marker.label ? `${marker.label}, ` : ''}penalty flag, double-click to add penalty text`
									: marker.kind === 'deflag'
										? `${marker.label ? `${marker.label}, ` : ''}flag belt, double-click to add text or change color`
										: marker.kind === 'ball'
											? `${marker.label ? `${marker.label}, ` : ''}football, double-click to add text`
											: marker.kind}
						class:cursor-pointer={tool !== 'free-draw' && !isDragging('marker', marker.id)}
						class:cursor-grabbing={tool !== 'free-draw' && isDragging('marker', marker.id)}
						class:focus:outline-none={isEditableMarker(marker)}
					>
						{#if isTeamMarker(marker)}
							<circle cx={marker.x} cy={marker.y} r={playerRadius + markerHitPadding} fill="transparent" pointer-events="all" />
						{:else if marker.kind === 'ball'}
							<ellipse cx={marker.x} cy={marker.y} rx={footballSize * 0.5} ry={footballSize * 0.34} fill="transparent" pointer-events="all" />
						{:else if marker.kind === 'deflag'}
							<rect
								x={marker.x - deflagSize * 0.46}
								y={marker.y - deflagSize * 0.38}
								width={deflagSize * 0.92}
								height={deflagSize * 0.76}
								fill="transparent"
								pointer-events="all"
							/>
						{:else if marker.kind === 'event'}
							<rect
								x={marker.x - eventWidth(marker.label) / 2 - markerHitPadding}
								y={marker.y - eventTagHeight / 2 - markerHitPadding}
								width={eventWidth(marker.label) + markerHitPadding * 2}
								height={eventTagHeight + markerHitPadding * 2}
								fill="transparent"
								pointer-events="all"
							/>
						{:else}
							<ellipse
								cx={marker.x}
								cy={marker.y}
								rx={foulFlagSize * 0.42}
								ry={foulFlagSize * 0.53}
								transform={`rotate(-24 ${marker.x} ${marker.y})`}
								fill="transparent"
								pointer-events="all"
							/>
						{/if}
						{#if marker.kind === 'team-a' || marker.kind === 'team-k'}
							<circle cx={marker.x} cy={marker.y} r={playerRadius} fill="#1c1917" stroke="#fff" stroke-width={playerStrokeWidth} />
							<text
								x={marker.x}
								y={marker.y + 3.4}
								text-anchor="middle"
								fill="#fff"
								font-size={marker.label && marker.label.length >= 4 ? 7.65 : 8.925}
								font-weight="900"
								pointer-events="none">{marker.label}</text
							>
						{:else if marker.kind === 'team-b' || marker.kind === 'team-r'}
							<circle cx={marker.x} cy={marker.y} r={playerRadius} fill="#fff" stroke="#1c1917" stroke-width={playerStrokeWidth} />
							<text
								x={marker.x}
								y={marker.y + 3.4}
								text-anchor="middle"
								fill="#1c1917"
								font-size={marker.label && marker.label.length >= 4 ? 7.65 : 8.925}
								font-weight="900"
								pointer-events="none">{marker.label}</text
							>
						{:else if marker.kind === 'ball'}
							<image
								href="/images/football.png"
								x={marker.x - footballSize / 2}
								y={marker.y - footballSize / 2}
								width={footballSize}
								height={footballSize}
								pointer-events="none"
							/>
						{:else if marker.kind === 'deflag'}
							<image
								href={deflagImage(marker.color)}
								x={marker.x - deflagSize / 2}
								y={marker.y - deflagSize / 2}
								width={deflagSize}
								height={deflagSize}
								pointer-events="none"
							/>
						{:else if marker.kind === 'event'}
							<rect
								x={marker.x - eventWidth(marker.label) / 2}
								y={marker.y - eventTagHeight / 2}
								width={eventWidth(marker.label)}
								height={eventTagHeight}
								fill="#fff"
								stroke="#1c1917"
								stroke-width="2.25"
								pointer-events="none"
							/>
							<text x={marker.x} y={marker.y + 3.5} text-anchor="middle" fill="#1c1917" font-size="8.5" font-weight="900" pointer-events="none"
								>{marker.label}</text
							>
						{:else}
							<image
								href="/images/penalty-flag.png"
								x={marker.x - foulFlagSize / 2}
								y={marker.y - foulFlagSize / 2}
								width={foulFlagSize}
								height={foulFlagSize}
								pointer-events="none"
							/>
						{/if}
						{#if marker.label && ['ball', 'flag', 'deflag'].includes(marker.kind)}
							{@const labelLines = penaltyLabelLines(marker.label)}
							<text
								x={marker.x}
								y={markerDescriptionY(marker)}
								text-anchor="middle"
								fill="#fff"
								stroke="#1c1917"
								stroke-width="2"
								paint-order="stroke"
								font-size="8"
								font-weight="900"
								pointer-events="none"
							>
								{#each labelLines as line, lineIndex}
									<tspan x={marker.x} dy={lineIndex === 0 ? 0 : 9}>{line}</tspan>
								{/each}
							</text>
						{/if}
					</g>
				{/each}

				<!-- Keep one Svelte-owned drawing layer above every field element. Moving individual strokes can detach them from keyed state. -->
				<g data-free-drawing-layer pointer-events="none">
					{#each freeStrokes as stroke (stroke.id)}
						{#if stroke.points.length === 1}
							<circle
								data-free-drawing
								cx={stroke.points[0].x}
								cy={stroke.points[0].y}
								r={(stroke.width ?? freeDrawStrokeWidth) * 0.85}
								fill={drawingColor(stroke.color)}
							/>
						{:else}
							<path
								data-free-drawing
								d={freehandPath(stroke.points)}
								fill="none"
								stroke={drawingColor(stroke.color)}
								stroke-width={stroke.width ?? freeDrawStrokeWidth}
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					{/each}
					{#if activeFreeStroke}
						{#if activeFreeStroke.points.length === 1}
							<circle
								data-free-drawing
								cx={activeFreeStroke.points[0].x}
								cy={activeFreeStroke.points[0].y}
								r={(activeFreeStroke.width ?? freeDrawStrokeWidth) * 0.85}
								fill={drawingColor(activeFreeStroke.color)}
							/>
						{:else}
							<path
								data-free-drawing
								d={freehandPath(activeFreeStroke.points)}
								fill="none"
								stroke={drawingColor(activeFreeStroke.color)}
								stroke-width={activeFreeStroke.width ?? freeDrawStrokeWidth}
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						{/if}
					{/if}
				</g>
			</svg>

			{#if editingMarker}
				<form
					bind:this={editorElement}
					class="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-white p-1 shadow-xl ring-2 ring-stone-900"
					class:w-48={editingMarker.kind === 'deflag'}
					style:left={`${editorLeft(editingMarker)}%`}
					style:top={`${editorTop(editingMarker)}%`}
					on:submit|preventDefault={commitMarkerEditor}
				>
					<label for="marker-label" class="sr-only"
						>{isTeamMarker(editingMarker)
							? 'Player name'
							: editingMarker.kind === 'event'
								? 'Event label'
								: markerDescriptionName(editingMarker)}</label
					>
					<input
						bind:this={editInput}
						bind:value={editValue}
						id="marker-label"
						maxlength={markerLabelMaxLength(editingMarker)}
						placeholder={isTeamMarker(editingMarker) || editingMarker.kind === 'event' ? undefined : markerDescriptionPlaceholder(editingMarker)}
						aria-label={isTeamMarker(editingMarker)
							? 'Player name'
							: editingMarker.kind === 'event'
								? 'Event label'
								: markerDescriptionName(editingMarker)}
						class="mx-auto block h-8 border-0 bg-stone-100 px-2 text-center text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-stone-500"
						class:w-16={isTeamMarker(editingMarker)}
						class:w-40={!isTeamMarker(editingMarker) && editingMarker.kind !== 'deflag'}
						class:w-full={editingMarker.kind === 'deflag'}
					/>
					{#if editingMarker.kind === 'deflag'}
						<div class="mt-1 flex justify-center gap-1" role="group" aria-label="Flag belt color">
							{#each deflagColors as option}
								<button
									type="button"
									title={option.label}
									aria-label={`${option.label} flags`}
									aria-pressed={(editingMarker.color ?? 'red') === option.id}
									on:click={() => updateDeflagColor(option.id)}
									class="h-6 w-6 cursor-pointer border border-stone-600 ring-offset-1 ring-offset-white hover:ring-1 hover:ring-stone-500"
									class:ring-2={(editingMarker.color ?? 'red') === option.id}
									class:ring-stone-950={(editingMarker.color ?? 'red') === option.id}
									style:background={option.value}
								></button>
							{/each}
						</div>
					{/if}
				</form>
			{/if}

			{#if (editingGuide || editingPath) && lineEditorPoint}
				<form
					bind:this={editorElement}
					class="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-white p-2 shadow-xl ring-2 ring-stone-900"
					style:left={`${Math.max(16, Math.min(84, lineEditorPoint.x / 10))}%`}
					style:top={`${Math.max(12, Math.min(88, (lineEditorPoint.y / 484) * 100))}%`}
					on:submit|preventDefault={commitActiveEditor}
					aria-label="Line format"
				>
					<div class="flex gap-1" aria-label="Line color">
						{#each guideColors as option}
							<button
								type="button"
								title={option.label}
								aria-label={option.label}
								aria-pressed={guideEditColor === option.id}
								on:click={() => updateGuideColor(option.id)}
								class="h-5 w-5 cursor-pointer border-2 border-white shadow-sm ring-1 ring-stone-400"
								class:!ring-2={guideEditColor === option.id}
								class:!ring-stone-950={guideEditColor === option.id}
								style:background-color={option.value}
							></button>
						{/each}
					</div>
					<div class="flex gap-px bg-stone-400 p-px" aria-label="Line type">
						{#each guideStyles as styleOption}
							<button
								type="button"
								title={styleOption}
								aria-label={`${styleOption} line`}
								aria-pressed={guideEditStyle === styleOption}
								on:click={() => updateGuideStyle(styleOption)}
								class="flex h-5 w-8 cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white"
								class:!bg-stone-900={guideEditStyle === styleOption}
								class:!text-white={guideEditStyle === styleOption}
							>
								<svg viewBox="0 0 24 6" class="h-2 w-6" aria-hidden="true">
									<line
										x1="1"
										y1="3"
										x2="23"
										y2="3"
										stroke="currentColor"
										stroke-width="2"
										stroke-dasharray={styleOption === 'dashed' ? '6 3' : styleOption === 'dotted' ? '1 3' : undefined}
										stroke-linecap={styleOption === 'dotted' ? 'round' : 'square'}
									/>
								</svg>
							</button>
						{/each}
					</div>
					<button
						type="button"
						aria-label="Delete line"
						on:click={deleteEditingLine}
						class="flex h-5 w-6 cursor-pointer items-center justify-center bg-stone-900 text-white hover:bg-red-700"
					>
						<img src="/images/trash-can.png" alt="" class="h-4 w-4 object-contain invert" draggable="false" />
					</button>
				</form>
			{/if}

			{#if deleteTarget && deletePosition}
				<button
					bind:this={deleteButtonElement}
					type="button"
					title="Delete element"
					aria-label="Delete element"
					on:pointerdown|preventDefault|stopPropagation
					on:click|stopPropagation={deleteHoveredElement}
					class="absolute z-20 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center border-2 border-white bg-stone-900 text-white shadow-lg hover:bg-red-700"
					style:left={`${deletePosition.x / 10}%`}
					style:top={`${(deletePosition.y / 484) * 100}%`}
				>
					<img src="/images/trash-can.png" alt="" class="h-4 w-4 object-contain invert" draggable="false" />
				</button>
			{/if}
		</div>
	</div>
</section>

{#snippet helpToolCard(item: ToolOption)}
	<div class="flex h-full gap-3 border border-stone-300 bg-white p-3">
		<div class="flex h-11 w-11 shrink-0 items-center justify-center">
			{#if ['team-a', 'team-k', 'team-b', 'team-r'].includes(item.id)}
				<span
					class="flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-[9px] font-black"
					class:border-white={item.id === 'team-a' || item.id === 'team-k'}
					class:bg-stone-900={item.id === 'team-a' || item.id === 'team-k'}
					class:text-white={item.id === 'team-a' || item.id === 'team-k'}
					class:border-stone-900={item.id === 'team-b' || item.id === 'team-r'}
					class:bg-white={item.id === 'team-b' || item.id === 'team-r'}
					class:text-stone-900={item.id === 'team-b' || item.id === 'team-r'}>{item.symbol}-1</span
				>
			{:else if item.image}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<img src={item.image} alt="" class="h-9 w-9 object-contain" draggable="false" />
				</div>
			{:else if item.icon === 'event'}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<svg viewBox="0 0 24 24" class="h-8 w-8" aria-hidden="true">
						<path d="M4 5h16v11H9l-4 3v-3H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
						<path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2" />
					</svg>
				</div>
			{:else if item.icon === 'line-of-scrimmage' || item.icon === 'line-to-gain'}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<span class="relative block h-9 w-5 border border-stone-900 bg-[#356f49]" aria-hidden="true">
						<span
							class="absolute top-0.5 bottom-0.5 left-1/2 -translate-x-1/2 border-l-2"
							class:border-dashed={item.icon === 'line-of-scrimmage'}
							class:border-white={item.icon === 'line-of-scrimmage'}
							class:border-yellow-400={item.icon === 'line-to-gain'}
						></span>
					</span>
				</div>
			{/if}
		</div>
		<div class="min-w-0 text-sm">
			<div class="flex flex-wrap items-center gap-2">
				<h4 class="font-black">{item.label}</h4>
				<span class="bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{item.shortcutKeys.join(' + ')}</span>
			</div>
			<p class="mt-1 leading-snug text-stone-600">{toolHelp[item.id]}</p>
		</div>
	</div>
{/snippet}

{#if showNewPrompt}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<button
			type="button"
			aria-label="Continue editing current play"
			disabled={actionInProgress === 'save'}
			on:click={() => (showNewPrompt = false)}
			class="absolute inset-0 cursor-default bg-stone-950/70 backdrop-blur-[1px] disabled:cursor-wait"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="new-play-title"
			aria-describedby="new-play-description"
			class="relative z-10 w-full max-w-sm border-2 border-stone-950 bg-stone-50 text-stone-800 shadow-2xl"
		>
			<header class="flex items-center justify-between border-b-2 border-stone-900 bg-stone-900 px-4 py-2.5 text-white">
				<h2 id="new-play-title" class="text-lg font-black tracking-tight">Start a New Play?</h2>
				<button
					bind:this={newPromptCloseButton}
					type="button"
					aria-label="Continue editing current play"
					disabled={actionInProgress === 'save'}
					on:click={() => (showNewPrompt = false)}
					class="flex h-7 w-7 cursor-pointer items-center justify-center bg-white text-lg font-black text-stone-900 hover:bg-stone-200 disabled:cursor-wait disabled:opacity-50"
					>×</button
				>
			</header>
			<div class="p-4">
				<p id="new-play-description" class="text-sm leading-relaxed text-stone-600">
					This play builder has unsaved changes. Save the collection first, or discard those changes and open a blank play builder.
				</p>
				<div class="mt-5 flex justify-end gap-2">
					<button
						type="button"
						disabled={actionInProgress === 'save'}
						on:click={openBlankBoard}
						class="h-9 cursor-pointer border border-stone-500 bg-white px-4 text-xs font-black tracking-wide text-stone-800 uppercase hover:bg-stone-200 disabled:cursor-wait disabled:opacity-50"
					>
						Discard
					</button>
					<button
						type="button"
						disabled={actionInProgress === 'save'}
						on:click={saveFromNewPrompt}
						class="h-9 cursor-pointer bg-stone-900 px-4 text-xs font-black tracking-wide text-white uppercase hover:bg-stone-700 disabled:cursor-wait disabled:opacity-60"
					>
						{actionInProgress === 'save' ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showSettings}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
		<button
			type="button"
			aria-label="Close field settings"
			on:click={() => (showSettings = false)}
			class="absolute inset-0 cursor-default bg-stone-950/25"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="play-builder-settings-title"
			class="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto border-2 border-stone-950 bg-white/80 text-stone-800 shadow-2xl backdrop-blur-[1px]"
		>
			<header class="sticky top-0 z-10 flex items-center justify-between border-b-2 border-stone-900 bg-stone-900 px-5 py-3 text-white">
				<div>
					<h2 id="play-builder-settings-title" class="text-xl font-black tracking-tight sm:text-2xl">Field Settings</h2>
					<p class="text-xs text-stone-300">Settings for {playEntries[activePlayIndex]?.name ?? 'this play'}.</p>
				</div>
				<button
					bind:this={settingsCloseButton}
					type="button"
					aria-label="Close settings"
					on:click={() => (showSettings = false)}
					class="flex h-9 w-9 cursor-pointer items-center justify-center bg-white text-xl font-black text-stone-900 hover:bg-stone-200">×</button
				>
			</header>

			<div class="space-y-6 p-5 sm:p-6">
				<section>
					<h3 class="mb-2 text-sm font-black tracking-wide uppercase">Field Type</h3>
					<div class="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Field type">
						{#each fieldTypeOptions as option}
							<button
								type="button"
								role="radio"
								aria-checked={fieldSettings.fieldType === option.id}
								on:click={() => updateFieldSetting('fieldType', option.id)}
								class="cursor-pointer border-2 border-stone-400 bg-white/75 p-3 text-left hover:border-stone-900 hover:bg-white/90 aria-checked:border-stone-950 aria-checked:bg-stone-900 aria-checked:text-white"
							>
								<span class="flex items-baseline justify-between gap-2">
									<strong class="text-sm font-black">{option.label}</strong>
									<span class="text-[10px] font-bold opacity-75">{option.dimensions}</span>
								</span>
								<span class="mt-1 block text-xs leading-snug opacity-75">{option.description}</span>
							</button>
						{/each}
					</div>
				</section>

				<section>
					<h3 class="mb-2 text-sm font-black tracking-wide uppercase">Field Details</h3>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{#each fieldToggleOptions.filter((option) => option.fieldTypes.includes(fieldSettings.fieldType)) as option}
							<button
								type="button"
								role="switch"
								aria-checked={fieldSettings[option.key]}
								on:click={() => toggleFieldSetting(option.key)}
								class="flex cursor-pointer items-center gap-3 border border-stone-400 bg-white/75 p-3 text-left hover:border-stone-900 hover:bg-white/90"
							>
								<span
									class="relative h-5 w-9 shrink-0 border-2 border-stone-700 bg-stone-300 transition-colors"
									class:!bg-green-600={fieldSettings[option.key]}
								>
									<span
										class="absolute top-0.5 h-3 w-3 bg-white transition-[left]"
										class:left-0.5={!fieldSettings[option.key]}
										class:left-[18px]={fieldSettings[option.key]}
									></span>
								</span>
								<span class="min-w-0">
									<strong class="block text-xs font-black">{option.label}</strong>
									<span class="mt-0.5 block text-[11px] leading-snug text-stone-600">{option.description}</span>
								</span>
							</button>
						{/each}
					</div>
				</section>

				<section>
					<h3 class="mb-2 text-sm font-black tracking-wide uppercase">Grass Color</h3>
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="radiogroup" aria-label="Field color">
						{#each fieldColorOptions as option}
							<button
								type="button"
								role="radio"
								aria-checked={fieldSettings.fieldColor === option.id}
								on:click={() => updateFieldSetting('fieldColor', option.id)}
								class="cursor-pointer border-2 border-stone-400 bg-white/75 p-1.5 text-center hover:border-stone-950 aria-checked:border-stone-950 aria-checked:ring-2 aria-checked:ring-stone-950"
							>
								<span class="block h-9 border border-stone-800" style:background={option.field}></span>
								<span class="mt-1 block text-[10px] font-black">{option.label}</span>
							</button>
						{/each}
					</div>
				</section>

				<div class="flex flex-wrap items-center justify-between gap-3 border-t border-stone-300 pt-4">
					<p class="max-w-2xl text-xs leading-relaxed text-stone-600">
						Each play keeps its own field settings. A new play inherits the selected play’s settings, and Duplicate copies them with the diagram.
					</p>
					<button
						type="button"
						disabled={fieldSettingsAreDefault}
						on:click={resetFieldSettings}
						class="h-9 cursor-pointer border-2 border-stone-900 bg-white px-4 text-xs font-black tracking-wide uppercase hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
					>
						Revert to Defaults
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showHelp}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
		<button
			type="button"
			aria-label="Close play builder help"
			on:click={() => (showHelp = false)}
			class="absolute inset-0 cursor-default bg-stone-950/75 backdrop-blur-[1px]"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="play-builder-help-title"
			class="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto border-2 border-stone-950 bg-stone-50 text-stone-800 shadow-2xl"
		>
			<header class="sticky top-0 z-10 flex items-center justify-between border-b-2 border-stone-900 bg-stone-900 px-5 py-3 text-white">
				<div>
					<h2 id="play-builder-help-title" class="text-xl font-black tracking-tight sm:text-2xl">Play Builder Guide</h2>
					<p class="text-xs text-stone-300">Everything you need to diagram a NIRSA flag football play.</p>
				</div>
				<button
					bind:this={helpCloseButton}
					type="button"
					aria-label="Close help"
					on:click={() => (showHelp = false)}
					class="flex h-9 w-9 cursor-pointer items-center justify-center bg-white text-xl font-black text-stone-900 hover:bg-stone-200">×</button
				>
			</header>

			<div class="space-y-7 p-5 sm:p-7">
				<section>
					<h3 class="mb-2 border-b border-stone-300 pb-1 text-lg font-black">Start Here</h3>
					<div class="grid gap-3 text-sm leading-relaxed md:grid-cols-2">
						<p>
							<strong>Place:</strong> Choose a tool, then click the field. For routes and lines, click and drag from the starting point to the ending point.
						</p>
						<p>
							<strong>Move:</strong> Drag any placed element. When an arrow tool is selected, dragging from a player starts the arrow from—and keeps it
							attached to—that player.
						</p>
						<p>
							<strong>Edit:</strong> Double-click players, footballs, event tags, penalty flags, flag belts, routes, arrows, and cross-field lines to open
							their inline editor.
						</p>
						<p>
							<strong>Delete:</strong> Click an element to show its nearby trash button, or press <kbd>Del</kbd>. Use <kbd>Shift</kbd> +
							<kbd>Del</kbd> to clear everything.
						</p>
						<p>
							<strong>Undo/redo:</strong> Use the Undo button or <kbd>{primaryModifierKey}</kbd> + <kbd>Z</kbd>. Redo with
							<kbd>{primaryModifierKey}</kbd> + <kbd>Shift</kbd> +
							<kbd>Z</kbd>
							or <kbd>{primaryModifierKey}</kbd> + <kbd>Y</kbd>.
						</p>
						<p>
							<strong>Nothing is permanent until saved:</strong> Save creates a shareable URL. Opening somebody else’s URL lets you edit locally, but Save
							creates your own copy unless you created it in this browser session.
						</p>
					</div>
				</section>

				<section>
					<h3 class="mb-3 border-b border-stone-300 pb-1 text-lg font-black">Team Player Circles</h3>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{#each helpPlayerTools as item}
							{@render helpToolCard(item)}
						{/each}
					</div>
				</section>

				<section>
					<h3 class="mb-3 border-b border-stone-300 pb-1 text-lg font-black">Field Elements</h3>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{#each helpElementTools as item}
							{@render helpToolCard(item)}
						{/each}
					</div>
				</section>

				<section>
					<h3 class="mb-3 border-b border-stone-300 pb-1 text-lg font-black">Routes and Arrows</h3>
					<div class="grid gap-2 md:grid-cols-3">
						{#each helpRouteTools as item}
							{@render helpToolCard(item)}
						{/each}
					</div>
				</section>

				<section>
					<h3 class="mb-3 border-b border-stone-300 pb-1 text-lg font-black">Cross-Field Lines</h3>
					<div class="grid gap-2 md:grid-cols-2">
						{#each helpGuideTools as item}
							{@render helpToolCard(item)}
						{/each}
					</div>
				</section>

				<section>
					<h3 class="mb-3 border-b border-stone-300 pb-1 text-lg font-black">Free Drawing</h3>
					<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
						{@render helpToolCard(helpDrawTool)}
						<ul class="list-square space-y-2 border border-stone-300 bg-white p-4 pl-8 text-sm leading-relaxed">
							<li>
								<strong>Squiggle</strong> draws freehand; <strong>Straight</strong> creates a precise segment. A single click places a solid dot.
							</li>
							<li>Choose one of ten colors or press <kbd>1</kbd>–<kbd>0</kbd>. Left/right arrows cycle the palette while Draw is open.</li>
							<li>The line slider controls thickness. Every new dot or stroke keeps the selected color and thickness.</li>
							<li>Draw anywhere inside the builder’s black area except over the toolbar. Drawings always remain above field elements.</li>
							<li>
								<strong>Eraser</strong> removes every whole stroke touched while dragging. <strong>Clear</strong> or <kbd>C</kbd> removes drawings only.
							</li>
							<li>
								<strong>Surface/stylus eraser:</strong> Flip a supported pen over and press its eraser end against the builder. Dragging removes drawing
								strokes, while touching a player, field element, route, or cross-field line deletes it. One continuous eraser gesture is one Undo action.
							</li>
						</ul>
					</div>
				</section>

				<section>
					<h3 class="mb-2 border-b border-stone-300 pb-1 text-lg font-black">Snapping and the Default Setup</h3>
					<ul class="list-square grid gap-x-8 gap-y-2 pl-5 text-sm leading-relaxed md:grid-cols-2">
						<li>L.O.S., L.T.G., and football previews snap after resting near a valid marking for one second.</li>
						<li>
							Hold <kbd>Shift</kbd> while moving to snap instantly. Footballs prioritize cross-field lines; L.O.S. and L.T.G. prioritize footballs.
						</li>
						<li>Snap points automatically follow the markings available on the selected traditional, 4v4, or Unified field.</li>
						<li>
							<strong>Setup</strong> uses the selected field’s proper starting spot and first line to gain: A’s 14 to A’s 20 on traditional, A’s 10 to midfield
							on 4v4, or A’s 5 to midfield on Unified. A-1 begins five yards behind the football. One Undo restores the previous diagram.
						</li>
					</ul>
				</section>

				<section>
					<h3 class="mb-2 border-b border-stone-300 pb-1 text-lg font-black">Multiple Plays</h3>
					<div class="grid gap-3 text-sm leading-relaxed md:grid-cols-2">
						<p>
							<strong>Switch and add:</strong> Use the Play tabs in the lower-left corner to move between diagrams. The <strong>+</strong> button adds a
							new blank diagram named Play 2, Play 3, and so on. Each play builder can contain up to four plays. Scroll the tab row horizontally when the
							full play names exceed the available space.
						</p>
						<p>
							<strong>Manage:</strong> Double-click a Play tab to rename, duplicate, or delete it. A duplicated play includes all of its field elements
							and drawings. At least one play always remains. Adding, renaming, duplicating, and deleting plays can all be undone and redone.
						</p>
						<p>
							<strong>Save together:</strong> Save stores every play under the same shareable URL. Anyone opening that URL can switch through the complete
							set and can edit it locally before saving their own copy.
						</p>
						<p>
							<strong>Independent work:</strong> Each tab has its own diagram. Undo and redo follow the complete action order across every play and will
							switch tabs when restoring an action performed on another play.
						</p>
					</div>
				</section>

				<section>
					<h3 class="mb-2 border-b border-stone-300 pb-1 text-lg font-black">Field Settings</h3>
					<div class="grid gap-3 text-sm leading-relaxed md:grid-cols-2">
						<p>
							<strong>Settings:</strong> The gear button opens controls for field type, grass color, numbers, goal letters, end-zone text, pylons, hashes,
							Try/yard markers, and team boxes. Changes appear immediately and are included in PNG and PDF exports.
						</p>
						<p>
							<strong>Per play:</strong> Every play saves its own field settings. New plays inherit the active play’s settings, while Duplicate copies both
							the diagram and settings. Revert to Defaults restores the default details and green grass without changing the selected field type.
						</p>
						<p>
							<strong>Field types:</strong> Traditional is the 100 × 40-yard NIRSA field. 4v4 uses the 60 × 30-yard layout with a single midfield hash.
							Unified uses the 60 × 25-yard SONA/NIRSA layout with dashed no-run-zone lines and optional no-run-zone labels.
						</p>
						<p>
							<strong>Saved and shared:</strong> Field settings are stored with all plays under the shareable URL, so another viewer sees the same layout
							before making a local copy.
						</p>
					</div>
				</section>

				<section>
					<h3 class="mb-2 border-b border-stone-300 pb-1 text-lg font-black">Save, Share, and Export</h3>
					<div class="grid gap-3 text-sm leading-relaxed md:grid-cols-2 lg:grid-cols-4">
						<p>
							<strong>New:</strong> Opens a blank play builder immediately when the collection is saved, or asks you to Save or Discard unsaved changes
							first.
						</p>
						<p><strong>Save:</strong> Stores every play—including drawings—and changes the URL to the collection’s shareable address.</p>
						<p>
							<strong>Copy:</strong> Appears directly beside Save. After copying the shareable URL, the button turns green and reads “Copied!” for three
							seconds.
						</p>
						<p>
							<strong>PNG/PDF:</strong> PNG exports only the selected play. PDF exports every play in tab order on its own page. Both preserve the live
							builder’s typography and layer order.
						</p>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	.play-tabs-scroll {
		scrollbar-width: none;
	}
	.play-tabs-scroll::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}
	.drawing-cursor,
	.drawing-cursor [data-field-element] {
		cursor:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M5 26l3-8L23 3l6 6-15 15-9 2Z' fill='%23fff' stroke='%231c1917' stroke-width='2' stroke-linejoin='miter'/%3E%3Cpath d='m8 18 6 6' stroke='%231c1917' stroke-width='2'/%3E%3C/svg%3E")
				4 28,
			crosshair !important;
	}
</style>
