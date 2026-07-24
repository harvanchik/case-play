<script lang="ts">
	import { goto, replaceState } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { driver, type DriveStep, type Driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import {
		exportPlayBuilderPdf,
		exportPlayBuilderRaster,
		renderPlayBuilderCanvas,
		type ExportPrompt,
		type ExportPromptRun
	} from '$lib/play-builder-export';
	import {
		DEFAULT_PLAY_BUILDER_FIELD_SETTINGS,
		decodePlayBuilderDocument,
		defaultPlayBuilderFieldSettings,
		encodePlayBuilderDocument,
		formatPlayBuilderGameClock,
		PLAY_BUILDER_GAME_CLOCK_MAX_SECONDS,
		PLAY_BUILDER_GAME_QUARTERS,
		PLAY_BUILDER_MAX_PLAYS,
		PLAY_BUILDER_PLAY_NAME_MAX_LENGTH,
		PLAY_BUILDER_TEAM_BOX_LABEL_MAX_LENGTH,
		type DownMarkerValue,
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
		type OfficialKind,
		type PathKind,
		type PlayBuilderFieldColor,
		type PlayBuilderFieldSettings,
		type PlayBuilderFieldType,
		type PlayBuilderGameQuarter,
		type PlayBuilderScene,
		type PlayerKind,
		type Point,
		type SerializedPlayBuilderDocument
	} from '$lib/play-builder-scene';
	import HoverTooltip from './HoverTooltip.svelte';

	type Tool =
		| PlayerKind
		| OfficialKind
		| 'ball'
		| 'flag'
		| 'bean-bag'
		| 'deflag'
		| 'event'
		| 'laser'
		| 'free-draw'
		| 'run'
		| 'pass'
		| 'kick'
		| 'line-of-scrimmage'
		| 'line-to-gain';
	type SelectedTarget = { type: 'marker' | 'path' | 'guide'; id: number };
	type DragTarget =
		| { type: 'marker'; id: number; pointerStart: Point; elementStart: Point; moved: boolean; snapToMarkers?: boolean }
		| { type: 'guide'; id: number; pointerStart: Point; xStart: number; moved: boolean; fromDownMarker?: boolean }
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
	type ArrowKind = Extract<PathKind, 'run' | 'pass' | 'kick'>;
	type LaserColor = Extract<GuideColor, 'red' | 'green' | 'blue' | 'purple'>;
	type ToolbarPresetTool = 'deflag' | 'bean-bag' | 'laser' | ArrowKind | 'line-of-scrimmage' | 'line-to-gain';
	type FieldSide = 'a' | 'b';
	type ExportBackground = 'transparent' | 'grass' | 'color';
	type LaserDrawing = { points: Point[]; color: LaserColor; releasedAt: number | null };
	type ActiveLaserDrawing = { points: Point[]; color: LaserColor };
	const exportBackgroundOptions: { id: ExportBackground; label: string; description: string }[] = [
		{ id: 'transparent', label: 'Transparent', description: 'Field is surrounded by a transparent background.' },
		{ id: 'grass', label: 'Grassy', description: 'Field is surrounded by darker striped grass.' },
		{ id: 'color', label: 'Solid Color', description: 'Use the custom background color below.' }
	];
	const exportSettingsStorageKey = 'caseplay-play-builder-export-settings-v1';
	const toolPreferencesStorageKey = 'caseplay-play-builder-tool-preferences-v1';
	const laserFadeDuration = 500;

	export let initialDocument: SerializedPlayBuilderDocument | null = null;
	export let savedPlayId: string | null = null;
	export let exportPrompt: string | null = null;
	export let exportPromptSource: HTMLElement | null = null;
	export let viewOnly = false;

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
		[
			{
				id: 'official-r',
				label: 'Referee',
				symbol: 'R',
				shortcut: 'alt+r',
				shortcutKeys: ['Alt', 'R'],
				image: '/images/official-referee.webp'
			},
			{
				id: 'official-l',
				label: 'Line Judge',
				symbol: 'L',
				shortcut: 'alt+l',
				shortcutKeys: ['Alt', 'L'],
				image: '/images/official-line-judge.webp'
			},
			{
				id: 'official-b',
				label: 'Back Judge',
				symbol: 'B',
				shortcut: 'alt+b',
				shortcutKeys: ['Alt', 'B'],
				image: '/images/official-back-judge.webp'
			},
			{
				id: 'official-f',
				label: 'Field Judge',
				symbol: 'F',
				shortcut: 'alt+f',
				shortcutKeys: ['Alt', 'F'],
				image: '/images/official-field-judge.webp'
			}
		],
		[{ id: 'ball', label: 'Football', symbol: '', shortcut: 'o', shortcutKeys: ['O'], caption: 'Football', image: '/images/football.webp' }],
		[{ id: 'flag', label: 'Penalty Flag', symbol: '', shortcut: 'f', shortcutKeys: ['F'], caption: 'Penalty', image: '/images/penalty-flag.webp' }],
		[{ id: 'bean-bag', label: 'Bean Bag', symbol: '', shortcut: '', shortcutKeys: [], caption: 'Bean Bag', image: '/images/bean-bag-blue.webp' }],
		[{ id: 'deflag', label: 'Flag Belt', symbol: '', shortcut: 'l', shortcutKeys: ['L'], caption: 'Flag Belt', image: '/images/flag-belt.webp' }],
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
				shortcut: 'g',
				shortcutKeys: ['G'],
				caption: 'L.T.G.',
				icon: 'line-to-gain'
			}
		],
		[{ id: 'laser', label: 'Laser Pointer', symbol: '', shortcut: 'shift+l', shortcutKeys: ['Shift', 'L'], image: '/images/laser-pointer.png' }],
		[{ id: 'free-draw', label: 'Free Draw', symbol: '', shortcut: 'd', shortcutKeys: ['D'], caption: 'Draw', image: '/images/draw-pen.webp' }]
	];
	const tools = toolRows.flat();
	const helpPlayerTools = tools.filter((item) => ['team-a', 'team-k', 'team-b', 'team-r'].includes(item.id));
	const helpOfficialTools = tools.filter((item) => ['official-r', 'official-l', 'official-b', 'official-f'].includes(item.id));
	const helpElementTools = tools.filter((item) => ['ball', 'flag', 'bean-bag', 'deflag', 'event', 'run', 'pass', 'kick'].includes(item.id));
	const helpGuideTools = tools.filter((item) => ['line-of-scrimmage', 'line-to-gain'].includes(item.id));
	const helpDrawTool = tools.find((item) => item.id === 'free-draw')!;
	const toolHelp: Record<Tool, string> = {
		'team-a': 'Places Team A players as A-1, A-2, and so on. Double-click a player to rename it with up to four characters.',
		'team-k': 'Places kicking-team players as K-1, K-2, and so on. Double-click to rename.',
		'team-b': 'Places Team B players as B-1, B-2, and so on. Double-click to rename.',
		'team-r': 'Places receiving-team players as R-1, R-2, and so on. Double-click to rename.',
		'official-r': 'Places the Referee. Double-click the icon to add the official’s name beneath it.',
		'official-l': 'Places the Line Judge. Double-click the icon to add the official’s name beneath it.',
		'official-b': 'Places the Back Judge. Double-click the icon to add the official’s name beneath it.',
		'official-f': 'Places the Field Judge. Double-click the icon to add the official’s name beneath it.',
		ball: 'Places the football at the chosen spot on the field. Drag it to move it, or double-click to add an optional description beneath it.',
		flag: 'Marks a penalty spot. Double-click the flag to add or change the optional foul description shown beneath it.',
		'bean-bag': 'Marks a bean bag spot. Double-click the bean bag to add or change an optional description shown beneath it.',
		deflag:
			'Marks the deflagging spot. Double-click to add an optional description or choose the flag color; that color becomes the default for the next belts you place.',
		event:
			'Places a resizable text tag and immediately opens its editor. Use it for catches, first touching, possession changes, or any event that needs a label.',
		run: 'Drag from any point—or directly from a player—to draw a solid running route. Double-click the route to change its color and line style.',
		pass: 'Drag to draw a dashed forward-pass arc. Its curve, changing thickness, and shadow show the ball traveling through the air. Double-click to format it.',
		kick: 'Drag to draw a higher punt or kick arc. Double-click to change its color or line style.',
		'line-of-scrimmage': 'Places one L.O.S. Reformatting its color or style keeps it as the L.O.S.; placing it again replaces the prior line.',
		'line-to-gain':
			'Places one solid yellow L.T.G. with a linked down marker. Placing it again replaces the prior L.T.G.; select the marker to change the down.',
		laser:
			'Move for a fading trail, or click and drag to keep laser strokes visible until you leave Laser Pointer. Press C to clear laser drawings, or double-click the toolbar button to choose a neon color. Laser marks are not saved or exported.',
		'free-draw':
			'Draws annotations above every other element, including outside the field within the builder. Choose Straight or Squiggle, a color, and a thickness; tap for a dot, drag to draw, or erase whole strokes.'
	};
	const guideColors: { id: GuideColor; label: string; value: string }[] = [
		{ id: 'red', label: 'Red', value: '#ef4444' },
		{ id: 'orange', label: 'Orange', value: '#f97316' },
		{ id: 'yellow', label: 'Yellow', value: '#facc15' },
		{ id: 'green', label: 'Green', value: '#4ade80' },
		{ id: 'cyan', label: 'Cyan', value: '#22d3ee' },
		{ id: 'blue', label: 'Blue', value: '#2563eb' },
		{ id: 'purple', label: 'Purple', value: '#c084fc' },
		{ id: 'white', label: 'White', value: '#ffffff' },
		{ id: 'gray', label: 'Gray', value: '#9ca3af' },
		{ id: 'black', label: 'Black', value: '#000000' }
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
	const laserColors: { id: LaserColor; label: string; value: string }[] = [
		{ id: 'red', label: 'Neon red', value: '#ff1744' },
		{ id: 'green', label: 'Neon green', value: '#39ff14' },
		{ id: 'blue', label: 'Neon blue', value: '#00b7ff' },
		{ id: 'purple', label: 'Neon violet', value: '#c026ff' }
	];
	const guideStyles: GuideStyle[] = ['solid', 'dashed', 'dotted'];
	const downMarkerOptions: { id: DownMarkerValue; label: string }[] = [
		{ id: '1st', label: '1st' },
		{ id: '2nd', label: '2nd' },
		{ id: '3rd', label: '3rd' },
		{ id: '4th', label: '4th' },
		{ id: 'pat', label: 'P.A.T.' }
	];

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
		laserDrawings: LaserDrawing[];
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
	let actionInProgress: 'save' | 'png' | 'jpg' | 'webp' | 'pdf' | null = null;
	let actionMessage = '';
	let actionMessageTimer: ReturnType<typeof setTimeout> | null = null;
	let copyConfirmed = false;
	let copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
	let showHelp = false;
	let helpCloseButton: HTMLButtonElement;
	let showFeedback = false;
	let feedbackCloseButton: HTMLButtonElement;
	let builderRoot: HTMLElement;
	let tutorialDriver: Driver | null = null;
	let tutorialActive = false;
	let tutorialStepIndex = 0;
	let tutorialButtonBouncing = false;
	let activeTutorialSteps: TutorialStep[] = [];
	let tutorialSkipping = false;
	let tutorialAutoPlacementIndex = 0;
	let tutorialHasDrawnStroke = false;
	let tutorialHasMovedElement = false;
	let tutorialHasDeletedElement = false;
	let showSettings = false;
	let settingsCloseButton: HTMLButtonElement;
	let showExportSettings = false;
	let exportSettingsCloseButton: HTMLButtonElement;
	let exportBackground: ExportBackground = 'transparent';
	let exportBackgroundColor = '#244f38';
	let exportBackgroundOpacity = 1;
	let exportFieldBorderColor = '#1c1917';
	let exportFieldBorderOpacity = 0;
	let includeExportPrompt = Boolean(exportPrompt?.trim());
	let exportColorPicker: 'background' | 'border' | null = null;
	let exportSettingsHydrated = false;
	let toolPreferencesHydrated = false;
	let exportSettingsTop = 8;
	let exportSettingsRight = 8;
	let showNewPrompt = false;
	let newPromptCloseButton: HTMLButtonElement;
	let editingPlayId: number | null = null;
	let playNameValue = '';
	let playNameInput: HTMLInputElement;
	let playMenuElement: HTMLElement;
	let playStripElement: HTMLElement;
	let playMenuLeft = 0;
	let drawing: { kind: PathKind; start: Point; end: Point; pointerStart: Point; startMarkerId?: number; hasDragged: boolean } | null = null;
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
	let beanBagPlacementColor: GuideColor = 'blue';
	let arrowPlacementColors: Record<ArrowKind, GuideColor> = { run: 'white', pass: 'cyan', kick: 'blue' };
	let arrowPlacementStyles: Record<ArrowKind, GuideStyle> = { run: 'solid', pass: 'dashed', kick: 'dashed' };
	let guidePlacementColors: Record<'line-of-scrimmage' | 'line-to-gain', GuideColor> = { 'line-of-scrimmage': 'white', 'line-to-gain': 'yellow' };
	let guidePlacementStyles: Record<'line-of-scrimmage' | 'line-to-gain', GuideStyle> = { 'line-of-scrimmage': 'dashed', 'line-to-gain': 'solid' };
	let laserColor: LaserColor = 'red';
	let toolbarEditorTool: ToolbarPresetTool | null = null;
	let toolbarEditorTop = 0;
	let toolbarEditorElement: HTMLElement;
	let toolbarGuideYardage: number | '' = '';
	let toolbarGuideSide: FieldSide = 'a';
	let toolbarGuideHistorySaved = false;
	let toolbarGuideYardageInput: HTMLInputElement;
	let dragTarget: DragTarget | null = null;
	let editingMarkerId: number | null = null;
	let editingMarker: FieldMarker | undefined;
	let editValue = '';
	let editInput: HTMLInputElement;
	let editingGuideId: number | null = null;
	let editingGuide: FieldGuide | undefined;
	let editingPathId: number | null = null;
	let editingPath: FieldPath | undefined;
	let editingTeamBoxY: number | null = null;
	let editingTeamBoxIndex: number | null = null;
	let teamBoxEditValue = '';
	let teamBoxEditInput: HTMLInputElement;
	let editingScoreboard: 'clock' | null = null;
	let gameClockEditValue = '00:00';
	let gameClockEditDigits = '0000';
	let gameClockEditInput: HTMLInputElement;
	let scoreboardHistorySaved = false;
	let editingDownGuideId: number | null = null;
	let editingDownGuide: FieldGuide | undefined;
	let downYardageValue: number | '' = '';
	let downGuideSide: FieldSide = 'a';
	let downYardageHistorySaved = false;
	let losYardageValue: number | '' = '';
	let editingGuideSide: FieldSide = 'a';
	let losYardageHistorySaved = false;
	let guideYardageInput: HTMLInputElement;
	let suppressDownMarkerClick = false;
	let lineEditorPoint: Point | null = null;
	let guideEditColor: GuideColor = 'yellow';
	let guideEditStyle: GuideStyle = 'solid';
	let editorElement: Element;
	let deleteTarget: SelectedTarget | null = null;
	let deletePosition: Point | null = null;
	let deleteButtonElement: HTMLElement;
	let deleteTargetTimer: ReturnType<typeof setTimeout> | null = null;
	let hoverPoint: Point | null = null;
	let pointerOnField = false;
	let laserPointer: Point | null = null;
	let laserTrail: (Point & { createdAt: number })[] = [];
	let laserDrawings: LaserDrawing[] = [];
	let activeLaserDrawing: ActiveLaserDrawing | null = null;
	let laserDrawingPointerId: number | null = null;
	let laserTrailClock = 0;
	let laserTrailFrame: number | null = null;
	let hoveringElement = false;
	let placementSnapX: number | null = null;
	let placementSnapTimer: ReturnType<typeof setTimeout> | null = null;
	let lastPlacementHoverPoint: Point | null = null;
	let suppressNextClick = false;
	let primaryModifierKey = 'Ctrl';
	let alternateModifierKey = 'Alt';
	const displayedToolShortcutKeys = (item: ToolOption) =>
		item.shortcutKeys.map((key) => (key === 'Alt' ? alternateModifierKey : key === 'Ctrl' ? primaryModifierKey : key));
	let currentSceneKey = JSON.stringify(encodePlayBuilderDocument(loadedDocument));
	let savedSceneKey = currentSceneKey;
	let hasUnsavedChanges = false;
	type TutorialAction =
		| `tool:${Tool}`
		| 'tool:official'
		| `place:${Tool | PathKind}`
		| 'place:official'
		| `edit:${MarkerKind | PathKind | GuideKind}`
		| `label:${MarkerKind}`
		| 'color:bean-bag'
		| 'format-line'
		| 'draw-stroke'
		| 'move-element'
		| 'delete-element'
		| 'move-and-delete'
		| 'setup-default'
		| 'settings-open'
		| 'settings-field-type'
		| 'settings-field-color'
		| 'tutorial-new-play';
	type TutorialStep = DriveStep & { data?: { waitFor?: TutorialAction; nextLabel?: string } };
	const tutorialSeenKey = 'caseplay-play-builder-tutorial-seen-v1';
	$: editingMarker = markers.find((marker) => marker.id === editingMarkerId);
	$: editingGuide = guides.find((guide) => guide.id === editingGuideId);
	$: editingPath = paths.find((path) => path.id === editingPathId);
	$: editingDownGuide = guides.find((guide) => guide.id === editingDownGuideId && guide.kind === 'line-to-gain');
	$: lineOfScrimmageX = guides.find((guide) => guide.kind === 'line-of-scrimmage')?.x ?? null;
	$: currentLineToGain = guides.find((guide) => guide.kind === 'line-to-gain');
	$: if (exportSettingsHydrated) {
		try {
			localStorage.setItem(
				exportSettingsStorageKey,
				JSON.stringify({
					background: exportBackground,
					backgroundColor: exportBackgroundColor,
					backgroundOpacity: exportBackgroundOpacity,
					fieldBorderColor: exportFieldBorderColor,
					fieldBorderOpacity: exportFieldBorderOpacity
				})
			);
		} catch {
			// Keep the current in-memory settings if browser storage is unavailable.
		}
	}
	$: if (toolPreferencesHydrated) {
		try {
			localStorage.setItem(
				toolPreferencesStorageKey,
				JSON.stringify({
					drawColor: freeDrawColor,
					drawShape: freeDrawShape,
					drawThickness: Number(freeDrawThickness),
					flagBeltColor: deflagPlacementColor,
					beanBagColor: beanBagPlacementColor,
					arrowColors: arrowPlacementColors,
					arrowStyles: arrowPlacementStyles,
					guideColors: guidePlacementColors,
					guideStyles: guidePlacementStyles,
					laserColor
				})
			);
		} catch {
			// Keep the current in-memory preferences if browser storage is unavailable.
		}
	}
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
	const teamBoxExtraSetback = 12;
	let fieldLeft = 20;
	let fieldRight = 980;
	let fieldTop = 50;
	let fieldBottom = 434;
	let fieldWidth = fieldMaxWidth;
	let fieldHeight = fieldMaxHeight;
	const fieldLineWidth = 3;
	const playerRadius = 14.025;
	const playerStrokeWidth = 2.55;
	const officialSize = playerRadius * 3.3;
	const footballSize = 30;
	const deflagSize = 33.75;
	const foulFlagSize = 31.5;
	const beanBagSize = 31.5;
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
		teamBoxSetbackYards: number;
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
			teamBoxSetbackYards: 1.5,
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
			teamBoxSetbackYards: 1,
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
			teamBox: [15, 45],
			teamBoxSetbackYards: 1,
			endZonePylonYards: [0, 10, 50, 60],
			endLinePylonFractions: []
		},
		'nfl-flag': {
			totalYards: 70,
			widthYards: 30,
			goalLines: [10, 60],
			zoneLines: [10, 35, 60],
			shadedZones: [],
			hashLines: [],
			hashYFractions: [],
			threeYardMarkers: [20, 50],
			tenYardMarkers: [],
			tenYardXs: [],
			fourteenYardXs: [15, 55],
			thirtyYardMarkers: [],
			noRunLines: [15, 55],
			noRunZones: [
				[10, 15],
				[55, 60]
			],
			yardLabels: [],
			goalLabelYards: [],
			endZoneCenters: [5, 65],
			teamBox: [20, 50],
			teamBoxSetbackYards: 1.5,
			endZonePylonYards: [0, 10, 60, 70],
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
		{
			id: 'traditional',
			label: 'Traditional',
			dimensions: '100 × 40 yards',
			description: 'NIRSA 7v7 field with four 20-yard zones and 10-yard end zones.'
		},
		{ id: 'four-v-four', label: '4v4', dimensions: '60 × 30 yards', description: 'Two 20-yard playing zones and 10-yard end zones.' },
		{ id: 'unified', label: 'Unified', dimensions: '60 × 25 yards', description: 'SONA/NIRSA Unified field with 5-yard no-run zones.' },
		{ id: 'nfl-flag', label: 'NFL Flag', dimensions: '70 × 30 yards', description: 'NFL Flag field with 10-yard end zones and 5-yard no-run zones.' }
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
			| 'showDownMarker'
			| 'showLineOfScrimmageMarker'
		>;
		label: string;
		description: string;
		fieldTypes: PlayBuilderFieldType[];
	}[] = [
		{
			key: 'showYardNumbers',
			label: 'Yard Line Numbers',
			description: 'Show the 20- and 40-yard field numbers on both sidelines.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showYardNumbers',
			label: 'Yard Line Number',
			description: 'Show the 20-yard midfield number on both sidelines.',
			fieldTypes: ['four-v-four']
		},
		{
			key: 'showGoalLetters',
			label: 'Goal Line Letters',
			description: 'Show the G labels immediately inside each goal line.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showEndZoneText',
			label: 'End Zone Text',
			description: 'Show the vertical END ZONE labels.',
			fieldTypes: ['traditional', 'four-v-four', 'unified', 'nfl-flag']
		},
		{
			key: 'showPylons',
			label: 'End Zone Pylons',
			description: 'Show pylons at the end-line and goal-line corners.',
			fieldTypes: ['traditional', 'four-v-four', 'unified', 'nfl-flag']
		},
		{
			key: 'showHashes',
			label: 'Hash Marks',
			description: 'Show field hashes and their matching pylons behind the end zones.',
			fieldTypes: ['traditional', 'four-v-four']
		},
		{
			key: 'showThreeYardMarker',
			label: '3-Yard Try Line',
			description: 'Show a short mark three yards from each goal line.',
			fieldTypes: ['traditional', 'four-v-four']
		},
		{
			key: 'showThreeYardMarker',
			label: '2-Point Try Line',
			description: 'Show a short mark ten yards from each goal line.',
			fieldTypes: ['nfl-flag']
		},
		{
			key: 'showTenYardMarker',
			label: '10-Yard Try Line',
			description: 'Show a short mark ten yards from each goal line.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showTenYardMarker',
			label: '10-Yard X',
			description: 'Show the 10-yard X on each half of the field.',
			fieldTypes: ['four-v-four']
		},
		{
			key: 'showFourteenYardX',
			label: '14-Yard X',
			description: 'Show the 14-yard X on each half of the field.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showFourteenYardX',
			label: '5-Yard X',
			description: 'Show the 5-yard X on each half of the field.',
			fieldTypes: ['unified', 'nfl-flag']
		},
		{
			key: 'showThirtyYardMarker',
			label: '30-Yard Marker',
			description: 'Show a short mark at each 30-yard line.',
			fieldTypes: ['traditional']
		},
		{
			key: 'showNoRunZoneText',
			label: 'No-Run Zone Text',
			description: 'Label each shaded no-run zone.',
			fieldTypes: ['unified', 'nfl-flag']
		},
		{
			key: 'showTeamBoxes',
			label: 'Team Boxes',
			description: 'Show the labeled team boxes outside both sidelines.',
			fieldTypes: ['traditional', 'four-v-four', 'unified', 'nfl-flag']
		},
		{
			key: 'showDownMarker',
			label: 'Down Marker',
			description: 'Show the down and calculated distance at the Line to Gain.',
			fieldTypes: ['traditional', 'four-v-four', 'unified', 'nfl-flag']
		},
		{
			key: 'showLineOfScrimmageMarker',
			label: 'L.O.S. Yard Marker',
			description: 'Show the Line of Scrimmage yard line on the near sideline.',
			fieldTypes: ['traditional', 'four-v-four', 'unified', 'nfl-flag']
		}
	];
	$: fieldLayout = fieldLayouts[fieldSettings.fieldType];
	$: fieldPalette = fieldColorOptions.find((option) => option.id === fieldSettings.fieldColor) ?? fieldColorOptions[0];
	$: currentFieldDefaults = { ...DEFAULT_PLAY_BUILDER_FIELD_SETTINGS, fieldType: fieldSettings.fieldType };
	$: fieldSettingsAreDefault = JSON.stringify(fieldSettings) === JSON.stringify(currentFieldDefaults);
	$: fieldFixtureScale = fieldLayout.teamBox
		? (484 - 48 - teamBoxExtraSetback * 2) / (fieldLayout.widthYards + fieldLayout.teamBoxSetbackYards * 2)
		: Number.POSITIVE_INFINITY;
	$: fieldWidth = Math.min(
		fieldMaxWidth,
		fieldMaxHeight * (fieldLayout.totalYards / fieldLayout.widthYards),
		fieldFixtureScale * fieldLayout.totalYards
	);
	$: fieldHeight = fieldWidth * (fieldLayout.widthYards / fieldLayout.totalYards);
	$: fieldLeft = (1000 - fieldWidth) / 2;
	$: fieldRight = fieldLeft + fieldWidth;
	$: fieldTop = (484 - fieldHeight) / 2;
	$: fieldBottom = fieldTop + fieldHeight;
	$: fieldWatermarkAngle = -(Math.atan2(fieldHeight, fieldWidth) * 180) / Math.PI;
	const xForYards = (yards: number) => fieldLeft + yards * (fieldWidth / fieldLayout.totalYards);
	const yardsForX = (x: number) => (x - fieldLeft) / (fieldWidth / fieldLayout.totalYards);
	const leftGoalYards = () => fieldLayout.goalLines[0];
	const rightGoalYards = () => fieldLayout.goalLines.at(-1) ?? fieldLayout.totalYards;
	const leftGoalX = () => xForYards(leftGoalYards());
	const rightGoalX = () => xForYards(rightGoalYards());
	const clampLineToGainX = (x: number) => Math.max(leftGoalX(), Math.min(rightGoalX(), x));
	const clampLineOfScrimmageX = (x: number) => {
		const halfYardPixels = fieldWidth / fieldLayout.totalYards / 2;
		return Math.max(leftGoalX() + halfYardPixels, Math.min(rightGoalX() - halfYardPixels, x));
	};
	const wholeYardLineToGainX = (x: number) => {
		const yardsToPixels = fieldWidth / fieldLayout.totalYards;
		const origin = lineOfScrimmageX ?? fieldLeft;
		return clampLineToGainX(origin + Math.round((x - origin) / yardsToPixels) * yardsToPixels);
	};
	const wholeYardLineOfScrimmageX = (x: number) => {
		const wholeYard = Math.max(leftGoalYards() + 1, Math.min(rightGoalYards() - 1, Math.round(yardsForX(x))));
		return xForYards(wholeYard);
	};
	const losYardLine = (x: number) => {
		const yards = yardsForX(x);
		return Math.round(Math.min(yards - leftGoalYards(), rightGoalYards() - yards) * 2) / 2;
	};
	const fieldSideForX = (x: number): FieldSide => (yardsForX(x) <= (leftGoalYards() + rightGoalYards()) / 2 ? 'a' : 'b');
	const isAtMidfieldX = (x: number) => Math.abs(yardsForX(x) - (leftGoalYards() + rightGoalYards()) / 2) < 0.01;
	const xForFieldSideYardLine = (side: FieldSide, yardLine: number, kind: 'line-of-scrimmage' | 'line-to-gain') => {
		const x = xForYards(side === 'a' ? leftGoalYards() + yardLine : rightGoalYards() - yardLine);
		return kind === 'line-of-scrimmage' ? clampLineOfScrimmageX(x) : clampLineToGainX(x);
	};
	const maximumLosYardLine = () => (rightGoalYards() - leftGoalYards()) / 2;
	const lineToGainDirection = (lineToGainX: number, scrimmageX: number) => {
		const currentDirection = Math.sign(lineToGainX - scrimmageX);
		if (currentDirection !== 0) return currentDirection;
		return scrimmageX <= (leftGoalX() + rightGoalX()) / 2 ? 1 : -1;
	};
	const maximumDownMarkerYardage = (lineToGainX: number, scrimmageX: number | null) => {
		if (scrimmageX === null) return 0;
		const goalX = lineToGainDirection(lineToGainX, scrimmageX) > 0 ? rightGoalX() : leftGoalX();
		return Math.floor((Math.abs(goalX - scrimmageX) / (fieldWidth / fieldLayout.totalYards)) * 2) / 2;
	};
	const guideDistanceYards = (lineToGainX: number, scrimmageX: number | null) =>
		scrimmageX === null ? null : Math.max(0, Math.round((Math.abs(lineToGainX - scrimmageX) / (fieldWidth / fieldLayout.totalYards)) * 2) / 2);
	const downMarkerText = (down: DownMarkerValue, lineToGainX: number, scrimmageX: number | null) => {
		if (down === 'pat') return 'P.A.T.';
		const distance = guideDistanceYards(lineToGainX, scrimmageX);
		return distance === null ? down : `${down} & ${distance}`;
	};
	const downMarkerDisplay = (down: DownMarkerValue, lineToGainX: number, scrimmageX: number | null) => {
		if (down === 'pat') return { base: 'P.A.T.', half: false, baseWidth: 30 };
		const distance = guideDistanceYards(lineToGainX, scrimmageX);
		if (distance === null) return { base: down, half: false, baseWidth: down.length * 5.8 };
		const half = !Number.isInteger(distance);
		const wholeYards = Math.floor(distance);
		const base = half && wholeYards === 0 ? `${down} &` : `${down} & ${half ? wholeYards : distance}`;
		return { base, half, baseWidth: base.length * 5.8 };
	};
	const lineOfScrimmageMarkerDisplay = (x: number) => {
		const yardLine = losYardLine(x);
		const half = !Number.isInteger(yardLine);
		const wholeYards = Math.floor(yardLine);
		const side = fieldSideForX(x).toUpperCase();
		const base = isAtMidfieldX(x) ? String(yardLine) : half && wholeYards === 0 ? `${side}'s` : `${side}'s ${half ? wholeYards : yardLine}`;
		return { base, half, baseWidth: base.length * 5.8 };
	};
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
	const sidelineMarkerBounds = () => {
		if (!fieldLayout.teamBox) return { top: fieldTop, bottom: fieldBottom };
		const setback = fieldLayout.teamBoxSetbackYards * (fieldWidth / fieldLayout.totalYards);
		return {
			top: fieldTop - setback - 20,
			bottom: fieldBottom + setback + 20
		};
	};
	const clampSidelineMarkerPoint = ({ x, y }: Point): Point => {
		const bounds = sidelineMarkerBounds();
		return {
			x: Math.max(fieldLeft, Math.min(fieldRight, x)),
			y: Math.max(bounds.top, Math.min(bounds.bottom, y))
		};
	};
	const isPointInSidelineMarkerArea = ({ x, y }: Point) => {
		const bounds = sidelineMarkerBounds();
		return x >= fieldLeft && x <= fieldRight && y >= bounds.top && y <= bounds.bottom;
	};
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
	const refreshLaserTrail = () => {
		const now = performance.now();
		laserTrailClock = now;
		laserTrail = laserTrail.filter((point) => now - point.createdAt < laserFadeDuration);
		laserDrawings = laserDrawings.filter((drawing) => drawing.releasedAt === null || now - drawing.releasedAt < laserFadeDuration);
		const hasFadingDrawing = laserDrawings.some((drawing) => drawing.releasedAt !== null);
		laserTrailFrame = laserTrail.length || hasFadingDrawing ? requestAnimationFrame(refreshLaserTrail) : null;
	};
	const updateLaserPointer = (point: Point) => {
		const now = performance.now();
		const lastPoint = laserTrail.at(-1);
		laserPointer = point;
		if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) >= 1.25) {
			laserTrail = [...laserTrail.slice(-47), { ...point, createdAt: now }];
		}
		laserTrailClock = now;
		const laserLayer = svg?.querySelector<SVGGElement>('[data-laser-pointer-layer]');
		if (laserLayer?.nextSibling) svg.appendChild(laserLayer);
		if (laserTrailFrame === null) laserTrailFrame = requestAnimationFrame(refreshLaserTrail);
	};
	const beginLaserDrawing = (event: PointerEvent, point: Point) => {
		updateLaserPointer(point);
		activeLaserDrawing = { points: [point], color: laserColor };
		laserDrawingPointerId = event.pointerId;
		svg.setPointerCapture(event.pointerId);
	};
	const continueLaserDrawing = (event: PointerEvent, point: Point) => {
		if (laserDrawingPointerId !== event.pointerId || !activeLaserDrawing) return;
		const lastPoint = activeLaserDrawing.points.at(-1)!;
		if (Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 1.25) return;
		activeLaserDrawing = { ...activeLaserDrawing, points: [...activeLaserDrawing.points, point] };
	};
	const finishLaserDrawing = () => {
		if (activeLaserDrawing && activeLaserDrawing.points.length > 1) {
			saveHistory();
			laserDrawings = [...laserDrawings, { ...activeLaserDrawing, releasedAt: null }];
		}
		activeLaserDrawing = null;
		laserDrawingPointerId = null;
	};
	const releaseLaserDrawings = () => {
		if (laserDrawingPointerId !== null && svg?.hasPointerCapture(laserDrawingPointerId)) svg.releasePointerCapture(laserDrawingPointerId);
		const drawings =
			activeLaserDrawing && activeLaserDrawing.points.length > 1 ? [...laserDrawings, { ...activeLaserDrawing, releasedAt: null }] : laserDrawings;
		activeLaserDrawing = null;
		laserDrawingPointerId = null;
		laserPointer = null;
		if (drawings.length === 0) return;
		const now = performance.now();
		laserTrailClock = now;
		laserDrawings = drawings.map((drawing) => ({ ...drawing, releasedAt: now }));
		if (laserTrailFrame === null) laserTrailFrame = requestAnimationFrame(refreshLaserTrail);
	};
	const fadeLaserDrawings = () => {
		if (laserDrawings.length > 0) saveHistory();
		releaseLaserDrawings();
	};
	const laserDrawingPath = (points: Point[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
	const laserTrailPath = (points: (Point & { createdAt: number })[], now: number) => {
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
		editingTeamBoxY = null;
		editingTeamBoxIndex = null;
		editingScoreboard = null;
		scoreboardHistorySaved = false;
		editingDownGuideId = null;
		downYardageValue = '';
		downYardageHistorySaved = false;
		losYardageValue = '';
		losYardageHistorySaved = false;
		toolbarEditorTool = null;
		toolbarGuideYardage = '';
		toolbarGuideHistorySaved = false;
	};
	const clearDeleteState = () => {
		if (deleteTargetTimer) {
			clearTimeout(deleteTargetTimer);
			deleteTargetTimer = null;
		}
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
		nextPlayNumber,
		laserDrawings: laserDrawings.map((drawing) => ({ ...drawing, points: drawing.points.map((point) => ({ ...point })) }))
	});
	const pushBuilderState = (stack: BuilderState[], state: BuilderState) => [...stack.slice(-29), state];
	const saveHistory = () => {
		history = pushBuilderState(history, builderSnapshot());
		future = [];
	};
	const syncActivePlayUrl = (index = activePlayIndex) => {
		if (!savedPlayId || typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (playEntries.length > 1) url.searchParams.set('play', String(index + 1));
		else url.searchParams.delete('play');
		replaceState(`${url.pathname}${url.search}${url.hash}`, {});
	};
	const applyBuilderState = (state: BuilderState) => {
		playEntries = state.plays.map((play) => ({ ...play, scene: cloneScene(play.scene), settings: { ...play.settings } }));
		nextPlayEntryId = state.nextPlayEntryId;
		nextPlayNumber = state.nextPlayNumber;
		laserDrawings = state.laserDrawings.map((drawing) => ({ ...drawing, points: drawing.points.map((point) => ({ ...point })) }));
		activeLaserDrawing = null;
		laserDrawingPointerId = null;
		if (laserDrawings.some((drawing) => drawing.releasedAt !== null) && laserTrailFrame === null) {
			laserTrailClock = performance.now();
			laserTrailFrame = requestAnimationFrame(refreshLaserTrail);
		}
		editingPlayId = null;
		const index = Math.max(
			0,
			playEntries.findIndex((play) => play.id === state.activePlayId)
		);
		activePlayIndex = index;
		syncActivePlayUrl(index);
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
	const loadPlayAtIndex = (index: number, updateUrl = true) => {
		const play = playEntries[index];
		if (!play) return;
		activePlayIndex = index;
		if (updateUrl) syncActivePlayUrl(index);
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
	const nextDefaultPlayNumber = () =>
		Math.max(
			0,
			...playEntries.map((play) => {
				const match = /^Play (\d+)$/.exec(play.name);
				return match ? Number(match[1]) : 0;
			})
		) + 1;
	const addPlay = () => {
		if (dismissEditorForAction() || suppressNextClick || playEntries.length >= PLAY_BUILDER_MAX_PLAYS) return;
		saveHistory();
		storeActivePlayState();
		const playNumber = nextDefaultPlayNumber();
		nextPlayNumber = playNumber + 1;
		const play: PlayEntry = {
			id: nextPlayEntryId++,
			name: uniquePlayName(`Play ${playNumber}`),
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
		if (tutorialActive && activeTutorialSteps[tutorialStepIndex]?.element === '[data-tutorial="play-management"]') tutorialDriver?.refresh();
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
	const discardFreeDrawings = () => {
		clearEditorState();
		clearDeleteState();
		freeStrokes = [];
		activeFreeStroke = null;
		erasingFreeStrokes = false;
		eraseHistorySaved = false;
		stylusEraserActive = false;
		lastErasePoint = null;
	};
	const clearFreeDrawings = () => {
		if (freeStrokes.length === 0 && !activeFreeStroke) return;
		if (freeStrokes.length > 0) saveHistory();
		discardFreeDrawings();
	};
	const handleBeforeUnload = (event: BeforeUnloadEvent) => {
		if (viewOnly) return;
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
			const playQuery = playEntries.length > 1 ? `?play=${activePlayIndex + 1}` : '';
			await goto(`/play-builder/${id}${playQuery}`, { replaceState: true, keepFocus: true, noScroll: true });
			return true;
		} catch (error) {
			showActionMessage(error instanceof Error ? error.message : 'Unable to save play.');
			return false;
		} finally {
			actionInProgress = null;
		}
	};
	const darkerExportColor = (hex: string) => {
		const value = Number.parseInt(hex.slice(1), 16);
		const channel = (shift: number) => Math.max(0, Math.round(((value >> shift) & 0xff) * 0.95));
		return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
	};
	const colorWithOpacity = (hex: string, opacity: number) => {
		const value = Number.parseInt(hex.slice(1), 16);
		return `rgba(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff}, ${opacity})`;
	};
	const hslToHex = (hue: number, saturation: number, lightness: number) => {
		const saturationRatio = saturation / 100;
		const lightnessRatio = lightness / 100;
		const chroma = (1 - Math.abs(2 * lightnessRatio - 1)) * saturationRatio;
		const hueSegment = (((hue % 360) + 360) % 360) / 60;
		const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
		const [redPrime, greenPrime, bluePrime] =
			hueSegment < 1
				? [chroma, secondary, 0]
				: hueSegment < 2
					? [secondary, chroma, 0]
					: hueSegment < 3
						? [0, chroma, secondary]
						: hueSegment < 4
							? [0, secondary, chroma]
							: hueSegment < 5
								? [secondary, 0, chroma]
								: [chroma, 0, secondary];
		const match = lightnessRatio - chroma / 2;
		return `#${[redPrime, greenPrime, bluePrime]
			.map((channel) =>
				Math.round((channel + match) * 255)
					.toString(16)
					.padStart(2, '0')
			)
			.join('')}`;
	};
	const hexToHueLightness = (hex: string) => {
		const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
		const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
		const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
		const maximum = Math.max(red, green, blue);
		const minimum = Math.min(red, green, blue);
		const delta = maximum - minimum;
		let hue = 0;
		if (delta > 0) {
			if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
			else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
			else hue = 60 * ((red - green) / delta + 4);
		}
		return { hue: (hue + 360) % 360, lightness: ((maximum + minimum) / 2) * 100 };
	};
	const setExportSpectrumColor = (picker: 'background' | 'border', hue: number, lightness: number) => {
		const color = hslToHex(Math.max(0, Math.min(359.99, hue)), 100, Math.max(0, Math.min(100, lightness)));
		if (picker === 'background') {
			exportBackgroundColor = color;
			exportBackgroundOpacity = 1;
		} else {
			exportFieldBorderColor = color;
			exportFieldBorderOpacity = 1;
		}
	};
	const updateExportSpectrumFromPointer = (event: PointerEvent, picker: 'background' | 'border') => {
		event.preventDefault();
		const palette = event.currentTarget as HTMLElement;
		const bounds = palette.getBoundingClientRect();
		const horizontal = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
		const vertical = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
		setExportSpectrumColor(picker, horizontal * 360, (1 - vertical) * 100);
		if (event.type === 'pointerdown') palette.setPointerCapture(event.pointerId);
	};
	const handleExportSpectrumKeydown = (event: KeyboardEvent, picker: 'background' | 'border', color: string) => {
		if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
		event.preventDefault();
		const current = hexToHueLightness(color);
		const hue = current.hue + (event.key === 'ArrowRight' ? 3 : event.key === 'ArrowLeft' ? -3 : 0);
		const lightness = current.lightness + (event.key === 'ArrowUp' ? 3 : event.key === 'ArrowDown' ? -3 : 0);
		setExportSpectrumColor(picker, hue, lightness);
	};
	const exportRenderOptions = (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
		const usesOpaqueCanvas = format === 'jpg' || format === 'pdf';
		const customBackgroundIsWhite =
			exportBackground === 'color' && (exportBackgroundOpacity === 0 || exportBackgroundColor.toLowerCase() === '#ffffff');
		const rendersOnWhite = usesOpaqueCanvas && (exportBackground === 'transparent' || customBackgroundIsWhite);
		const hasCustomBorder = exportFieldBorderOpacity > 0;
		const fieldBorderColor = rendersOnWhite
			? colorWithOpacity(hasCustomBorder ? exportFieldBorderColor : '#000000', 1)
			: hasCustomBorder
				? colorWithOpacity(exportFieldBorderColor, exportFieldBorderOpacity)
				: undefined;
		return {
			backgroundColor:
				exportBackground === 'grass'
					? darkerExportColor(fieldPalette.endZone)
					: exportBackground === 'color'
						? colorWithOpacity(exportBackgroundColor, exportBackgroundOpacity)
						: undefined,
			stripedBackground: exportBackground === 'grass',
			fieldBorderColor,
			padding: exportBackground === 'transparent' && !rendersOnWhite && !hasCustomBorder ? undefined : 12
		};
	};
	const exportPromptOptions = (): ExportPrompt | undefined => {
		const text = exportPrompt?.trim();
		if (!includeExportPrompt || !text) return undefined;
		const style = exportPromptSource ? getComputedStyle(exportPromptSource) : null;
		const fontSize = Number.parseFloat(style?.fontSize ?? '') || 18;
		const parsedLineHeight = Number.parseFloat(style?.lineHeight ?? '');
		const runs: ExportPromptRun[] = [];
		if (exportPromptSource) {
			const collectRuns = (node: Node) => {
				if (node instanceof HTMLBRElement) {
					runs.push({
						text: '\n',
						fontFamily: style?.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
						fontSize,
						fontWeight: style?.fontWeight || '400',
						fontStyle: style?.fontStyle || 'normal',
						color: style?.color || '#1c1917'
					});
					return;
				}
				if (node instanceof Text) {
					if (!node.textContent) return;
					const parent = node.parentElement ?? exportPromptSource;
					const runStyle = getComputedStyle(parent);
					const isContainer = parent === exportPromptSource;
					runs.push({
						text: node.textContent,
						fontFamily: runStyle.fontFamily || style?.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
						fontSize: Number.parseFloat(runStyle.fontSize) || fontSize,
						fontWeight: runStyle.fontWeight || style?.fontWeight || '400',
						fontStyle: runStyle.fontStyle || style?.fontStyle || 'normal',
						color: runStyle.color || style?.color || '#1c1917',
						backgroundColor: isContainer ? undefined : runStyle.backgroundColor,
						textDecorationLine: runStyle.textDecorationLine,
						paddingLeft: isContainer ? 0 : Number.parseFloat(runStyle.paddingLeft) || 0,
						paddingRight: isContainer ? 0 : Number.parseFloat(runStyle.paddingRight) || 0
					});
					return;
				}
				node.childNodes.forEach(collectRuns);
			};
			exportPromptSource.childNodes.forEach(collectRuns);
		}
		return {
			text,
			runs,
			fontFamily: style?.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
			fontSize,
			fontWeight: style?.fontWeight || '400',
			fontStyle: style?.fontStyle || 'normal',
			lineHeight: Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.425,
			color: style?.color || '#1c1917',
			backgroundColor: style?.backgroundColor || '#ffffff',
			borderColor: style?.borderTopColor || '#1c1917',
			borderWidth: Number.parseFloat(style?.borderTopWidth ?? '') || 2,
			paddingTop: Number.parseFloat(style?.paddingTop ?? '') || 16,
			paddingRight: Number.parseFloat(style?.paddingRight ?? '') || 16,
			paddingBottom: Number.parseFloat(style?.paddingBottom ?? '') || 16,
			paddingLeft: Number.parseFloat(style?.paddingLeft ?? '') || 16
		};
	};
	const exportImage = async (format: 'png' | 'jpg' | 'webp' | 'pdf') => {
		if (actionInProgress) return;
		actionInProgress = format;
		showPendingActionMessage(`Preparing ${format.toUpperCase()}…`);
		let restorePlayId: number | null = null;
		try {
			if (format !== 'pdf') {
				await exportPlayBuilderRaster(svg, format, {
					...exportRenderOptions(format),
					prompt: exportPromptOptions()
				});
			} else {
				storeActivePlayState();
				restorePlayId = playEntries[activePlayIndex].id;
				const canvases: HTMLCanvasElement[] = [];
				for (let index = 0; index < playEntries.length; index += 1) {
					loadPlayAtIndex(index, false);
					await tick();
					await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
					canvases.push(
						await renderPlayBuilderCanvas(svg, {
							pdfOutlines: false,
							...exportRenderOptions('pdf')
						})
					);
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
					loadPlayAtIndex(restoreIndex, false);
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
		const shareUrl = new URL(window.location.href);
		if (playEntries.length > 1) shareUrl.searchParams.set('play', String(activePlayIndex + 1));
		else shareUrl.searchParams.delete('play');
		const url = shareUrl.toString();
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
	const officialKinds: OfficialKind[] = ['official-r', 'official-l', 'official-b', 'official-f'];
	const officialNames: Record<OfficialKind, string> = {
		'official-r': 'Referee',
		'official-l': 'Line Judge',
		'official-b': 'Back Judge',
		'official-f': 'Field Judge'
	};
	const officialImages: Record<OfficialKind, string> = {
		'official-r': '/images/official-referee.webp',
		'official-l': '/images/official-line-judge.webp',
		'official-b': '/images/official-back-judge.webp',
		'official-f': '/images/official-field-judge.webp'
	};
	const isMarkerTool = (value: Tool): value is MarkerKind =>
		[...playerKinds, ...officialKinds, 'ball', 'flag', 'bean-bag', 'deflag', 'event'].includes(value as MarkerKind);
	const isTeamMarker = (marker: FieldMarker): marker is FieldMarker & { kind: PlayerKind } => playerKinds.includes(marker.kind as PlayerKind);
	const isOfficialKind = (kind: MarkerKind | Tool): kind is OfficialKind => officialKinds.includes(kind as OfficialKind);
	const isOfficialMarker = (marker: FieldMarker): marker is FieldMarker & { kind: OfficialKind } => isOfficialKind(marker.kind);
	const isSidelineMarkerKind = (kind: MarkerKind | Tool) => playerKinds.includes(kind as PlayerKind) || isOfficialKind(kind);
	const pointForActiveTool = (point: Point) =>
		tool === 'laser' ? point : isSidelineMarkerKind(tool) ? clampSidelineMarkerPoint(point) : clampPoint(point);
	const isPointInActiveToolArea = (point: Point) =>
		tool === 'laser'
			? point.x >= 0 && point.x <= 1000 && point.y >= 0 && point.y <= 484
			: isSidelineMarkerKind(tool)
				? isPointInSidelineMarkerArea(point)
				: isPointOnField(point);
	const isEditableMarker = (marker: FieldMarker) =>
		isTeamMarker(marker) || isOfficialMarker(marker) || ['event', 'ball', 'flag', 'bean-bag', 'deflag'].includes(marker.kind);
	const isPathTool = (value: Tool): value is Exclude<PathKind, 'line'> => ['run', 'pass', 'kick'].includes(value);
	const isArrowPath = (value: Tool | PathKind): value is Exclude<PathKind, 'line'> => ['run', 'pass', 'kick'].includes(value);
	const isGuideTool = (value: Tool): value is 'line-of-scrimmage' | 'line-to-gain' => ['line-of-scrimmage', 'line-to-gain'].includes(value);
	// Keep only a sub-pixel-scale safeguard so SVG arrow markers retain a direction.
	const minimumArrowLength = () => 1;
	const pointWithMinimumDistance = (anchor: Point, candidate: Point, fallback: Point): Point => {
		let dx = candidate.x - anchor.x;
		let dy = candidate.y - anchor.y;
		let distance = Math.hypot(dx, dy);
		if (distance >= minimumArrowLength()) return candidate;
		if (distance < 0.01) {
			dx = fallback.x - anchor.x;
			dy = fallback.y - anchor.y;
			distance = Math.hypot(dx, dy);
		}
		if (distance < 0.01) {
			dx = 1;
			dy = 0;
			distance = 1;
		}
		const length = minimumArrowLength();
		const constrained = clampPoint({ x: anchor.x + (dx / distance) * length, y: anchor.y + (dy / distance) * length });
		if (Math.hypot(constrained.x - anchor.x, constrained.y - anchor.y) >= length - 0.01) return constrained;
		dx = fallback.x - anchor.x;
		dy = fallback.y - anchor.y;
		distance = Math.hypot(dx, dy) || 1;
		return clampPoint({ x: anchor.x + (dx / distance) * length, y: anchor.y + (dy / distance) * length });
	};
	const previewPathFrom = (start: Point) => ({
		start,
		end: {
			x: start.x + (start.x <= fieldRight - 70 ? 70 : -70),
			y: start.y
		}
	});
	const drawingPathEnd = (activeDrawing: { start: Point; pointerStart: Point; hasDragged: boolean }, pointer: Point): Point => {
		const dx = pointer.x - activeDrawing.pointerStart.x;
		const dy = pointer.y - activeDrawing.pointerStart.y;
		const pointerDistance = Math.hypot(dx, dy);
		const defaultEnd = previewPathFrom(activeDrawing.start).end;
		if (pointerDistance < 4 && !activeDrawing.hasDragged) return defaultEnd;

		return clampPoint({
			x: defaultEnd.x + dx,
			y: defaultEnd.y + dy
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
		if (kind === 'bean-bag') return { id: nextId++, kind, color: beanBagPlacementColor, ...point };
		return { id: nextId++, kind, ...point };
	};
	const editorLeft = (marker: FieldMarker) => Math.max(10, Math.min(90, marker.x / 10));
	const editorTop = (marker: FieldMarker) => Math.max(12, Math.min(88, (marker.y / 484) * 100));
	const guideColor = (color: GuideColor) => (color === 'gold' ? '#d4a017' : (guideColors.find((option) => option.id === color)?.value ?? '#facc15'));
	const drawingColor = (color: GuideColor) => freeDrawColors.find((option) => option.id === color)?.value ?? guideColor(color);
	const laserColorValue = (color: LaserColor) => laserColors.find((option) => option.id === color)?.value ?? '#ff1744';
	const isArrowKind = (kind: PathKind | Tool): kind is ArrowKind => kind === 'run' || kind === 'pass' || kind === 'kick';
	const arrowPlacementColor = (kind: ArrowKind) => arrowPlacementColors[kind];
	const toolbarArrowColor = (kind: ArrowKind, color: GuideColor, selected: boolean) => {
		if (kind === 'run' && !selected && (color === 'black' || color === 'white')) return '#1c1917';
		if (color === 'black' && selected) return '#ffffff';
		return color === 'white' && !selected ? '#1c1917' : guideColor(color);
	};
	const toolbarArrowShaft = (kind: ArrowKind) => {
		if (kind === 'run') return 'M1 25.5 L23.6 12.45';
		// These are exact leading sub-curves of the same quadratic profiles used by the field arrows.
		if (kind === 'pass') return 'M1 25 Q13 11.28 25 19.51';
		return 'M1 27 Q14.28 -7.82 27.55 19.95';
	};
	const toolbarArrowHead = (kind: ArrowKind) => {
		if (kind === 'run') return 'M31 8.2 L25.9 16.2 L21.4 8.4 Z';
		if (kind === 'pass') return 'M31 25 L23.1 21.8 L27.6 16.7 Z';
		return 'M30.5 27 L24.4 21.2 L30.7 18.8 Z';
	};
	const toolbarArrowDash = (style: GuideStyle) => (style === 'dashed' ? '4 2.5' : style === 'dotted' ? '1 3' : undefined);
	const deflagColors = freeDrawColors.filter((option) => !['white', 'gray', 'black'].includes(option.id));
	const deflagImage = (color: GuideColor | undefined) =>
		color && color !== 'red' && deflagColors.some((option) => option.id === color) ? `/images/flag-belt-${color}.webp` : '/images/flag-belt.webp';
	const beanBagColors: { id: GuideColor; label: string; value: string }[] = [
		{ id: 'blue', label: 'Blue', value: '#1257d6' },
		{ id: 'white', label: 'White', value: '#ffffff' },
		{ id: 'black', label: 'Black', value: '#171717' },
		{ id: 'pink', label: 'Breast Cancer Pink', value: '#f06292' }
	];
	const beanBagImage = (color: GuideColor | undefined) =>
		`/images/bean-bag-${color === 'white' || color === 'black' || color === 'pink' ? color : 'blue'}.webp`;
	const toolbarAsset = (path: string) => path.replace('/images/', '/images/toolbar/');
	const toolbarToolImage = (item: ToolOption) =>
		item.id === 'laser'
			? (item.image ?? '/images/laser-pointer.png')
			: toolbarAsset(
					item.id === 'deflag'
						? deflagImage(deflagPlacementColor)
						: item.id === 'bean-bag'
							? beanBagImage(beanBagPlacementColor)
							: (item.image ?? '/images/football.webp')
				);
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
		isTeamMarker(marker)
			? 4
			: marker.kind === 'event'
				? 20
				: isOfficialMarker(marker) || ['ball', 'flag', 'bean-bag', 'deflag'].includes(marker.kind)
					? 24
					: 0;
	const markerDescriptionName = (marker: FieldMarker) =>
		isOfficialMarker(marker)
			? `${officialNames[marker.kind]} name`
			: marker.kind === 'ball'
				? 'Football description'
				: marker.kind === 'bean-bag'
					? 'Bean bag description'
					: marker.kind === 'deflag'
						? 'Flag belt description'
						: 'Penalty description';
	const markerDescriptionPlaceholder = (marker: FieldMarker) =>
		isOfficialMarker(marker)
			? 'Official Name'
			: marker.kind === 'ball'
				? 'Football Note'
				: marker.kind === 'bean-bag'
					? 'Bean Bag Note'
					: marker.kind === 'deflag'
						? 'Flag Belt Note'
						: 'Penalty';
	const markerDescriptionY = (marker: FieldMarker) =>
		marker.y +
		(marker.kind === 'ball'
			? footballSize
			: marker.kind === 'bean-bag'
				? beanBagSize
				: marker.kind === 'deflag'
					? deflagSize
					: isOfficialMarker(marker)
						? officialSize
						: foulFlagSize) /
			2 +
		9;
	const guideDash = (style: GuideStyle) => (style === 'dashed' ? '16 10' : style === 'dotted' ? '2 10' : undefined);
	const renderedGuideColor = (guide: FieldGuide) => guideColor(guide.color);
	const renderedGuideDash = (guide: FieldGuide) => guideDash(guide.style);
	const guideLabel = (guide: FieldGuide) =>
		guide.kind === 'line-of-scrimmage' ? 'Line of Scrimmage' : guide.kind === 'line-to-gain' ? 'Line to Gain' : 'Custom cross-field line';
	const defaultGuideColor = (guideTool: 'line-of-scrimmage' | 'line-to-gain'): GuideColor => guidePlacementColors[guideTool];
	const defaultGuideStyle = (guideTool: 'line-of-scrimmage' | 'line-to-gain'): GuideStyle => guidePlacementStyles[guideTool];
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
		const attachedMarkerIds = new Set(paths.flatMap((path) => (path.startMarkerId === undefined ? [] : [path.startMarkerId])));
		for (const layer of layerOrder.filter(
			(item) => item.type !== 'guide' && !(item.type === 'marker' && (footballMarkerIds.has(item.id) || attachedMarkerIds.has(item.id)))
		)) {
			const element = svg.querySelector<SVGGElement>(`[data-layer-type="${layer.type}"][data-layer-id="${layer.id}"]`);
			if (element) svg.appendChild(element);
		}
		for (const layer of layerOrder.filter((item) => item.type === 'marker' && attachedMarkerIds.has(item.id) && !footballMarkerIds.has(item.id))) {
			const element = svg.querySelector<SVGGElement>(`[data-layer-type="marker"][data-layer-id="${layer.id}"]`);
			if (element) svg.appendChild(element);
		}
		const fixtureLayer = svg.querySelector<SVGGElement>('[data-field-fixtures-layer]');
		if (fixtureLayer) svg.appendChild(fixtureLayer);
		for (const layer of layerOrder.filter((item) => item.type === 'marker' && footballMarkerIds.has(item.id))) {
			const element = svg.querySelector<SVGGElement>(`[data-layer-type="marker"][data-layer-id="${layer.id}"]`);
			if (element) svg.appendChild(element);
		}
		const downMarkerLayer = svg.querySelector<SVGGElement>('[data-down-marker-layer]');
		if (downMarkerLayer) svg.appendChild(downMarkerLayer);
		const drawingLayer = svg.querySelector<SVGGElement>('[data-free-drawing-layer]');
		if (drawingLayer) svg.appendChild(drawingLayer);
		const laserLayer = svg.querySelector<SVGGElement>('[data-laser-pointer-layer]');
		if (laserLayer) svg.appendChild(laserLayer);
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
	const nearestMarkerToPoint = (point: Point, excludedMarkerId?: number) => {
		const candidates = markers.filter((marker) => marker.id !== excludedMarkerId);
		if (candidates.length === 0) return null;
		const nearest = candidates.reduce((closest, marker) =>
			Math.hypot(marker.x - point.x, marker.y - point.y) < Math.hypot(closest.x - point.x, closest.y - point.y) ? marker : closest
		);
		return Math.hypot(nearest.x - point.x, nearest.y - point.y) <= playerRadius * 1.75 ? nearest : null;
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
			if (targetType === 'guide') {
				const draggedGuide = guides.find((guide) => guide.id === targetId);
				const snappedX =
					draggedGuide?.kind === 'line-to-gain'
						? wholeYardLineToGainX(targetX)
						: draggedGuide?.kind === 'line-of-scrimmage'
							? wholeYardLineOfScrimmageX(targetX)
							: targetX;
				placementSnapX = snappedX;
				guides = guides.map((guide) => (guide.id === targetId ? { ...guide, x: snappedX } : guide));
				return;
			}
			placementSnapX = targetX;
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
	const scheduleDeleteTargetAtPointer = (target: SelectedTarget, event: PointerEvent) => {
		if (viewOnly) return;
		const marker = target.type === 'marker' ? markers.find((item) => item.id === target.id) : undefined;
		const usesSidelineArea = marker ? isSidelineMarkerKind(marker.kind) : false;
		const point = usesSidelineArea ? clampSidelineMarkerPoint(canvasPointFromEvent(event)) : pointFromEvent(event);
		const verticalBounds = usesSidelineArea ? sidelineMarkerBounds() : { top: fieldTop, bottom: fieldBottom };
		clearDeleteState();
		deleteTargetTimer = setTimeout(() => {
			deleteTargetTimer = null;
			deleteTarget = target;
			deletePosition = {
				x: Math.max(fieldLeft + 8, Math.min(fieldRight - 42, point.x + 18)),
				y: Math.max(verticalBounds.top + 18, Math.min(verticalBounds.bottom - 8, point.y - 18))
			};
		}, 220);
	};
	const deleteHoveredElement = () => {
		if (viewOnly) {
			clearDeleteState();
			return;
		}
		if (!deleteTarget) return;
		saveHistory();
		removeElementTarget(deleteTarget);
		clearDeleteState();
		completeTutorialAction('delete-element');
	};
	const removeElementTarget = (target: SelectedTarget) => {
		if (target.type === 'marker') markers = markers.filter((item) => item.id !== target.id);
		if (target.type === 'path') paths = paths.filter((item) => item.id !== target.id);
		if (target.type === 'guide') guides = guides.filter((item) => item.id !== target.id);
		if (target.type === 'guide' && editingDownGuideId === target.id) editingDownGuideId = null;
		removeLayer(target.type, target.id);
	};
	const commitMarkerEditor = () => {
		if (!editingMarker) return;
		const editedKind = editingMarker.kind;
		const label = editValue.trim();
		const optionalLabel = isOfficialMarker(editingMarker) || ['ball', 'flag', 'bean-bag', 'deflag'].includes(editingMarker.kind);
		const nextLabel = optionalLabel ? label || undefined : label;
		if (nextLabel !== editingMarker.label && (nextLabel || optionalLabel)) {
			saveHistory();
			markers = markers.map((marker) => (marker.id === editingMarkerId ? { ...marker, label: nextLabel } : marker));
		}
		editingMarkerId = null;
		completeTutorialAction(`label:${editedKind}`);
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
		completeTutorialAction('label:deflag');
	};
	const updateBeanBagColor = (color: GuideColor) => {
		if (!editingMarker || editingMarker.kind !== 'bean-bag') return;
		const markerId = editingMarker.id;
		const nextLabel = editValue.trim() || undefined;
		beanBagPlacementColor = color;
		if ((editingMarker.color ?? 'blue') !== color || editingMarker.label !== nextLabel) {
			saveHistory();
			markers = markers.map((marker) => (marker.id === markerId ? { ...marker, color, label: nextLabel } : marker));
		}
		editingMarkerId = null;
		completeTutorialAction('color:bean-bag');
	};
	const commitGuideEditor = () => {
		editingGuideId = null;
		losYardageValue = '';
		losYardageHistorySaved = false;
	};
	const moveGuideToFieldSide = (guide: FieldGuide, side: FieldSide, saveOnce: () => void) => {
		if (guide.kind !== 'line-of-scrimmage' && guide.kind !== 'line-to-gain') return guide.x;
		const nextX = xForFieldSideYardLine(side, losYardLine(guide.x), guide.kind);
		if (Math.abs(nextX - guide.x) > 0.01) saveOnce();
		return nextX;
	};
	const setEditingGuideSide = (side: FieldSide) => {
		if (!editingGuide || (editingGuide.kind !== 'line-of-scrimmage' && editingGuide.kind !== 'line-to-gain')) return;
		editingGuideSide = side;
		const nextX = moveGuideToFieldSide(editingGuide, side, () => {
			if (!losYardageHistorySaved) saveHistory();
			losYardageHistorySaved = true;
		});
		if (Math.abs(nextX - editingGuide.x) <= 0.01) return;
		guides = guides.map((guide) => (guide.id === editingGuideId ? { ...guide, x: nextX } : guide));
		losYardageValue = editingGuide.kind === 'line-of-scrimmage' ? losYardLine(nextX) : (guideDistanceYards(nextX, lineOfScrimmageX) ?? '');
	};
	const setDownGuideSide = (side: FieldSide) => {
		if (!editingDownGuide) return;
		downGuideSide = side;
		const nextX = moveGuideToFieldSide(editingDownGuide, side, () => {
			if (!downYardageHistorySaved) saveHistory();
			downYardageHistorySaved = true;
		});
		if (Math.abs(nextX - editingDownGuide.x) <= 0.01) return;
		guides = guides.map((guide) => (guide.id === editingDownGuideId ? { ...guide, x: nextX } : guide));
		downYardageValue = guideDistanceYards(nextX, lineOfScrimmageX) ?? '';
	};
	const commitPathEditor = () => {
		editingPathId = null;
	};
	const commitTeamBoxEditor = () => {
		if (editingTeamBoxY === null || editingTeamBoxIndex === null) return;
		const key = editingTeamBoxIndex === 0 ? 'teamBoxTopLabel' : 'teamBoxBottomLabel';
		const nextLabel = teamBoxEditValue.trim() || DEFAULT_PLAY_BUILDER_FIELD_SETTINGS[key];
		if (nextLabel !== fieldSettings[key]) {
			saveHistory();
			fieldSettings = { ...fieldSettings, [key]: nextLabel };
		}
		editingTeamBoxY = null;
		editingTeamBoxIndex = null;
	};
	const updateGameClock = (seconds: number) => {
		const nextSeconds = Math.max(0, Math.min(PLAY_BUILDER_GAME_CLOCK_MAX_SECONDS, Math.round(seconds)));
		gameClockEditValue = formatPlayBuilderGameClock(nextSeconds);
		gameClockEditDigits = gameClockEditValue.replace(/\D/g, '');
		if (nextSeconds === fieldSettings.gameClockSeconds) return;
		if (!scoreboardHistorySaved) saveHistory();
		scoreboardHistorySaved = true;
		fieldSettings = { ...fieldSettings, gameClockSeconds: nextSeconds };
	};
	const parseGameClock = (value: string) => {
		const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
		if (!match) return null;
		return Number(match[1]) * 60 + Number(match[2]);
	};
	const formatGameClockInput = (digits: string) => {
		const padded = digits.replace(/\D/g, '').slice(-4).padStart(4, '0');
		return `${padded.slice(0, 2)}:${padded.slice(2)}`;
	};
	const focusGameClockInputEnd = () => {
		void tick().then(() => gameClockEditInput?.setSelectionRange(gameClockEditValue.length, gameClockEditValue.length));
	};
	const handleGameClockInput = (event: InputEvent) => {
		const input = event.currentTarget as HTMLInputElement;
		const replacesEntireValue = input.selectionStart === 0 && input.selectionEnd === input.value.length;
		const insertedDigits = (event.data ?? '').replace(/\D/g, '');
		if (event.inputType.startsWith('insert') && insertedDigits) {
			event.preventDefault();
			gameClockEditDigits = `${replacesEntireValue ? '' : gameClockEditDigits}${insertedDigits}`.slice(-4);
			gameClockEditValue = formatGameClockInput(gameClockEditDigits);
			focusGameClockInputEnd();
			return;
		}
		if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
			event.preventDefault();
			gameClockEditDigits = replacesEntireValue ? '' : gameClockEditDigits.slice(0, -1);
			gameClockEditValue = formatGameClockInput(gameClockEditDigits);
			focusGameClockInputEnd();
		}
	};
	const normalizeGameClockInput = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		gameClockEditDigits = input.value.replace(/\D/g, '').slice(-4);
		gameClockEditValue = formatGameClockInput(gameClockEditDigits);
		input.value = gameClockEditValue;
		focusGameClockInputEnd();
	};
	const stepGameClock = async (direction: -1 | 1) => {
		const currentSeconds = parseGameClock(gameClockEditValue) ?? fieldSettings.gameClockSeconds;
		const nextSeconds = Math.max(0, Math.min(PLAY_BUILDER_GAME_CLOCK_MAX_SECONDS, currentSeconds + direction));
		gameClockEditValue = formatPlayBuilderGameClock(nextSeconds);
		gameClockEditDigits = gameClockEditValue.replace(/\D/g, '');
		await tick();
		gameClockEditInput?.select();
	};
	const commitScoreboardEditor = () => {
		if (editingScoreboard === 'clock') {
			const parsed = parseGameClock(gameClockEditValue);
			if (parsed === null) {
				gameClockEditValue = formatPlayBuilderGameClock(fieldSettings.gameClockSeconds);
				gameClockEditDigits = gameClockEditValue.replace(/\D/g, '');
			}
			else updateGameClock(parsed);
		}
		editingScoreboard = null;
		scoreboardHistorySaved = false;
	};
	const cycleGameQuarter = (event: Event) => {
		if (viewOnly || tool === 'laser') return;
		event.preventDefault();
		event.stopPropagation();
		if (editingScoreboard === 'clock') commitScoreboardEditor();
		const currentIndex = Math.max(0, PLAY_BUILDER_GAME_QUARTERS.indexOf(fieldSettings.gameQuarter));
		const gameQuarter = PLAY_BUILDER_GAME_QUARTERS[(currentIndex + 1) % PLAY_BUILDER_GAME_QUARTERS.length] as PlayBuilderGameQuarter;
		saveHistory();
		fieldSettings = { ...fieldSettings, gameQuarter };
	};
	const updateDownMarkerYardage = (event: Event) => {
		if (!editingDownGuide || lineOfScrimmageX === null) return;
		const rawValue = (event.currentTarget as HTMLInputElement).value;
		if (rawValue === '') {
			downYardageValue = '';
			return;
		}
		const requestedDistance = Number(rawValue);
		if (!Number.isFinite(requestedDistance)) return;
		const maximum = maximumDownMarkerYardage(editingDownGuide.x, lineOfScrimmageX);
		const distance = Math.max(0, Math.min(maximum, Math.round(requestedDistance * 2) / 2));
		downYardageValue = distance;
		const direction = lineToGainDirection(editingDownGuide.x, lineOfScrimmageX);
		const nextX = clampLineToGainX(lineOfScrimmageX + direction * distance * (fieldWidth / fieldLayout.totalYards));
		downGuideSide = fieldSideForX(nextX);
		if (Math.abs(nextX - editingDownGuide.x) <= 0.01) return;
		if (!downYardageHistorySaved) {
			saveHistory();
			downYardageHistorySaved = true;
		}
		guides = guides.map((guide) => (guide.id === editingDownGuideId ? { ...guide, x: nextX } : guide));
	};
	const updateGuideYardage = (event: Event) => {
		if (!editingGuide || (editingGuide.kind !== 'line-of-scrimmage' && editingGuide.kind !== 'line-to-gain')) return;
		const rawValue = (event.currentTarget as HTMLInputElement).value;
		if (rawValue === '') {
			losYardageValue = '';
			return;
		}
		const requestedYards = Number(rawValue);
		if (!Number.isFinite(requestedYards)) return;
		let nextX: number;
		if (editingGuide.kind === 'line-of-scrimmage') {
			const yardLine = Math.max(0.5, Math.min(maximumLosYardLine(), Math.round(requestedYards * 2) / 2));
			losYardageValue = yardLine;
			nextX = xForFieldSideYardLine(editingGuideSide, yardLine, 'line-of-scrimmage');
		} else {
			if (lineOfScrimmageX === null) return;
			const maximum = maximumDownMarkerYardage(editingGuide.x, lineOfScrimmageX);
			const distance = Math.max(0, Math.min(maximum, Math.round(requestedYards * 2) / 2));
			losYardageValue = distance;
			const direction = lineToGainDirection(editingGuide.x, lineOfScrimmageX);
			nextX = clampLineToGainX(lineOfScrimmageX + direction * distance * (fieldWidth / fieldLayout.totalYards));
			editingGuideSide = fieldSideForX(nextX);
		}
		if (Math.abs(nextX - editingGuide.x) <= 0.01) return;
		if (!losYardageHistorySaved) {
			saveHistory();
			losYardageHistorySaved = true;
		}
		guides = guides.map((guide) => (guide.id === editingGuideId ? { ...guide, x: nextX } : guide));
		editingGuideSide = fieldSideForX(nextX);
	};
	const moveEditingGuideByYard = (direction: -1 | 1) => {
		if (!editingGuide || (editingGuide.kind !== 'line-of-scrimmage' && editingGuide.kind !== 'line-to-gain')) return;
		const yardWidth = fieldWidth / fieldLayout.totalYards;
		const nextX =
			editingGuide.kind === 'line-of-scrimmage'
				? clampLineOfScrimmageX(editingGuide.x + direction * yardWidth)
				: clampLineToGainX(editingGuide.x + direction * yardWidth);
		if (Math.abs(nextX - editingGuide.x) <= 0.01) return;
		if (!losYardageHistorySaved) {
			saveHistory();
			losYardageHistorySaved = true;
		}
		guides = guides.map((guide) => (guide.id === editingGuideId ? { ...guide, x: nextX } : guide));
		editingGuideSide = fieldSideForX(nextX);
		losYardageValue = editingGuide.kind === 'line-of-scrimmage' ? losYardLine(nextX) : (guideDistanceYards(nextX, lineOfScrimmageX) ?? '');
	};
	const commitDownMarkerEditor = () => {
		editingDownGuideId = null;
		downYardageValue = '';
		downYardageHistorySaved = false;
	};
	const selectDownMarkerValue = (down: DownMarkerValue) => {
		if (!editingDownGuide) return;
		if ((editingDownGuide.down ?? '1st') !== down) {
			saveHistory();
			guides = guides.map((guide) => (guide.id === editingDownGuideId ? { ...guide, down } : guide));
		}
		editingDownGuideId = null;
		downYardageValue = '';
		downYardageHistorySaved = false;
	};
	const updateGuideColor = (color: GuideColor) => {
		if (editingPath && isArrowKind(editingPath.kind)) arrowPlacementColors = { ...arrowPlacementColors, [editingPath.kind]: color };
		if (!editingGuide && !editingPath) return;
		completeTutorialAction('format-line');
		if (editingGuide && editingGuide.color === color) return;
		if (editingPath && editingPath.color === color) return;
		saveHistory();
		guideEditColor = color;
		if (editingGuide) guides = guides.map((guide) => (guide.id === editingGuideId ? { ...guide, color } : guide));
		if (editingPath) {
			paths = paths.map((path) => (path.id === editingPathId ? { ...path, color } : path));
		}
	};
	const updateGuideStyle = (style: GuideStyle) => {
		if (!editingGuide && !editingPath) return;
		completeTutorialAction('format-line');
		if (editingGuide && editingGuide.style === style) return;
		if (editingPath && editingPath.style === style) return;
		saveHistory();
		guideEditStyle = style;
		if (editingGuide) guides = guides.map((guide) => (guide.id === editingGuideId ? { ...guide, style } : guide));
		if (editingPath) paths = paths.map((path) => (path.id === editingPathId ? { ...path, style } : path));
	};
	const commitActiveEditor = () => {
		if (editingMarkerId !== null) commitMarkerEditor();
		else if (editingGuideId !== null) commitGuideEditor();
		else if (editingPathId !== null) commitPathEditor();
		else if (editingTeamBoxY !== null) commitTeamBoxEditor();
		else if (editingScoreboard !== null) commitScoreboardEditor();
		else if (editingDownGuideId !== null) commitDownMarkerEditor();
	};
	const hasActiveInlineEditor = () =>
		editingMarkerId !== null ||
		editingGuideId !== null ||
		editingPathId !== null ||
		editingTeamBoxY !== null ||
		editingScoreboard !== null ||
		editingDownGuideId !== null;
	const startEditingDownMarker = (event: Event, guide: FieldGuide) => {
		if (viewOnly) return;
		if (guide.kind !== 'line-to-gain' || suppressDownMarkerClick || tool === 'event' || tool === 'free-draw' || tool === 'laser') return;
		event.preventDefault();
		event.stopPropagation();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = null;
		editingPathId = null;
		editingTeamBoxY = null;
		editingTeamBoxIndex = null;
		editingScoreboard = null;
		downYardageValue = guideDistanceYards(guide.x, lineOfScrimmageX) ?? '';
		downGuideSide = fieldSideForX(guide.x);
		downYardageHistorySaved = false;
		editingDownGuideId = guide.id;
	};
	const startEditingGameClock = async (event: Event) => {
		if (viewOnly || tool === 'laser') return;
		event.preventDefault();
		event.stopPropagation();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = null;
		editingPathId = null;
		editingDownGuideId = null;
		editingTeamBoxY = null;
		editingTeamBoxIndex = null;
		editingScoreboard = 'clock';
		gameClockEditValue = formatPlayBuilderGameClock(fieldSettings.gameClockSeconds);
		gameClockEditDigits = gameClockEditValue.replace(/\D/g, '');
		scoreboardHistorySaved = false;
		await tick();
		gameClockEditInput?.focus();
		gameClockEditInput?.select();
	};
	const startEditingTeamBox = async (event: Event, teamBoxY: number, teamBoxIndex: number) => {
		if (viewOnly || tool === 'laser') return;
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = null;
		editingPathId = null;
		editingDownGuideId = null;
		editingScoreboard = null;
		editingTeamBoxY = teamBoxY;
		editingTeamBoxIndex = teamBoxIndex;
		teamBoxEditValue = teamBoxIndex === 0 ? fieldSettings.teamBoxTopLabel : fieldSettings.teamBoxBottomLabel;
		await tick();
		teamBoxEditInput?.focus();
		teamBoxEditInput?.select();
	};
	const startEditingMarker = async (event: Event, marker: FieldMarker) => {
		if (viewOnly) return;
		if (!isEditableMarker(marker) || tool === 'laser' || (tool === 'event' && marker.kind !== 'ball')) return;
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = marker.id;
		editingGuideId = null;
		editingPathId = null;
		editingDownGuideId = null;
		editValue = marker.label ?? '';
		await tick();
		editInput?.focus();
		editInput?.select();
		completeTutorialAction(`edit:${marker.kind}`);
	};
	const moveEditingFootball = (destination: 'x' | 'line-of-scrimmage') => {
		if (!editingMarker || editingMarker.kind !== 'ball') return;
		let destinationX: number | null = null;
		if (destination === 'line-of-scrimmage') destinationX = lineOfScrimmageX;
		else {
			const markedXs = [...fieldLayout.tenYardXs, ...fieldLayout.fourteenYardXs].map(xForYards);
			destinationX = markedXs.reduce<number | null>(
				(nearest, x) => (nearest === null || Math.abs(x - editingMarker.x) < Math.abs(nearest - editingMarker.x) ? x : nearest),
				null
			);
		}
		if (destinationX === null) return;
		const markerId = editingMarker.id;
		const nextX = destinationX;
		const destinationY = fieldTop + fieldHeight / 2;
		const nextLabel = editValue.trim() || undefined;
		const moved = Math.abs(nextX - editingMarker.x) > 0.01 || Math.abs(destinationY - editingMarker.y) > 0.01;
		if (moved || nextLabel !== editingMarker.label) {
			saveHistory();
			markers = markers.map((marker) => (marker.id === markerId ? { ...marker, x: nextX, y: destinationY, label: nextLabel } : marker));
			if (moved) raiseLayer('marker', markerId);
		}
		editingMarkerId = null;
		completeTutorialAction('label:ball');
	};
	const startEditingGuide = async (event: Event, guide: FieldGuide) => {
		if (viewOnly) return;
		if (tool === 'event' || tool === 'laser') return;
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = guide.id;
		editingPathId = null;
		editingDownGuideId = null;
		guideEditColor = guide.color;
		guideEditStyle = guide.style;
		if (guide.kind === 'line-of-scrimmage' || guide.kind === 'line-to-gain') editingGuideSide = fieldSideForX(guide.x);
		losYardageValue =
			guide.kind === 'line-of-scrimmage'
				? losYardLine(guide.x)
				: guide.kind === 'line-to-gain'
					? (guideDistanceYards(guide.x, lineOfScrimmageX) ?? '')
					: '';
		losYardageHistorySaved = false;
		if (guide.kind === 'line-of-scrimmage' || guide.kind === 'line-to-gain') {
			await tick();
			guideYardageInput?.focus();
			guideYardageInput?.select();
		}
		completeTutorialAction(`edit:${guide.kind}`);
	};
	const startEditingLineOfScrimmageMarker = async (event: Event, guide: FieldGuide) => {
		if (viewOnly) return;
		if (guide.kind !== 'line-of-scrimmage' || suppressDownMarkerClick || tool === 'event' || tool === 'free-draw' || tool === 'laser') return;
		await startEditingGuide(event, guide);
	};
	const startEditingPath = (event: Event, path: FieldPath) => {
		if (viewOnly) return;
		if (tool === 'event' || tool === 'laser') return;
		event.preventDefault();
		clearDeleteState();
		editingMarkerId = null;
		editingGuideId = null;
		editingPathId = path.id;
		editingDownGuideId = null;
		guideEditColor = path.color;
		guideEditStyle = path.style;
		completeTutorialAction(`edit:${path.kind}`);
	};
	const isToolbarPresetTool = (value: Tool): value is ToolbarPresetTool =>
		value === 'deflag' ||
		value === 'bean-bag' ||
		value === 'laser' ||
		isArrowKind(value) ||
		value === 'line-of-scrimmage' ||
		value === 'line-to-gain';
	const openToolbarPresetEditor = async (event: MouseEvent, selectedTool: Tool) => {
		if (!isToolbarPresetTool(selectedTool)) return;
		event.preventDefault();
		event.stopPropagation();
		clearEditorState();
		clearDeleteState();
		if (tool === 'laser' && selectedTool !== 'laser') releaseLaserDrawings();
		tool = selectedTool;
		const buttonBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const columnBounds = (event.currentTarget as HTMLElement).closest('.tool-column')?.getBoundingClientRect();
		toolbarEditorTop = columnBounds ? buttonBounds.bottom - columnBounds.top : buttonBounds.height;
		toolbarEditorTool = selectedTool;
		toolbarGuideHistorySaved = false;
		if (selectedTool === 'line-of-scrimmage' || selectedTool === 'line-to-gain') {
			const existing = guides.find((guide) => guide.kind === selectedTool);
			toolbarGuideSide = existing ? fieldSideForX(existing.x) : 'a';
			const defaultYardages = {
				traditional: { 'line-of-scrimmage': 14, 'line-to-gain': 6 },
				'four-v-four': { 'line-of-scrimmage': 10, 'line-to-gain': 10 },
				unified: { 'line-of-scrimmage': 5, 'line-to-gain': 15 },
				'nfl-flag': { 'line-of-scrimmage': 5, 'line-to-gain': 20 }
			} as const;
			toolbarGuideYardage = existing
				? selectedTool === 'line-of-scrimmage'
					? losYardLine(existing.x)
					: (guideDistanceYards(existing.x, lineOfScrimmageX) ?? defaultYardages[fieldSettings.fieldType][selectedTool])
				: defaultYardages[fieldSettings.fieldType][selectedTool];
			await tick();
			toolbarGuideYardageInput?.focus();
			toolbarGuideYardageInput?.select();
		}
	};
	const updateToolbarPresetColor = (color: GuideColor) => {
		if (!toolbarEditorTool) return;
		if (toolbarEditorTool === 'deflag') {
			deflagPlacementColor = color;
			toolbarEditorTool = null;
			return;
		}
		if (toolbarEditorTool === 'bean-bag') {
			beanBagPlacementColor = color;
			toolbarEditorTool = null;
			return;
		}
		if (toolbarEditorTool === 'laser') {
			if (laserColors.some((option) => option.id === color)) laserColor = color as LaserColor;
			toolbarEditorTool = null;
			return;
		}
		if (isArrowKind(toolbarEditorTool)) {
			arrowPlacementColors = { ...arrowPlacementColors, [toolbarEditorTool]: color };
			return;
		}
		guidePlacementColors = { ...guidePlacementColors, [toolbarEditorTool]: color };
		const existing = guides.find((guide) => guide.kind === toolbarEditorTool);
		if (existing && existing.color !== color) {
			if (!toolbarGuideHistorySaved) saveHistory();
			toolbarGuideHistorySaved = true;
			guides = guides.map((guide) => (guide.id === existing.id ? { ...guide, color } : guide));
		}
	};
	const updateToolbarPresetStyle = (style: GuideStyle) => {
		if (!toolbarEditorTool || toolbarEditorTool === 'deflag' || toolbarEditorTool === 'bean-bag' || toolbarEditorTool === 'laser') return;
		if (isArrowKind(toolbarEditorTool)) {
			arrowPlacementStyles = { ...arrowPlacementStyles, [toolbarEditorTool]: style };
			return;
		}
		guidePlacementStyles = { ...guidePlacementStyles, [toolbarEditorTool]: style };
		const existing = guides.find((guide) => guide.kind === toolbarEditorTool);
		if (existing && existing.style !== style) {
			if (!toolbarGuideHistorySaved) saveHistory();
			toolbarGuideHistorySaved = true;
			guides = guides.map((guide) => (guide.id === existing.id ? { ...guide, style } : guide));
		}
	};
	const setToolbarGuideSide = (side: FieldSide) => {
		if (toolbarEditorTool !== 'line-of-scrimmage' && toolbarEditorTool !== 'line-to-gain') return;
		toolbarGuideSide = side;
		const existing = guides.find((guide) => guide.kind === toolbarEditorTool);
		if (!existing) return;
		const nextX = moveGuideToFieldSide(existing, side, () => {
			if (!toolbarGuideHistorySaved) saveHistory();
			toolbarGuideHistorySaved = true;
		});
		if (Math.abs(nextX - existing.x) <= 0.01) return;
		guides = guides.map((guide) => (guide.id === existing.id ? { ...guide, x: nextX } : guide));
		toolbarGuideYardage = existing.kind === 'line-of-scrimmage' ? losYardLine(nextX) : (guideDistanceYards(nextX, lineOfScrimmageX) ?? '');
	};
	const updateToolbarGuideYardage = (event: Event) => {
		if (toolbarEditorTool !== 'line-of-scrimmage' && toolbarEditorTool !== 'line-to-gain') return;
		const rawValue = (event.currentTarget as HTMLInputElement).value;
		if (rawValue === '') {
			toolbarGuideYardage = '';
			return;
		}
		const requested = Number(rawValue);
		if (!Number.isFinite(requested)) return;
		let nextX: number;
		if (toolbarEditorTool === 'line-of-scrimmage') {
			const yardLine = Math.max(0.5, Math.min(maximumLosYardLine(), Math.round(requested * 2) / 2));
			toolbarGuideYardage = yardLine;
			nextX = xForFieldSideYardLine(toolbarGuideSide, yardLine, 'line-of-scrimmage');
		} else {
			if (lineOfScrimmageX === null) return;
			const existing = guides.find((guide) => guide.kind === toolbarEditorTool);
			const maximum = maximumDownMarkerYardage(existing?.x ?? lineOfScrimmageX, lineOfScrimmageX);
			const distance = Math.max(0, Math.min(maximum, Math.round(requested * 2) / 2));
			toolbarGuideYardage = distance;
			const direction = lineToGainDirection(existing?.x ?? lineOfScrimmageX + 1, lineOfScrimmageX);
			nextX = clampLineToGainX(lineOfScrimmageX + direction * distance * (fieldWidth / fieldLayout.totalYards));
			toolbarGuideSide = fieldSideForX(nextX);
		}
		const existing = guides.find((guide) => guide.kind === toolbarEditorTool);
		if (existing && Math.abs(existing.x - nextX) <= 0.01) return;
		if (!toolbarGuideHistorySaved) saveHistory();
		toolbarGuideHistorySaved = true;
		if (existing) guides = guides.map((guide) => (guide.id === existing.id ? { ...guide, x: nextX } : guide));
		else {
			const guide: FieldGuide = {
				id: nextId++,
				kind: toolbarEditorTool,
				x: nextX,
				color: guidePlacementColors[toolbarEditorTool],
				style: guidePlacementStyles[toolbarEditorTool],
				down: toolbarEditorTool === 'line-to-gain' ? '1st' : undefined
			};
			guides = [...guides, guide];
			raiseLayer('guide', guide.id);
		}
	};
	const handleEditorKeydown = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || !hasActiveInlineEditor()) return;
		event.preventDefault();
		if (editingDownGuideId !== null) commitDownMarkerEditor();
		else clearEditorState();
	};
	const handleGlobalKeydown = (event: KeyboardEvent) => {
		if (viewOnly) return;
		const target = event.target as HTMLElement | null;
		const isEditableTarget = target?.matches('input, textarea, select, [contenteditable="true"]') ?? false;
		if (tutorialActive) {
			if (event.key === 'Escape') {
				event.preventDefault();
				tutorialDriver?.destroy();
				return;
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				void skipTutorialStep();
				return;
			}
			const key = event.key.toLowerCase();
			const isBlockedBuilderShortcut =
				((event.ctrlKey || event.metaKey) && ['s', 'c', 'z', 'y'].includes(key)) ||
				(!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && key === 'n') ||
				(!event.ctrlKey && !event.metaKey && event.altKey && !event.shiftKey && key === 'n');
			if (!isEditableTarget && isBlockedBuilderShortcut) {
				event.preventDefault();
				return;
			}
		}
		if (showNewPrompt) {
			if (event.key === 'Escape' && actionInProgress !== 'save') {
				event.preventDefault();
				showNewPrompt = false;
			}
			return;
		}
		if (showExportSettings) {
			if (event.key === 'Escape') {
				event.preventDefault();
				showExportSettings = false;
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
		if (showFeedback) {
			if (event.key === 'Escape') {
				event.preventDefault();
				showFeedback = false;
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
		if (hasActiveInlineEditor()) {
			handleEditorKeydown(event);
			return;
		}
		if (toolbarEditorTool !== null && event.key === 'Escape') {
			event.preventDefault();
			toolbarEditorTool = null;
			return;
		}
		if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && event.key.toLowerCase() === 'l') {
			event.preventDefault();
			selectTool('laser');
			return;
		}
		if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'd') {
			event.preventDefault();
			selectTool('free-draw');
			freeDrawMode = event.shiftKey ? 'erase' : 'draw';
			return;
		}
		if (isEditableTarget) return;
		if (tool === 'laser' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'c') {
			event.preventDefault();
			fadeLaserDrawings();
			return;
		}
		if (!event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey && event.key.toLowerCase() === 'n') {
			event.preventDefault();
			if (actionInProgress === null) void requestNewBoard();
			return;
		}
		if (!event.ctrlKey && !event.metaKey && event.altKey && !event.shiftKey && event.key.toLowerCase() === 'n') {
			event.preventDefault();
			addPlay();
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
			const key = event.key.toLowerCase();
			if (key === 's') {
				event.preventDefault();
				setupDefaultScenario();
				return;
			}
			if (key === 'h') {
				event.preventDefault();
				void openHelp();
				return;
			}
			if (key === 'f') {
				event.preventDefault();
				void openFeedback();
				return;
			}
			if (key === 'o') {
				event.preventDefault();
				if (actionInProgress === null) void openExportSettings();
				return;
			}
		}
		if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && event.key.toLowerCase() === 's') {
			event.preventDefault();
			void openSettings();
			return;
		}
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
			if (!event.shiftKey && key === 'c' && savedPlayId) {
				event.preventDefault();
				void copyShareUrl();
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
		if (event.ctrlKey || event.metaKey) return;
		const pressedShortcut = `${event.altKey ? 'alt+' : ''}${event.shiftKey ? 'shift+' : ''}${event.key.toLowerCase()}`;
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
		if (viewOnly) return;
		const target = event.target as Node;
		if (editingPlayId !== null && !playMenuElement?.contains(target)) editingPlayId = null;
		if (deleteTarget && !deleteButtonElement?.contains(target)) clearDeleteState();
		if (
			toolbarEditorTool !== null &&
			!toolbarEditorElement?.contains(target) &&
			!(target instanceof Element && target.closest('[data-builder-tool]'))
		)
			toolbarEditorTool = null;
		if (!hasActiveInlineEditor()) return;
		if (editorElement?.contains(target)) return;
		if (editingDownGuideId !== null && target instanceof Element && target.closest('[data-down-marker]')) return;
		if (editingGuideId !== null && target instanceof Element && target.closest('[data-los-marker]')) return;
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
		if (!hasActiveInlineEditor()) return false;
		commitActiveEditor();
		suppressNextClick = true;
		setTimeout(() => (suppressNextClick = false), 0);
		return true;
	};
	const tutorialToolTarget = (toolId: Tool) => `[data-tutorial-tool="${toolId}"]`;
	const tutorialLatestLayer = (type: 'marker' | 'path' | 'guide', kind: string) => () => {
		const matches = builderRoot?.querySelectorAll<SVGGElement>(`[data-layer-type="${type}"][data-tutorial-kind="${kind}"]`);
		return matches?.[matches.length - 1] ?? svg;
	};
	const tutorialStep = (
		element: DriveStep['element'],
		title: string,
		description: string,
		waitFor?: TutorialAction,
		nextLabel = waitFor ? 'Skip' : 'Next'
	): TutorialStep => ({
		element,
		data: { waitFor, nextLabel },
		popover: { title, description, side: 'right', align: 'center', nextBtnText: nextLabel }
	});
	const buildTutorialSteps = (): TutorialStep[] => [
		tutorialStep(
			'[data-tutorial="tutorial-button"]',
			'Build a Play, Step by Step',
			'Complete each highlighted action, or choose <strong>Skip</strong>.',
			undefined,
			'Start'
		),
		tutorialStep(tutorialToolTarget('team-a'), '1. Choose Team A', 'Select <strong>A</strong>.', 'tool:team-a'),
		tutorialStep('[data-tutorial="field"]', 'Place A-1', 'Click the field to place A-1.', 'place:team-a'),
		tutorialStep(tutorialLatestLayer('marker', 'team-a'), 'Rename the Player', 'Double-click A-1.', 'edit:team-a'),
		tutorialStep('[data-tutorial="marker-editor"]', 'Enter a Name', 'Type up to four characters, then press <strong>Enter</strong>.', 'label:team-a'),
		tutorialStep(tutorialToolTarget('team-b'), '2. Choose Team B', 'Select <strong>B</strong>.', 'tool:team-b'),
		tutorialStep('[data-tutorial="field"]', 'Place B-1', 'Click the field to place B-1.', 'place:team-b'),
		tutorialStep('[data-tutorial="official-tools"]', '3. Select an Official', 'Select any official position.', 'tool:official'),
		tutorialStep('[data-tutorial="field"]', 'Place the Official', 'Click the field to place the official.', 'place:official'),
		tutorialStep(tutorialToolTarget('ball'), '4. Select the Football', 'Select <strong>Football</strong>.', 'tool:ball'),
		tutorialStep('[data-tutorial="field"]', 'Place the Football', 'Click the field to place the football.', 'place:ball'),
		tutorialStep(tutorialToolTarget('flag'), '5. Select Penalty', 'Select <strong>Penalty</strong>.', 'tool:flag'),
		tutorialStep('[data-tutorial="field"]', 'Mark a Penalty', 'Click where the foul occurred.', 'place:flag'),
		tutorialStep(tutorialLatestLayer('marker', 'flag'), 'Describe the Penalty', 'Double-click the penalty flag.', 'edit:flag'),
		tutorialStep('[data-tutorial="marker-editor"]', 'Name the Penalty', 'Type the foul, then press <strong>Enter</strong>.', 'label:flag'),
		tutorialStep(tutorialToolTarget('bean-bag'), '6. Select Bean Bag', 'Select <strong>Bean Bag</strong>.', 'tool:bean-bag'),
		tutorialStep('[data-tutorial="field"]', 'Place the Bean Bag', 'Click the field to place the bean bag.', 'place:bean-bag'),
		tutorialStep(tutorialLatestLayer('marker', 'bean-bag'), 'Set the Bean Bag Color', 'Double-click the bean bag.', 'edit:bean-bag'),
		tutorialStep('[data-tutorial="marker-editor"]', 'Choose a Bean Bag Color', 'Choose any color, or keep blue.', 'color:bean-bag'),
		tutorialStep(tutorialToolTarget('deflag'), '7. Select Flag Belt', 'Select <strong>Flag Belt</strong>.', 'tool:deflag'),
		tutorialStep('[data-tutorial="field"]', 'Place the Flag Belt', 'Click where the runner was deflagged.', 'place:deflag'),
		tutorialStep(tutorialLatestLayer('marker', 'deflag'), 'Edit the Flag Belt', 'Double-click the flag belt.', 'edit:deflag'),
		tutorialStep('[data-tutorial="marker-editor"]', 'Edit the Flag Belt', 'Enter optional text or choose a color.', 'label:deflag'),
		tutorialStep(tutorialToolTarget('event'), '8. Select Event Tag', 'Select <strong>Event Tag</strong>.', 'tool:event'),
		tutorialStep('[data-tutorial="field"]', 'Place an Event', 'Click the field to place the tag.', 'place:event'),
		tutorialStep('[data-tutorial="marker-editor"]', 'Label the Event', 'Type the event, then press <strong>Enter</strong>.', 'label:event'),
		tutorialStep(tutorialToolTarget('run'), '9. Select Run', 'Select <strong>Run</strong>.', 'tool:run'),
		tutorialStep('[data-tutorial="field"]', 'Draw a Run', 'Click for the default arrow, or drag to adjust it.', 'place:run'),
		tutorialStep(tutorialLatestLayer('path', 'run'), 'Format the Run', 'Double-click the arrow.', 'edit:run'),
		tutorialStep('[data-tutorial="line-editor"]', 'Change Line Style', 'Choose a color or line style.', 'format-line'),
		tutorialStep(tutorialToolTarget('pass'), '10. Select Pass', 'Select <strong>Pass</strong>.', 'tool:pass'),
		tutorialStep('[data-tutorial="field"]', 'Draw a Pass', 'Click for the default arrow, or drag to adjust it.', 'place:pass'),
		tutorialStep(tutorialToolTarget('kick'), '11. Select Punt/Kick', 'Select <strong>Punt/Kick</strong>.', 'tool:kick'),
		tutorialStep('[data-tutorial="field"]', 'Draw a Punt or Kick', 'Click for the default arrow, or drag to adjust it.', 'place:kick'),
		tutorialStep(tutorialToolTarget('line-of-scrimmage'), '12. Select L.O.S.', 'Select <strong>L.O.S.</strong>', 'tool:line-of-scrimmage'),
		tutorialStep('[data-tutorial="field"]', 'Place the L.O.S.', 'Click the field to place it.', 'place:line-of-scrimmage'),
		tutorialStep(tutorialLatestLayer('guide', 'line-of-scrimmage'), 'Edit a Cross-Field Line', 'Double-click the L.O.S.', 'edit:line-of-scrimmage'),
		tutorialStep('[data-tutorial="line-editor"]', 'Customize the L.O.S.', 'Choose a color or line style.', 'format-line'),
		tutorialStep(tutorialToolTarget('line-to-gain'), '13. Select L.T.G.', 'Select <strong>L.T.G.</strong>', 'tool:line-to-gain'),
		tutorialStep('[data-tutorial="field"]', 'Place the L.T.G.', 'Click the field to place it.', 'place:line-to-gain'),
		tutorialStep(tutorialToolTarget('free-draw'), '14. Open Draw', 'Select <strong>Draw</strong>.', 'tool:free-draw'),
		tutorialStep('[data-tutorial="draw-options"]', 'Choose Drawing Options', 'Choose a line type, color, and thickness.', undefined, 'Try It'),
		tutorialStep(
			'[data-tutorial="draw-workspace"]',
			'Draw Annotations',
			'Draw as much as you like. You can still change the pen options, then choose <strong>Done</strong>.',
			'draw-stroke',
			'Done'
		),
		tutorialStep(
			'[data-tutorial="interaction-area"]',
			'Move and Delete',
			'Drag one element to move it. Select another and use the trash button or press <strong>Del</strong>.',
			'move-and-delete'
		),
		tutorialStep(
			'[data-tutorial="play-management"]',
			'Organize Multiple Plays',
			'Switch plays, add one with <strong>+</strong>, or double-click a tab to rename, duplicate, or delete it.',
			undefined
		),
		tutorialStep('[data-tutorial="history-actions"]', 'Undo and Redo', 'Undo reverses an action. Redo restores it.', undefined),
		tutorialStep(
			'[data-tutorial="file-actions"]',
			'New, Save, and Copy',
			'New starts over. Save creates a shareable URL, and Copy copies that URL.',
			undefined
		),
		tutorialStep('[data-tutorial="setup-button"]', 'Default Setup', 'Select <strong>Setup</strong> to place a starting scenario.', 'setup-default'),
		tutorialStep('[data-tutorial="settings-button"]', 'Field Settings', 'Select <strong>Settings</strong>.', 'settings-open'),
		tutorialStep(
			() => document.querySelector('[data-tutorial="field-type-options"]')!,
			'Choose a Field Type',
			'Select a different field type.',
			'settings-field-type'
		),
		tutorialStep(
			() => document.querySelector('[data-tutorial="field-color-options"]')!,
			'Choose a Grass Color',
			'Select a different grass color.',
			'settings-field-color'
		),
		tutorialStep(
			'[data-tutorial="export-buttons"]',
			'Export',
			'PNG, JPG, and WebP export the selected play. PDF exports every play. Options controls the background and outer border.',
			undefined
		),
		tutorialStep(
			'[data-tutorial="new-button"]',
			'Start a New Play',
			'Select <strong>New</strong> to finish with a blank traditional field.',
			'tutorial-new-play'
		)
	];
	const moveTutorialNext = () => {
		if (!tutorialDriver || !tutorialActive) return;
		if (tutorialStepIndex >= activeTutorialSteps.length - 1) tutorialDriver.destroy();
		else tutorialDriver.moveNext();
	};
	const tutorialAutoPoint = () => {
		const positions = [
			[0.28, 0.42],
			[0.62, 0.58],
			[0.45, 0.5],
			[0.55, 0.36],
			[0.7, 0.64],
			[0.38, 0.68]
		];
		const [xFraction, yFraction] = positions[tutorialAutoPlacementIndex++ % positions.length];
		return { x: fieldLeft + fieldWidth * xFraction, y: fieldTop + fieldHeight * yFraction };
	};
	const latestTutorialMarker = (kind: MarkerKind) =>
		markers
			.slice()
			.reverse()
			.find((marker) => marker.kind === kind);
	const latestTutorialPath = (kind: PathKind) =>
		paths
			.slice()
			.reverse()
			.find((path) => path.kind === kind);
	const latestTutorialGuide = (kind: GuideKind) =>
		guides
			.slice()
			.reverse()
			.find((guide) => guide.kind === kind);
	const autoPlaceTutorialElement = async (toolId: Tool) => {
		selectTool(toolId);
		const point = tutorialAutoPoint();
		if (toolId === 'event') {
			await placeEventTag(point);
			return;
		}
		if (toolId === 'line-of-scrimmage' || toolId === 'line-to-gain') {
			placeGuide(toolId, point.x);
			return;
		}
		if (toolId === 'run' || toolId === 'pass' || toolId === 'kick') {
			const preview = previewPathFrom(point);
			saveHistory();
			const path: FieldPath = {
				id: nextId++,
				kind: toolId,
				start: preview.start,
				end: preview.end,
				color: toolId === 'pass' ? 'cyan' : toolId === 'kick' ? 'blue' : 'white',
				style: toolId === 'run' ? 'solid' : 'dashed'
			};
			paths = [...paths, path];
			raiseLayer('path', path.id);
			return;
		}
		if (toolId === 'free-draw') {
			saveHistory();
			freeStrokes = [
				...freeStrokes,
				{
					id: nextId++,
					color: freeDrawColor,
					width: freeDrawThickness,
					points: [point, { x: point.x + fieldWidth * 0.1, y: point.y - fieldHeight * 0.08 }]
				}
			];
			return;
		}
		if (toolId === 'laser') return;
		saveHistory();
		const marker = createMarker(toolId, point);
		markers = [...markers, marker];
		raiseLayer('marker', marker.id);
	};
	const autoOpenTutorialEditor = async (kind: MarkerKind | PathKind | GuideKind) => {
		const event = new Event('dblclick', { bubbles: true });
		if ([...playerKinds, ...officialKinds, 'ball', 'flag', 'bean-bag', 'deflag', 'event'].includes(kind as MarkerKind)) {
			const marker = latestTutorialMarker(kind as MarkerKind);
			if (marker) await startEditingMarker(event, marker);
			return;
		}
		if (kind === 'line-of-scrimmage' || kind === 'line-to-gain' || kind === 'custom') {
			const guide = latestTutorialGuide(kind);
			if (guide) startEditingGuide(event, guide);
			return;
		}
		const path = latestTutorialPath(kind as PathKind);
		if (path) startEditingPath(event, path);
	};
	const autoCompleteTutorialLabel = async (kind: MarkerKind) => {
		if (editingMarkerId === null) await autoOpenTutorialEditor(kind);
		await tick();
		if (!editingMarker) return;
		const automaticLabels: Partial<Record<MarkerKind, string>> = {
			'team-a': 'QB',
			flag: 'Flag Guarding',
			deflag: 'Deflagged',
			event: 'Interception'
		};
		editValue = automaticLabels[kind] ?? editingMarker.label ?? '';
		commitMarkerEditor();
	};
	const performTutorialSkip = async (action?: TutorialAction) => {
		if (!action) return;
		if (action === 'tool:official') {
			selectTool('official-r');
			return;
		}
		if (action === 'place:official') {
			await autoPlaceTutorialElement('official-r');
			return;
		}
		if (action.startsWith('tool:')) {
			selectTool(action.slice(5) as Tool);
			return;
		}
		if (action.startsWith('place:')) {
			await autoPlaceTutorialElement(action.slice(6) as Tool);
			return;
		}
		if (action.startsWith('edit:')) {
			await autoOpenTutorialEditor(action.slice(5) as MarkerKind | PathKind | GuideKind);
			return;
		}
		if (action.startsWith('label:')) {
			await autoCompleteTutorialLabel(action.slice(6) as MarkerKind);
			return;
		}
		if (action === 'color:bean-bag') {
			if (editingMarkerId === null) await autoOpenTutorialEditor('bean-bag');
			await tick();
			updateBeanBagColor('white');
			return;
		}
		if (action === 'format-line') {
			updateGuideColor('red');
			return;
		}
		if (action === 'draw-stroke') {
			if (!tutorialHasDrawnStroke) await autoPlaceTutorialElement('free-draw');
			return;
		}
		if (action === 'move-and-delete') {
			const movable = markers[0];
			if (movable) {
				saveHistory();
				markers = markers.map((marker) => (marker.id === movable.id ? { ...marker, x: movable.x + 20, y: movable.y + 12 } : marker));
				paths = paths.map((path) => (path.startMarkerId === movable.id ? { ...path, start: { x: movable.x + 20, y: movable.y + 12 } } : path));
			}
			const removable = markers.find((marker) => marker.id !== movable?.id) ?? markers[0];
			if (removable) {
				saveHistory();
				removeElementTarget({ type: 'marker', id: removable.id });
			}
			return;
		}
		if (action === 'setup-default') {
			setupDefaultScenario();
			return;
		}
		if (action === 'settings-open') {
			await openSettings();
			return;
		}
		if (action === 'settings-field-type') {
			const nextType = fieldTypeOptions.find((option) => option.id !== fieldSettings.fieldType)?.id;
			if (nextType) updateFieldSetting('fieldType', nextType);
			return;
		}
		if (action === 'settings-field-color') {
			const nextColor = fieldColorOptions.find((option) => option.id !== fieldSettings.fieldColor)?.id;
			if (nextColor) updateFieldSetting('fieldColor', nextColor);
			showSettings = false;
			return;
		}
		if (action === 'tutorial-new-play') {
			await createTutorialNewPlay();
		}
	};
	const skipTutorialStep = async (index = tutorialStepIndex) => {
		if (!tutorialDriver || !tutorialActive) return;
		if (index >= activeTutorialSteps.length - 1) {
			tutorialDriver.destroy();
			return;
		}
		const action = activeTutorialSteps[index]?.data?.waitFor;
		tutorialSkipping = true;
		try {
			await performTutorialSkip(action);
			await tick();
		} finally {
			tutorialSkipping = false;
		}
		if (tutorialActive && tutorialStepIndex === index) tutorialDriver.moveNext();
	};
	const focusTutorialInlineEditor = () => {
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				const input = builderRoot?.querySelector<HTMLInputElement>('[data-tutorial="marker-editor"] input');
				if (!input) return;
				input.focus({ preventScroll: true });
				input.select();
			})
		);
	};
	const completeTutorialAction = (action: TutorialAction) => {
		if (tutorialSkipping || !tutorialActive) return;
		const expectedAction = activeTutorialSteps[tutorialStepIndex]?.data?.waitFor;
		if (expectedAction === 'tool:official' && action.startsWith('tool:') && isOfficialKind(action.slice(5) as MarkerKind)) {
			void tick().then(() => requestAnimationFrame(moveTutorialNext));
			return;
		}
		if (expectedAction === 'place:official' && action.startsWith('place:') && isOfficialKind(action.slice(6) as MarkerKind)) {
			void tick().then(() => requestAnimationFrame(moveTutorialNext));
			return;
		}
		if (expectedAction === 'draw-stroke' && action === 'draw-stroke') {
			tutorialHasDrawnStroke = true;
			return;
		}
		if (expectedAction === 'move-and-delete') {
			if (action === 'move-element') tutorialHasMovedElement = true;
			if (action === 'delete-element') tutorialHasDeletedElement = true;
			if (!tutorialHasMovedElement || !tutorialHasDeletedElement) return;
			void tick().then(() => requestAnimationFrame(moveTutorialNext));
			return;
		}
		if (expectedAction !== action) return;
		if (action.startsWith('label:')) {
			moveTutorialNext();
			return;
		}
		if (action === 'settings-field-color') showSettings = false;
		void tick().then(() => requestAnimationFrame(moveTutorialNext));
	};
	const markTutorialSeen = () => {
		if (!tutorialButtonBouncing) return;
		tutorialButtonBouncing = false;
		localStorage.setItem(tutorialSeenKey, '1');
	};
	const startTutorial = () => {
		markTutorialSeen();
		showHelp = false;
		showSettings = false;
		showExportSettings = false;
		showNewPrompt = false;
		editingPlayId = null;
		commitActiveEditor();
		tutorialDriver?.destroy();
		tutorialSkipping = false;
		tutorialAutoPlacementIndex = 0;
		tutorialHasDrawnStroke = false;
		tutorialHasMovedElement = false;
		tutorialHasDeletedElement = false;
		activeTutorialSteps = buildTutorialSteps().map((step, index) => ({
			...step,
			popover: {
				...step.popover,
				onNextClick: () => void skipTutorialStep(index)
			}
		}));
		tutorialDriver = driver({
			steps: activeTutorialSteps,
			animate: true,
			duration: 250,
			overlayColor: '#1c1917',
			overlayOpacity: 0.58,
			allowClose: false,
			overlayClickBehavior: () => {},
			allowKeyboardControl: false,
			stagePadding: 5,
			stageRadius: 0,
			popoverOffset: 10,
			popoverClass: 'caseplay-tutorial-popover',
			showButtons: ['next'],
			showProgress: true,
			progressText: '{{current}} / {{total}}',
			onPopoverRender: (popover, options) => {
				const endButton = document.createElement('button');
				endButton.type = 'button';
				endButton.textContent = 'End';
				endButton.className = 'caseplay-tutorial-end';
				endButton.setAttribute('aria-label', 'End tutorial');
				endButton.addEventListener('click', () => tutorialDriver?.destroy());
				popover.footerButtons.appendChild(endButton);
				if (activeTutorialSteps[options.index ?? -1]?.element === '[data-tutorial="marker-editor"]') focusTutorialInlineEditor();
			},
			onHighlightStarted: (_element, _step, options) => {
				tutorialStepIndex = options.index ?? 0;
				if (activeTutorialSteps[tutorialStepIndex]?.data?.waitFor === 'move-and-delete') selectTool('team-a');
			},
			onDestroyed: () => {
				tutorialActive = false;
				tutorialSkipping = false;
				tutorialDriver = null;
				activeTutorialSteps = [];
				tutorialStepIndex = 0;
			}
		});
		tutorialActive = true;
		tutorialDriver.drive();
	};
	const selectTool = (nextTool: Tool) => {
		if (suppressNextClick) return;
		if (tool === 'laser' && nextTool !== 'laser') releaseLaserDrawings();
		if (hasActiveInlineEditor()) commitActiveEditor();
		clearDeleteState();
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		if (toolbarEditorTool !== null && toolbarEditorTool !== nextTool) toolbarEditorTool = null;
		tool = nextTool;
		completeTutorialAction(`tool:${nextTool}`);
	};
	const activateToolbarTool = (nextTool: Tool) => {
		if (toolbarEditorTool === nextTool) {
			toolbarEditorTool = null;
			return;
		}
		selectTool(nextTool);
	};
	const openHelp = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		showExportSettings = false;
		showFeedback = false;
		showHelp = true;
		await tick();
		helpCloseButton?.focus();
	};
	const openFeedback = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		showExportSettings = false;
		showSettings = false;
		showHelp = false;
		showFeedback = true;
		await tick();
		feedbackCloseButton?.focus();
	};
	const openSettings = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		showExportSettings = false;
		showFeedback = false;
		showSettings = true;
		await tick();
		settingsCloseButton?.focus();
		completeTutorialAction('settings-open');
	};
	const openExportSettings = async () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		showHelp = false;
		showSettings = false;
		showFeedback = false;
		exportColorPicker = null;
		const builderBounds = builderRoot.getBoundingClientRect();
		exportSettingsTop = Math.max(8, builderBounds.top + 48);
		exportSettingsRight = Math.max(8, window.innerWidth - builderBounds.right + 8);
		showExportSettings = true;
		await tick();
		exportSettingsCloseButton?.focus();
	};
	const updateFieldSetting = <Key extends keyof PlayBuilderFieldSettings>(key: Key, value: PlayBuilderFieldSettings[Key]) => {
		if (fieldSettings[key] === value) {
			if (key === 'fieldColor') completeTutorialAction('settings-field-color');
			return;
		}
		saveHistory();
		if (key === 'fieldType') discardFreeDrawings();
		fieldSettings = { ...fieldSettings, [key]: value };
		if (key === 'showDownMarker' && value === false) editingDownGuideId = null;
		if (key === 'showLineOfScrimmageMarker' && value === false && editingGuide?.kind === 'line-of-scrimmage') editingGuideId = null;
		clearPlacementSnap();
		if (key === 'fieldType') completeTutorialAction('settings-field-type');
		if (key === 'fieldColor') completeTutorialAction('settings-field-color');
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
			| 'showDownMarker'
			| 'showLineOfScrimmageMarker'
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
		if (tool === 'laser') releaseLaserDrawings();
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
	const createTutorialNewPlay = async () => {
		tutorialDriver?.destroy();
		showNewPrompt = false;
		await openBlankBoard();
	};
	const requestNewBoard = async () => {
		if (tutorialActive && activeTutorialSteps[tutorialStepIndex]?.data?.waitFor === 'tutorial-new-play') {
			await createTutorialNewPlay();
			return;
		}
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
			unified: { lineOfScrimmage: 15, lineToGain: 30, quarterbackDepth: 5 },
			'nfl-flag': { lineOfScrimmage: 15, lineToGain: 35, quarterbackDepth: 5 }
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
		const lineToGain: FieldGuide = { id: nextId++, kind: 'line-to-gain', x: lineToGainX, color: 'yellow', style: 'solid', down: '1st' };
		const football: FieldMarker = { id: nextId++, kind: 'ball', x: lineOfScrimmageX, y: centerY };
		const quarterback: FieldMarker = { id: nextId++, kind: 'team-a', sequence: 1, label: 'A-1', x: quarterbackX, y: centerY };
		const standardRefereeX = xForYards(setup.lineOfScrimmage - setup.quarterbackDepth - 7);
		const standardRefereeY = fieldTop + fieldHeight * Math.min(0.82, 0.5 + 7 / fieldLayout.widthYards);
		const lineJudgeY = fieldTop - officialSize * 0.18;
		const fieldJudgeY = fieldBottom + officialSize * 0.12;
		const officialPositions: Record<PlayBuilderFieldType, { kind: OfficialKind; x: number; y: number }[]> = {
			traditional: [
				{ kind: 'official-r', x: standardRefereeX, y: standardRefereeY },
				{ kind: 'official-l', x: lineOfScrimmageX, y: lineJudgeY },
				{ kind: 'official-b', x: xForYards(setup.lineOfScrimmage + 20), y: fieldTop + fieldHeight * 0.375 },
				{ kind: 'official-f', x: xForYards(setup.lineOfScrimmage + 10), y: fieldJudgeY }
			],
			'four-v-four': [
				{ kind: 'official-r', x: standardRefereeX, y: standardRefereeY },
				{ kind: 'official-l', x: lineOfScrimmageX, y: lineJudgeY }
			],
			unified: [
				// A begins inside its 10-yard line, so the R starts on A's end line under reverse-goal-line mechanics.
				{ kind: 'official-r', x: xForYards(0), y: standardRefereeY },
				{ kind: 'official-l', x: lineOfScrimmageX, y: lineJudgeY },
				{ kind: 'official-b', x: xForYards(setup.lineOfScrimmage + 20), y: fieldTop + fieldHeight * 0.375 },
				{ kind: 'official-f', x: xForYards(setup.lineOfScrimmage + 10), y: fieldJudgeY }
			],
			'nfl-flag': [
				{ kind: 'official-r', x: standardRefereeX, y: standardRefereeY },
				{ kind: 'official-l', x: lineOfScrimmageX, y: lineJudgeY }
			]
		};
		const officials = officialPositions[fieldSettings.fieldType].map((position) => ({ id: nextId++, ...position }));
		markers = [football, quarterback, ...officials];
		paths = [];
		guides = [lineOfScrimmage, lineToGain];
		freeStrokes = [];
		activeFreeStroke = null;
		layerOrder = [
			{ type: 'guide', id: lineOfScrimmage.id },
			{ type: 'guide', id: lineToGain.id },
			{ type: 'marker', id: football.id },
			{ type: 'marker', id: quarterback.id },
			...officials.map((official): LayerRef => ({ type: 'marker', id: official.id }))
		];
		if (tool === 'laser') releaseLaserDrawings();
		tool = 'team-a';
		syncLayerDom();
		completeTutorialAction('setup-default');
	};
	const flipFieldDirection = () => {
		if (dismissEditorForAction() || suppressNextClick) return;
		const flipPoint = (point: Point): Point => ({ x: fieldLeft + fieldRight - point.x, y: point.y });
		saveHistory();
		clearEditorState();
		clearDeleteState();
		clearPlacementSnap();
		markers = markers.map((marker) => ({ ...marker, ...flipPoint(marker) }));
		paths = paths.map((path) => ({ ...path, start: flipPoint(path.start), end: flipPoint(path.end) }));
		guides = guides.map((guide) => ({ ...guide, x: fieldLeft + fieldRight - guide.x }));
		freeStrokes = freeStrokes.map((stroke) => ({ ...stroke, points: stroke.points.map(flipPoint) }));
		laserDrawings = laserDrawings.map((drawing) => ({ ...drawing, points: drawing.points.map(flipPoint) }));
		activeFreeStroke = activeFreeStroke ? { ...activeFreeStroke, points: activeFreeStroke.points.map(flipPoint) } : null;
		activeLaserDrawing = activeLaserDrawing ? { ...activeLaserDrawing, points: activeLaserDrawing.points.map(flipPoint) } : null;
		laserTrail = laserTrail.map((point) => ({ ...point, ...flipPoint(point) }));
		laserPointer = laserPointer ? flipPoint(laserPointer) : null;
		drawing = null;
		dragTarget = null;
		syncLayerDom();
	};
	const runGuardedAction = (action: () => void) => {
		if (dismissEditorForAction() || suppressNextClick) return;
		action();
	};
	const handleMarkerKeydown = (event: KeyboardEvent, marker: FieldMarker) => {
		if (viewOnly) return;
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
		if (viewOnly) return;
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
		if (viewOnly) return;
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
	const isStylusBarrelButtonActive = (event: PointerEvent) => event.pointerType === 'pen' && (event.button === 2 || (event.buttons & 2) === 2);
	const shouldSnapStraightDrawing = (event: PointerEvent) => event.shiftKey || isStylusBarrelButtonActive(event);
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
		if (viewOnly) return;
		const target = selectedTargetAtClientPoint(clientX, clientY);
		if (!target) return;
		if (!eraseHistorySaved) {
			saveHistory();
			eraseHistorySaved = true;
		}
		removeElementTarget(target);
	};
	const beginStylusEraser = (event: PointerEvent) => {
		if (viewOnly) return;
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
		if (tool !== 'free-draw') eraseElementAtClientPoint(event.clientX, event.clientY);
		try {
			svg.setPointerCapture(event.pointerId);
		} catch {
			// Some browser/driver combinations expose the eraser signal without allowing pointer capture.
		}
	};
	const beginFreeDrawing = (event: PointerEvent) => {
		if (viewOnly) return;
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
		const replacedGuide = guides.find((item) => item.kind === kind);
		const guide: FieldGuide = {
			id: nextId++,
			kind,
			x: kind === 'line-to-gain' ? wholeYardLineToGainX(x) : wholeYardLineOfScrimmageX(x),
			color: defaultGuideColor(kind),
			style: defaultGuideStyle(kind),
			down: kind === 'line-to-gain' ? (replacedGuide?.down ?? '1st') : undefined
		};
		if (kind === 'line-of-scrimmage' || kind === 'line-to-gain') {
			const removedIds = new Set(guides.filter((item) => item.kind === kind).map((item) => item.id));
			guides = [...guides.filter((item) => item.kind !== kind), guide];
			layerOrder = layerOrder.filter((layer) => layer.type !== 'guide' || !removedIds.has(layer.id));
		}
		raiseLayer('guide', guide.id);
		completeTutorialAction(`place:${kind}`);
	};
	const placeBall = (point: Point) => {
		saveHistory();
		const marker = createMarker('ball', point);
		markers = [...markers, marker];
		raiseLayer('marker', marker.id);
		completeTutorialAction('place:ball');
	};
	const placeEventTag = async (point: Point) => {
		clearDeleteState();
		saveHistory();
		const marker = createMarker('event', point);
		markers = [...markers, marker];
		raiseLayer('marker', marker.id);
		editingMarkerId = marker.id;
		editingGuideId = null;
		editingPathId = null;
		editingDownGuideId = null;
		editValue = marker.label ?? '';
		await tick();
		editInput?.focus();
		editInput?.select();
		completeTutorialAction('place:event');
	};

	const beginOnField = async (event: PointerEvent) => {
		if (viewOnly) return;
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		clearDeleteState();
		if (tool === 'laser') {
			const canvasPoint = canvasPointFromEvent(event);
			if (isPointInActiveToolArea(canvasPoint)) beginLaserDrawing(event, pointForActiveTool(canvasPoint));
			return;
		}
		if (tutorialActive && activeTutorialSteps[tutorialStepIndex]?.data?.waitFor === 'move-and-delete') return;
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		const canvasPoint = canvasPointFromEvent(event);
		if (!isPointInActiveToolArea(canvasPoint)) return;
		const point = pointForActiveTool(canvasPoint);
		if (tool === 'event') {
			await placeEventTag(point);
			return;
		}
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
			completeTutorialAction(`place:${tool}`);
			return;
		}

		if (isPathTool(tool)) {
			const preview = previewPathFrom(point);
			drawing = { kind: tool, start: preview.start, end: preview.end, pointerStart: point, hasDragged: false };
			svg.setPointerCapture(event.pointerId);
		}
	};
	const beginOnMarker = async (event: PointerEvent, marker: FieldMarker) => {
		if (viewOnly) return;
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		if (tool === 'laser') {
			beginLaserDrawing(event, canvasPointFromEvent(event));
			return;
		}
		const snappedX = placementSnapX;
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		if (tool === 'event' && marker.kind !== 'ball' && marker.kind !== 'event') {
			await placeEventTag(pointFromEvent(event));
			return;
		}
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
				startMarkerId: marker.id,
				hasDragged: false
			};
			svg.setPointerCapture(event.pointerId);
			return;
		}
		scheduleDeleteTargetAtPointer({ type: 'marker', id: marker.id }, event);
		dragTarget = {
			type: 'marker',
			id: marker.id,
			pointerStart: isSidelineMarkerKind(marker.kind) ? clampSidelineMarkerPoint(canvasPointFromEvent(event)) : pointFromEvent(event),
			elementStart: { x: marker.x, y: marker.y },
			moved: false,
			snapToMarkers: paths.some((path) => path.startMarkerId === marker.id)
		};
	};
	const beginOnPath = async (event: PointerEvent, path: FieldPath, mode: 'whole' | 'start' | 'end' = 'whole') => {
		if (viewOnly) return;
		if (event.button !== 0 || dismissEditorForAction() || suppressNextClick) return;
		event.preventDefault();
		if (tool === 'laser') {
			beginLaserDrawing(event, canvasPointFromEvent(event));
			return;
		}
		clearPlacementSnap();
		if (tool === 'event') {
			await placeEventTag(pointFromEvent(event));
			return;
		}
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		scheduleDeleteTargetAtPointer({ type: 'path', id: path.id }, event);
		const start = pathStart(path);
		if (mode === 'start' && path.startMarkerId !== undefined) {
			const attachedMarker = markers.find((marker) => marker.id === path.startMarkerId);
			if (attachedMarker) {
				scheduleDeleteTargetAtPointer({ type: 'marker', id: attachedMarker.id }, event);
				dragTarget = {
					type: 'marker',
					id: attachedMarker.id,
					pointerStart: isSidelineMarkerKind(attachedMarker.kind) ? clampSidelineMarkerPoint(canvasPointFromEvent(event)) : pointFromEvent(event),
					elementStart: { x: attachedMarker.x, y: attachedMarker.y },
					moved: false,
					snapToMarkers: true
				};
				return;
			}
		}
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
	const beginOnGuide = async (event: PointerEvent, guide: FieldGuide, fromDownMarker = false) => {
		if (viewOnly) return;
		if (event.button !== 0 || suppressNextClick) return;
		if (tool === 'laser') {
			event.preventDefault();
			beginLaserDrawing(event, canvasPointFromEvent(event));
			return;
		}
		if (fromDownMarker && editingDownGuideId === guide.id) {
			event.preventDefault();
			return;
		}
		if (dismissEditorForAction()) return;
		event.preventDefault();
		const snappedX = placementSnapX;
		clearPlacementSnap();
		lastPlacementHoverPoint = null;
		if (tool === 'event') {
			await placeEventTag(pointFromEvent(event));
			return;
		}
		if (tool === 'ball') {
			const point = pointFromEvent(event);
			placeBall({ ...point, x: snappedX ?? guide.x });
			return;
		}
		if (tool === 'free-draw') {
			beginFreeDrawing(event);
			return;
		}
		if (!fromDownMarker) scheduleDeleteTargetAtPointer({ type: 'guide', id: guide.id }, event);
		dragTarget = { type: 'guide', id: guide.id, pointerStart: pointFromEvent(event), xStart: guide.x, moved: false, fromDownMarker };
	};
	const continuePointer = (event: PointerEvent) => {
		if (viewOnly) return;
		if (stylusEraserActive) {
			event.preventDefault();
			const point = canvasPointFromEvent(event);
			eraseFreeStrokesAlong(lastErasePoint ?? point, point);
			if (tool !== 'free-draw') eraseElementAtClientPoint(event.clientX, event.clientY);
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
		pointerOnField = isPointInActiveToolArea(canvasPoint);
		const point = pointForActiveTool(canvasPoint);
		if (tool === 'laser') {
			if (pointerOnField) {
				updateLaserPointer(point);
				continueLaserDrawing(event, point);
			} else laserPointer = null;
			hoverPoint = pointerOnField ? point : null;
			hoveringElement = false;
			return;
		}
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
		const canPlaceEventThroughHoveredElement =
			tool === 'event' &&
			Boolean(hoveredFieldElement) &&
			hoveredFieldElement?.getAttribute('data-field-type') !== 'team-box-text' &&
			!(
				hoveredFieldElement?.getAttribute('data-field-type') === 'marker' &&
				['ball', 'event'].includes(hoveredFieldElement?.getAttribute('data-field-kind') ?? '')
			);
		hoveringElement = Boolean(hoveredFieldElement) && !canSnapThroughHoveredElement && !canPlaceEventThroughHoveredElement;
		const placementPointerMoved =
			!lastPlacementHoverPoint || Math.hypot(point.x - lastPlacementHoverPoint.x, point.y - lastPlacementHoverPoint.y) > 0.1;
		if (drawing || activeFreeStroke || (dragTarget && placementPointerMoved)) clearPlacementSnap();
		else if (!dragTarget && placementPointerMoved) schedulePlacementSnap(point, event.shiftKey);
		lastPlacementHoverPoint = point;
		if (activeFreeStroke) {
			const strokePoint =
				activeFreeDrawShape === 'straight' && shouldSnapStraightDrawing(event)
					? snapStraightDrawPoint(activeFreeStroke.points[0], canvasPoint)
					: canvasPoint;
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
		if (drawing) {
			const pointerDistance = Math.hypot(point.x - drawing.pointerStart.x, point.y - drawing.pointerStart.y);
			drawing = { ...drawing, end: drawingPathEnd(drawing, point), hasDragged: drawing.hasDragged || pointerDistance >= 4 };
		}
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
			const target = dragTarget;
			const draggedMarker = markers.find((marker) => marker.id === target.id);
			const unclampedCandidate = { x: target.elementStart.x + rawDx, y: target.elementStart.y + rawDy };
			const candidate =
				draggedMarker && isSidelineMarkerKind(draggedMarker.kind) ? clampSidelineMarkerPoint(unclampedCandidate) : clampPoint(unclampedCandidate);
			const snappedMarker = event.shiftKey && dragTarget.snapToMarkers ? nearestMarkerToPoint(candidate, dragTarget.id) : null;
			const next = snappedMarker ? { x: snappedMarker.x, y: snappedMarker.y } : candidate;
			markers = markers.map((marker) => (marker.id === target.id ? { ...marker, ...next } : marker));
			paths = paths.map((path) => (path.startMarkerId === target.id ? { ...path, start: { ...next } } : path));
			if (!snappedMarker && placementPointerMoved) scheduleDragSnap(target, next.x, event.shiftKey);
		}
		if (dragTarget.type === 'guide') {
			const target = dragTarget;
			const draggedGuide = guides.find((guide) => guide.id === target.id);
			const rawX = Math.max(fieldLeft, Math.min(fieldRight, target.xStart + rawDx));
			const x =
				draggedGuide?.kind === 'line-to-gain'
					? wholeYardLineToGainX(rawX)
					: draggedGuide?.kind === 'line-of-scrimmage'
						? wholeYardLineOfScrimmageX(rawX)
						: rawX;
			guides = guides.map((guide) => (guide.id === target.id ? { ...guide, x } : guide));
			if (placementPointerMoved) scheduleDragSnap(target, x, event.shiftKey);
		}
		if (dragTarget.type === 'path') {
			const target = dragTarget;
			if (target.mode === 'end') {
				const candidate = clampPoint({ x: target.end.x + rawDx, y: target.end.y + rawDy });
				const end = pointWithMinimumDistance(target.start, candidate, target.end);
				paths = paths.map((path) => (path.id === target.id ? { ...path, end } : path));
				return;
			}
			if (target.mode === 'start') {
				const candidate = clampPoint({ x: target.start.x + rawDx, y: target.start.y + rawDy });
				const snappedMarker = event.shiftKey ? nearestMarkerToPoint(candidate) : null;
				const start = snappedMarker ? { x: snappedMarker.x, y: snappedMarker.y } : pointWithMinimumDistance(target.end, candidate, target.start);
				paths = paths.map((path) => (path.id === target.id ? { ...path, start, startMarkerId: snappedMarker?.id } : path));
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
		if (viewOnly) return;
		if (tool === 'laser') {
			if (laserDrawingPointerId === event.pointerId) finishLaserDrawing();
			if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
			return;
		}
		if (stylusEraserActive) {
			const point = canvasPointFromEvent(event);
			eraseFreeStrokesAlong(lastErasePoint ?? point, point);
			if (tool !== 'free-draw') eraseElementAtClientPoint(event.clientX, event.clientY);
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
		if (event.pointerType === 'pen' && event.button === 2) return;
		if (activeFreeStroke) {
			const first = activeFreeStroke.points[0];
			const rawFinalPoint = canvasPointFromEvent(event);
			const finalPoint =
				activeFreeDrawShape === 'straight' && shouldSnapStraightDrawing(event) ? snapStraightDrawPoint(first, rawFinalPoint) : rawFinalPoint;
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
			completeTutorialAction('draw-stroke');
			if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
			return;
		}
		const draggedDownMarker = dragTarget?.type === 'guide' && dragTarget.fromDownMarker && dragTarget.moved;
		const droppedTarget: SelectedTarget | null = dragTarget?.moved ? { type: dragTarget.type, id: dragTarget.id } : null;
		if (drawing && (!drawing.hasDragged || Math.hypot(drawing.end.x - drawing.start.x, drawing.end.y - drawing.start.y) >= minimumArrowLength())) {
			saveHistory();
			const pathId = nextId++;
			const placedPathKind = drawing.kind;
			paths = [
				...paths,
				{
					id: pathId,
					kind: drawing.kind,
					start: drawing.start,
					end: drawing.end,
					startMarkerId: drawing.startMarkerId,
					color: isArrowKind(drawing.kind) ? arrowPlacementColor(drawing.kind) : 'yellow',
					style: isArrowKind(drawing.kind) ? arrowPlacementStyles[drawing.kind] : 'solid'
				}
			];
			raiseLayer('path', pathId);
			completeTutorialAction(`place:${placedPathKind}`);
		}
		drawing = null;
		clearPlacementSnap();
		dragTarget = null;
		if (draggedDownMarker) {
			suppressDownMarkerClick = true;
			setTimeout(() => (suppressDownMarkerClick = false), 0);
		}
		if (droppedTarget) {
			raiseLayer(droppedTarget.type, droppedTarget.id);
			completeTutorialAction('move-element');
		}
		if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
	};
	const cancelPointer = () => {
		drawing = null;
		activeFreeStroke = null;
		activeLaserDrawing = null;
		laserDrawingPointerId = null;
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
	const defaultPathColor = (kind: PathKind) => guideColor(isArrowKind(kind) ? arrowPlacementColor(kind) : 'yellow');
	const defaultPathStyle = (kind: PathKind): GuideStyle => (isArrowKind(kind) ? arrowPlacementStyles[kind] : 'solid');
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
	const arrowHitTip = (kind: Exclude<PathKind, 'line'>, start: Point, end: Point): Point => {
		const beforeEnd = kind === 'pass' || kind === 'kick' ? airbornePoint(kind, start, end, 0.98) : start;
		const dx = end.x - beforeEnd.x;
		const dy = end.y - beforeEnd.y;
		const distance = Math.hypot(dx, dy) || 1;
		return { x: end.x + (dx / distance) * 24, y: end.y + (dy / distance) * 24 };
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
	const restoreExportSettings = () => {
		try {
			const raw = localStorage.getItem(exportSettingsStorageKey);
			if (!raw) return;
			const stored = JSON.parse(raw) as Record<string, unknown>;
			if (exportBackgroundOptions.some((option) => option.id === stored.background)) exportBackground = stored.background as ExportBackground;
			if (typeof stored.backgroundColor === 'string' && /^#[\da-f]{6}$/i.test(stored.backgroundColor)) exportBackgroundColor = stored.backgroundColor;
			if (typeof stored.fieldBorderColor === 'string' && /^#[\da-f]{6}$/i.test(stored.fieldBorderColor))
				exportFieldBorderColor = stored.fieldBorderColor;
			if (typeof stored.backgroundOpacity === 'number' && Number.isFinite(stored.backgroundOpacity))
				exportBackgroundOpacity = Math.max(0, Math.min(1, stored.backgroundOpacity));
			if (typeof stored.fieldBorderOpacity === 'number' && Number.isFinite(stored.fieldBorderOpacity))
				exportFieldBorderOpacity = Math.max(0, Math.min(1, stored.fieldBorderOpacity));
		} catch {
			// Ignore malformed settings left by an older browser session.
		}
	};
	const isGuideColor = (value: unknown): value is GuideColor => typeof value === 'string' && guideColors.some((option) => option.id === value);
	const isLaserColor = (value: unknown): value is LaserColor => typeof value === 'string' && laserColors.some((option) => option.id === value);
	const restoreToolPreferences = () => {
		try {
			const raw = localStorage.getItem(toolPreferencesStorageKey);
			if (!raw) return;
			const stored = JSON.parse(raw) as Record<string, unknown>;
			if (isGuideColor(stored.drawColor) && freeDrawColors.some((option) => option.id === stored.drawColor)) freeDrawColor = stored.drawColor;
			if (stored.drawShape === 'straight' || stored.drawShape === 'squiggle') {
				freeDrawShape = stored.drawShape;
				activeFreeDrawShape = stored.drawShape;
			}
			if (typeof stored.drawThickness === 'number' && Number.isFinite(stored.drawThickness))
				freeDrawThickness = Math.round(Math.max(2, Math.min(8, stored.drawThickness)));
			if (isGuideColor(stored.flagBeltColor) && deflagColors.some((option) => option.id === stored.flagBeltColor))
				deflagPlacementColor = stored.flagBeltColor;
			if (typeof stored.beanBagColor === 'string' && beanBagColors.some((option) => option.id === stored.beanBagColor))
				beanBagPlacementColor = stored.beanBagColor as GuideColor;
			if (isLaserColor(stored.laserColor)) laserColor = stored.laserColor;
			if (stored.arrowColors && typeof stored.arrowColors === 'object') {
				const colors = stored.arrowColors as Record<string, unknown>;
				arrowPlacementColors = {
					run: isGuideColor(colors.run) ? colors.run : arrowPlacementColors.run,
					pass: isGuideColor(colors.pass) ? colors.pass : arrowPlacementColors.pass,
					kick: isGuideColor(colors.kick) ? colors.kick : arrowPlacementColors.kick
				};
			}
			if (stored.arrowStyles && typeof stored.arrowStyles === 'object') {
				const styles = stored.arrowStyles as Record<string, unknown>;
				arrowPlacementStyles = {
					run: guideStyles.includes(styles.run as GuideStyle) ? (styles.run as GuideStyle) : arrowPlacementStyles.run,
					pass: guideStyles.includes(styles.pass as GuideStyle) ? (styles.pass as GuideStyle) : arrowPlacementStyles.pass,
					kick: guideStyles.includes(styles.kick as GuideStyle) ? (styles.kick as GuideStyle) : arrowPlacementStyles.kick
				};
			}
			if (stored.guideColors && typeof stored.guideColors === 'object') {
				const colors = stored.guideColors as Record<string, unknown>;
				guidePlacementColors = {
					'line-of-scrimmage': isGuideColor(colors['line-of-scrimmage']) ? colors['line-of-scrimmage'] : guidePlacementColors['line-of-scrimmage'],
					'line-to-gain': isGuideColor(colors['line-to-gain']) ? colors['line-to-gain'] : guidePlacementColors['line-to-gain']
				};
			}
			if (stored.guideStyles && typeof stored.guideStyles === 'object') {
				const styles = stored.guideStyles as Record<string, unknown>;
				guidePlacementStyles = {
					'line-of-scrimmage': guideStyles.includes(styles['line-of-scrimmage'] as GuideStyle)
						? (styles['line-of-scrimmage'] as GuideStyle)
						: guidePlacementStyles['line-of-scrimmage'],
					'line-to-gain': guideStyles.includes(styles['line-to-gain'] as GuideStyle)
						? (styles['line-to-gain'] as GuideStyle)
						: guidePlacementStyles['line-to-gain']
				};
			}
		} catch {
			// Ignore malformed preferences left by an older browser session.
		}
	};

	onMount(() => {
		restoreExportSettings();
		exportSettingsHydrated = true;
		restoreToolPreferences();
		toolPreferencesHydrated = true;
		tutorialButtonBouncing = localStorage.getItem(tutorialSeenKey) !== '1';
		const browserNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
		const usesAppleShortcuts = /Mac|iPhone|iPad|iPod/i.test(browserNavigator.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent);
		primaryModifierKey = usesAppleShortcuts ? '⌘' : 'Ctrl';
		alternateModifierKey = usesAppleShortcuts ? 'Option' : 'Alt';
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
			tutorialDriver?.destroy();
			clearPlacementSnap();
			clearActionMessageTimer();
			if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
			if (deleteTargetTimer) clearTimeout(deleteTargetTimer);
			if (laserTrailFrame !== null) cancelAnimationFrame(laserTrailFrame);
			document.removeEventListener('pointerdown', handleWindowPointerDown, true);
			document.removeEventListener('click', handleWindowClick, true);
		};
	});
</script>

<svelte:window on:keydown={handleGlobalKeydown} on:beforeunload={handleBeforeUnload} />

<section
	bind:this={builderRoot}
	on:pointerdown={markTutorialSeen}
	class="relative border-2 border-stone-900 bg-stone-800 shadow-lg select-none"
	class:view-only={viewOnly}
	aria-label={viewOnly ? 'Shared flag football play diagram' : 'Flag football play builder'}
>
	<div data-tutorial="draw-workspace" class="flex gap-2 p-2" aria-hidden={viewOnly}>
		<div class="tool-column relative my-auto w-10 shrink-0 sm:w-12">
			<div class="flex w-full flex-col gap-px bg-stone-500 p-px" role="toolbar" aria-label="Drawing tools">
				{#each toolRows as row}
					{@const officialRow = row.some((item) => item.id === 'official-r')}
					{@const laserRow = row.some((item) => item.id === 'laser')}
					<div
						data-tutorial={officialRow ? 'official-tools' : undefined}
						class="flex min-h-0 w-full shrink-0"
						class:flex-wrap={officialRow}
						style={`aspect-ratio: ${laserRow ? 2 : row.some((item) => item.id === 'line-of-scrimmage') || officialRow ? 1 : row.length} / 1;`}
					>
						{#each row as item, itemIndex}
							{@const toolbarPathColor = isArrowKind(item.id)
								? toolbarArrowColor(item.id, arrowPlacementColors[item.id], tool === item.id)
								: undefined}
							<HoverTooltip
								text={item.label}
								shortcutKeys={displayedToolShortcutKeys(item)}
								minWidthPx={0}
								wrapperClass={officialRow ? 'flex h-1/2 w-1/2 min-w-0 shrink-0' : 'flex h-full min-w-0 flex-1'}
							>
								<button
									type="button"
									data-builder-tool
									data-tutorial-tool={item.id}
									aria-label={item.label}
									aria-pressed={tool === item.id}
									on:pointerdown={() => activateToolbarTool(item.id)}
									on:click={(event) => event.detail === 0 && activateToolbarTool(item.id)}
									on:dblclick|stopPropagation={(event) => openToolbarPresetEditor(event, item.id)}
									class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0 bg-stone-100 text-xs font-bold text-stone-600 transition-colors hover:bg-white hover:text-stone-900 sm:text-sm"
									class:flex-row={item.id === 'laser'}
									class:border-r={(row.length === 2 && itemIndex === 0) || (officialRow && itemIndex % 2 === 0)}
									class:border-b={officialRow && itemIndex < 2}
									class:border-stone-400={(row.length === 2 && itemIndex === 0) || officialRow}
									class:!bg-stone-900={tool === item.id}
									class:!text-white={tool === item.id}
								>
									{#if isArrowKind(item.id)}
										<svg viewBox="0 0 32 32" class="block h-8 w-8" aria-hidden="true">
											<path
												d={toolbarArrowShaft(item.id)}
												fill="none"
												stroke={toolbarPathColor}
												stroke-width={item.id === 'run' ? 2.5 : 2.25}
												stroke-dasharray={toolbarArrowDash(arrowPlacementStyles[item.id])}
												stroke-linecap={arrowPlacementStyles[item.id] === 'dotted' ? 'round' : 'butt'}
											/>
											<path d={toolbarArrowHead(item.id)} fill={toolbarPathColor} />
										</svg>
									{:else if item.image}
										<img
											src={toolbarToolImage(item)}
											alt=""
											class="h-8 w-8 object-contain"
											class:!h-7={item.id === 'free-draw'}
											class:!w-7={item.id === 'free-draw'}
											style={item.id === 'laser' ? 'width: 90%; height: auto;' : undefined}
											class:invert={item.id === 'free-draw' && tool === item.id}
											draggable="false"
											decoding="async"
										/>
									{:else if item.icon === 'event'}
										<svg viewBox="0 0 24 24" class="h-7 w-7" aria-hidden="true">
											<path d="M4 5h16v11H9l-4 3v-3H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
											<path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2" />
										</svg>
									{:else if item.icon === 'line-of-scrimmage' || item.icon === 'line-to-gain'}
										{@const guideToolId = item.icon}
										<span class="relative block h-8 w-4 border border-stone-900" style:background-color={fieldPalette.field} aria-hidden="true">
											<span
												class="absolute top-0.5 bottom-0.5 left-1/2 -translate-x-1/2 border-l-2"
												class:border-dashed={guidePlacementStyles[guideToolId] === 'dashed'}
												class:border-dotted={guidePlacementStyles[guideToolId] === 'dotted'}
												class:border-solid={guidePlacementStyles[guideToolId] === 'solid'}
												style:border-left-color={guideColor(guidePlacementColors[guideToolId])}
											></span>
										</span>
									{:else}
										<span class="text-lg" aria-hidden="true">{item.symbol}</span>
									{/if}
									{#if item.caption}
										<span
											class="max-w-full text-[8px] leading-none font-medium tracking-tight whitespace-nowrap sm:text-[9px]"
											class:mt-px={item.id === 'line-of-scrimmage' || item.id === 'line-to-gain'}
											class:-mt-px={item.id !== 'line-of-scrimmage' && item.id !== 'line-to-gain'}>{item.caption}</span
										>
									{/if}
								</button>
							</HoverTooltip>
						{/each}
					</div>
				{/each}
			</div>

			{#if toolbarEditorTool}
				{@const toolbarPresetColor =
					toolbarEditorTool === 'deflag'
						? deflagPlacementColor
						: toolbarEditorTool === 'bean-bag'
							? beanBagPlacementColor
							: toolbarEditorTool === 'laser'
								? laserColor
								: isArrowKind(toolbarEditorTool)
									? arrowPlacementColors[toolbarEditorTool]
									: guidePlacementColors[toolbarEditorTool]}
				{@const toolbarPresetStyle =
					toolbarEditorTool === 'deflag' || toolbarEditorTool === 'bean-bag' || toolbarEditorTool === 'laser'
						? null
						: isArrowKind(toolbarEditorTool)
							? arrowPlacementStyles[toolbarEditorTool]
							: guidePlacementStyles[toolbarEditorTool]}
				<div
					bind:this={toolbarEditorElement}
					class="absolute left-full z-50 ml-px flex items-center gap-2 bg-white p-2 shadow-xl ring-2 ring-stone-900"
					style:top={`${toolbarEditorTop}px`}
					role="dialog"
					aria-label={`${toolbarEditorTool} default format`}
				>
					{#if toolbarEditorTool === 'line-of-scrimmage' || toolbarEditorTool === 'line-to-gain'}
						{@const toolbarEditingLos = toolbarEditorTool === 'line-of-scrimmage'}
						{@const toolbarEditingGuide = guides.find((guide) => guide.kind === toolbarEditorTool)}
						{#if !toolbarEditingGuide || !isAtMidfieldX(toolbarEditingGuide.x)}
							<button
								type="button"
								aria-label={`Field side ${toolbarGuideSide.toUpperCase()}; switch to ${toolbarGuideSide === 'a' ? 'B' : 'A'}`}
								title={`${toolbarGuideSide.toUpperCase()} Side`}
								on:click={() => setToolbarGuideSide(toolbarGuideSide === 'a' ? 'b' : 'a')}
								class="h-7 w-7 shrink-0 cursor-pointer border border-stone-900 text-[11px] font-black"
								class:bg-stone-900={toolbarGuideSide === 'a'}
								class:text-white={toolbarGuideSide === 'a'}
								class:bg-white={toolbarGuideSide === 'b'}
								class:text-stone-950={toolbarGuideSide === 'b'}>{toolbarGuideSide.toUpperCase()}</button
							>
						{/if}
						<input
							bind:this={toolbarGuideYardageInput}
							type="number"
							min={toolbarEditingLos ? 0.5 : 0}
							max={toolbarEditingLos
								? maximumLosYardLine()
								: lineOfScrimmageX === null
									? 0
									: maximumDownMarkerYardage(guides.find((guide) => guide.kind === 'line-to-gain')?.x ?? lineOfScrimmageX, lineOfScrimmageX)}
							step="0.5"
							inputmode="decimal"
							bind:value={toolbarGuideYardage}
							disabled={!toolbarEditingLos && lineOfScrimmageX === null}
							aria-label={toolbarEditingLos ? 'Line of Scrimmage yard line' : 'Line to Gain distance'}
							title={toolbarEditingLos ? 'L.O.S. yard line' : 'L.T.G. distance'}
							class="down-yardage-input h-7 border-0 bg-stone-100 px-1 text-center text-[10px] font-black text-stone-800 outline-none hover:bg-stone-200 focus:bg-white focus:ring-1 focus:ring-stone-700 focus:ring-inset disabled:opacity-40"
							class:w-8={toolbarEditingLos}
							class:w-10={!toolbarEditingLos}
							on:focus={(event) => event.currentTarget.select()}
							on:input={updateToolbarGuideYardage}
							on:keydown|stopPropagation={(event) => {
								if (event.key !== 'Enter' && event.key !== 'Escape') return;
								event.preventDefault();
								toolbarEditorTool = null;
							}}
						/>
					{/if}
					<div class="flex gap-1" aria-label="Preset color">
						{#each toolbarEditorTool === 'deflag' ? deflagColors : toolbarEditorTool === 'bean-bag' ? beanBagColors : toolbarEditorTool === 'laser' ? laserColors : guideColors as option}
							<button
								type="button"
								title={option.label}
								aria-label={option.label}
								aria-pressed={toolbarPresetColor === option.id}
								on:click={() => updateToolbarPresetColor(option.id)}
								class="h-5 w-5 cursor-pointer border-2 border-white shadow-sm ring-1 ring-stone-400"
								class:!ring-2={toolbarPresetColor === option.id}
								class:!ring-stone-950={toolbarPresetColor === option.id}
								style:background-color={option.value}
							></button>
						{/each}
					</div>
					{#if toolbarPresetStyle}
						<div class="flex gap-px bg-stone-400 p-px" aria-label="Preset line type">
							{#each guideStyles as styleOption}
								<button
									type="button"
									title={styleOption}
									aria-label={`${styleOption} line`}
									aria-pressed={toolbarPresetStyle === styleOption}
									on:click={() => updateToolbarPresetStyle(styleOption)}
									class="flex h-5 w-8 cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white"
									class:!bg-stone-900={toolbarPresetStyle === styleOption}
									class:!text-white={toolbarPresetStyle === styleOption}
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
					{/if}
				</div>
			{/if}

			{#if tool === 'free-draw'}
				<div
					data-tutorial="draw-options"
					class="draw-options-panel relative z-40 mt-px w-full border-2 border-stone-900 bg-stone-900 p-px shadow-xl"
					role="group"
					aria-label="Drawing options"
				>
					<div class="draw-options-line-types grid grid-cols-2 gap-px" role="group" aria-label="Drawing line type">
						<button
							type="button"
							aria-label="Draw squiggle lines"
							aria-pressed={freeDrawShape === 'squiggle' && freeDrawMode === 'draw'}
							on:pointerdown|stopPropagation={() => {
								freeDrawShape = 'squiggle';
								freeDrawMode = 'draw';
							}}
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
							on:pointerdown|stopPropagation={() => {
								freeDrawShape = 'straight';
								freeDrawMode = 'draw';
							}}
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

					<label class="draw-options-thickness mt-px block bg-stone-100 px-0.5 py-0.5 text-[7px] font-bold text-stone-800">
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

					<div class="draw-options-colors mt-px grid grid-cols-2 gap-px" role="group" aria-label="Drawing color">
						{#each freeDrawColors as option, colorIndex}
							<button
								data-draw-color
								type="button"
								title={`${colorIndex === 9 ? 0 : colorIndex + 1}: ${option.label}`}
								aria-label={`${option.label} drawing color`}
								aria-pressed={freeDrawColor === option.id}
								on:pointerdown|stopPropagation={() => {
									freeDrawColor = option.id;
									freeDrawMode = 'draw';
								}}
								on:keydown={(event) => handleDrawColorKeydown(event, colorIndex)}
								on:click|stopPropagation={() => {
									freeDrawColor = option.id;
									freeDrawMode = 'draw';
								}}
								class="flex aspect-square min-h-0 cursor-pointer items-center justify-center border border-stone-500 text-[8px] font-black outline-none ring-inset hover:ring-1 hover:ring-white"
								class:ring-2={freeDrawColor === option.id}
								class:ring-white={freeDrawColor === option.id}
								class:text-white={!['yellow', 'white', 'gray'].includes(option.id)}
								class:text-stone-900={['yellow', 'white', 'gray'].includes(option.id)}
								style:background={option.value}>{colorIndex === 9 ? 0 : colorIndex + 1}</button
							>
						{/each}
					</div>

					<div class="draw-options-actions mt-px grid grid-cols-2 gap-px">
						<HoverTooltip text="Drawing Eraser" shortcutKeys={['Shift', 'D']} minWidthPx={0} wrapperClass="flex h-7 min-w-0">
							<button
								type="button"
								aria-label="Erase drawing strokes"
								aria-pressed={freeDrawMode === 'erase'}
								on:pointerdown|stopPropagation
								on:click|stopPropagation={() => (freeDrawMode = freeDrawMode === 'erase' ? 'draw' : 'erase')}
								class="flex h-7 w-full cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white hover:text-stone-950"
								class:!bg-stone-600={freeDrawMode === 'erase'}
								class:!text-white={freeDrawMode === 'erase'}
							>
								<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
									<path d="m4 15 9-10 7 6-8 9H7zM10 20h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
								</svg>
								<span class="sr-only">Eraser</span>
							</button>
						</HoverTooltip>
						<HoverTooltip text="Clear Drawings" shortcutKeys={['C']} minWidthPx={0} wrapperClass="flex h-7 min-w-0">
							<button
								type="button"
								aria-label="Clear free drawings"
								disabled={freeStrokes.length === 0 && !activeFreeStroke}
								on:pointerdown|stopPropagation
								on:click|stopPropagation={() => runGuardedAction(clearFreeDrawings)}
								class="flex h-7 w-full cursor-pointer items-center justify-center bg-stone-100 text-stone-700 hover:bg-white hover:text-stone-950 disabled:cursor-not-allowed disabled:opacity-35"
							>
								<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" aria-hidden="true">
									<path d="M4 16c3-5 5 5 8 0s5 3 8-2M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								</svg>
								<span class="sr-only">Clear</span>
							</button>
						</HoverTooltip>
					</div>
				</div>
			{/if}
		</div>

		<div data-tutorial="interaction-area" class="play-builder-interaction relative flex min-w-0 flex-1 items-center">
			<div class="absolute top-2 left-2 z-30 flex items-start gap-1.5" role="toolbar" aria-label="Play actions">
				<div data-tutorial="history-actions" class="flex gap-1.5">
					<HoverTooltip text="Undo" shortcutKeys={[primaryModifierKey, 'Z']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							type="button"
							aria-label="Undo"
							disabled={tutorialActive || history.length === 0}
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
							disabled={tutorialActive || future.length === 0}
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
							disabled={tutorialActive || (markers.length === 0 && paths.length === 0 && guides.length === 0 && freeStrokes.length === 0)}
							on:click={() => runGuardedAction(clear)}
							class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
						>
							<img src="/images/toolbar/trash-can.webp" alt="" class="h-4 w-4 object-contain" draggable="false" loading="lazy" />
							<span class="text-[8px] leading-none font-semibold">Clear All</span>
						</button>
					</HoverTooltip>
				</div>

				<div data-tutorial="file-actions" class="ml-2 flex gap-1.5">
					<HoverTooltip text="New Play" shortcutKeys={['Shift', 'N']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							data-tutorial="new-button"
							type="button"
							aria-label="Start a new play"
							disabled={(tutorialActive && activeTutorialSteps[tutorialStepIndex]?.data?.waitFor !== 'tutorial-new-play') ||
								actionInProgress !== null}
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
							disabled={tutorialActive || actionInProgress !== null}
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
								disabled={tutorialActive}
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
			<div data-tutorial="export-buttons" class="absolute top-2 right-2 z-30 flex gap-1.5" aria-label="Export controls">
				{#each [{ format: 'png' as const, label: 'PNG', ariaLabel: 'Export PNG image' }, { format: 'jpg' as const, label: 'JPG', ariaLabel: 'Export JPG image' }, { format: 'webp' as const, label: 'WebP', ariaLabel: 'Export WebP image' }] as exportOption}
					<HoverTooltip text={`Export ${exportOption.label}`} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							type="button"
							aria-label={exportOption.ariaLabel}
							disabled={tutorialActive || actionInProgress !== null}
							on:click={() => exportImage(exportOption.format)}
							class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-wait disabled:opacity-50"
						>
							<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
								<rect x="3" y="4" width="18" height="16" fill="none" stroke="currentColor" stroke-width="2" />
								<circle cx="8" cy="9" r="1.5" fill="currentColor" />
								<path d="m5 18 5-5 3 3 2-2 4 4" fill="none" stroke="currentColor" stroke-width="2" />
							</svg>
							<span class="text-[8px] leading-none font-semibold">{exportOption.label}</span>
						</button>
					</HoverTooltip>
				{/each}
				<HoverTooltip text="Export PDF" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Export PDF"
						disabled={tutorialActive || actionInProgress !== null}
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
				<HoverTooltip
					text="Export Settings"
					shortcutKeys={[primaryModifierKey, 'Shift', 'O']}
					minWidthPx={0}
					wrapperClass="ml-2 flex h-9 w-10 shrink-0"
				>
					<button
						type="button"
						aria-label="Open export settings"
						aria-expanded={showExportSettings}
						disabled={tutorialActive || actionInProgress !== null}
						on:click={openExportSettings}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white disabled:cursor-wait disabled:opacity-50"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" fill="none" stroke="currentColor" stroke-width="2" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">Options</span>
					</button>
				</HoverTooltip>
			</div>

			<div
				data-tutorial="play-management"
				class="absolute bottom-2 left-2 z-30"
				class:h-9={editingPlayId === null}
				class:h-40={editingPlayId !== null}
				style="right: 70.5%;"
				aria-label="Plays in this play builder"
			>
				<div bind:this={playStripElement} class="play-tabs-scroll absolute right-0 bottom-0 left-0 overflow-x-auto overflow-y-hidden">
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
							shortcutKeys={[alternateModifierKey, 'N']}
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
			<div class="absolute right-2 bottom-2 z-20 flex items-end gap-1.5" aria-label="Field controls">
				{#if actionMessage}
					<span
						class="mr-1 max-w-48 border border-stone-600 bg-stone-950/90 px-2 py-1 text-[9px] leading-tight font-semibold text-white"
						aria-live="polite"
					>
						{actionMessage}
					</span>
				{/if}
				<div class="flex gap-1.5" aria-label="Field setup controls">
					<HoverTooltip text="Flip Field Direction" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							type="button"
							aria-label="Flip field direction"
							on:click={flipFieldDirection}
							class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
						>
							<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
								<path d="M4 7h11M15 4l3 3-3 3M20 17H9M9 14l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" />
							</svg>
							<span class="text-[8px] leading-none font-semibold">Flip</span>
						</button>
					</HoverTooltip>
					<HoverTooltip text="Default Setup" shortcutKeys={[primaryModifierKey, 'Shift', 'S']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
						<button
							data-tutorial="setup-button"
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
					<HoverTooltip
						text="Field Settings"
						shortcutKeys={[primaryModifierKey, alternateModifierKey, 'S']}
						minWidthPx={0}
						wrapperClass="flex h-9 w-10 shrink-0"
					>
						<button
							data-tutorial="settings-button"
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
				</div>
				<div class="ml-2 flex gap-1.5" aria-label="Field support controls">
				<HoverTooltip text="Help" shortcutKeys={[primaryModifierKey, 'Shift', 'H']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
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
				<HoverTooltip text="Interactive Tutorial" minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						data-tutorial="tutorial-button"
						aria-label="Start interactive play builder tutorial"
						on:click={startTutorial}
						class="tutorial-launch flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
						class:tutorial-launch-bouncing={tutorialButtonBouncing}
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path d="M4 5h16v11H9l-4 3v-3H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="miter" />
							<path d="m9 8 6 3-6 3z" fill="currentColor" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">Tutorial</span>
					</button>
				</HoverTooltip>
				<HoverTooltip text="Feedback" shortcutKeys={[primaryModifierKey, 'Shift', 'F']} minWidthPx={0} wrapperClass="flex h-9 w-10 shrink-0">
					<button
						type="button"
						aria-label="Give feedback"
						on:click={openFeedback}
						class="flex h-9 w-10 cursor-pointer flex-col items-center justify-center bg-stone-100 text-stone-800 hover:bg-white"
					>
						<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
							<path d="M4 5h16v12H9l-5 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
							<path d="M8 9h8M8 13h5" stroke="currentColor" stroke-width="2" />
						</svg>
						<span class="text-[8px] leading-none font-semibold">Feedback</span>
					</button>
				</HoverTooltip>
				</div>
			</div>
			<div class="field-canvas relative my-auto w-full shrink-0">
				<svg
					bind:this={svg}
					data-tutorial="field"
					viewBox="0 0 1000 484"
					font-family="ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
					class="block h-auto w-full select-none"
					class:cursor-none={!dragTarget?.moved && tool !== 'free-draw' && !isGuideTool(tool) && !isPathTool(tool) && pointerOnField}
					class:laser-cursor={tool === 'laser' && pointerOnField}
					class:cursor-crosshair={!dragTarget?.moved && (isGuideTool(tool) || isPathTool(tool)) && pointerOnField}
					class:drawing-cursor={tool === 'free-draw' && freeDrawMode === 'draw'}
					class:erasing-cursor={tool === 'free-draw' && freeDrawMode === 'erase'}
					class:!cursor-grabbing={dragTarget?.moved}
					style="touch-action: none;"
					style:pointer-events={viewOnly ? 'none' : undefined}
					role="application"
					aria-label="Blank horizontal NIRSA flag football field drawing area"
					aria-disabled={viewOnly}
					on:pointerdown|capture={beginStylusEraser}
					on:pointerdown={beginOnField}
					on:pointermove={continuePointer}
					on:contextmenu|preventDefault
					on:pointerenter={(event) => {
						hoveringElement = false;
						const canvasPoint = canvasPointFromEvent(event);
						pointerOnField = isPointInActiveToolArea(canvasPoint);
						const point = pointForActiveTool(canvasPoint);
						hoverPoint = pointerOnField || tool === 'free-draw' ? point : null;
						if (tool === 'laser' && pointerOnField) updateLaserPointer(point);
						lastPlacementHoverPoint = pointerOnField ? point : null;
						if (pointerOnField) schedulePlacementSnap(point, event.shiftKey);
					}}
					on:pointerleave={() => {
						hoverPoint = null;
						pointerOnField = false;
						hoveringElement = false;
						laserPointer = null;
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
						<filter id="builder-neon-glow" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
							<feGaussianBlur in="SourceGraphic" stdDeviation="5" result="neon-wide" />
							<feComponentTransfer in="neon-wide" result="neon-wide-soft">
								<feFuncA type="linear" slope="0.32" />
							</feComponentTransfer>
							<feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="neon-close" />
							<feComponentTransfer in="neon-close" result="neon-close-soft">
								<feFuncA type="linear" slope="0.78" />
							</feComponentTransfer>
							<feMerge>
								<feMergeNode in="neon-wide-soft" />
								<feMergeNode in="neon-close-soft" />
								<feMergeNode in="SourceGraphic" />
							</feMerge>
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
							{@const teamBoxSetback = fieldLayout.teamBoxSetbackYards * (fieldWidth / fieldLayout.totalYards) + teamBoxExtraSetback}
							{#each [fieldTop - teamBoxSetback - 20, fieldBottom + teamBoxSetback] as teamBoxY, teamBoxIndex}
								{@const teamBoxLabel = teamBoxIndex === 0 ? fieldSettings.teamBoxTopLabel : fieldSettings.teamBoxBottomLabel}
								{@const teamBoxWidth = xForYards(teamBox[1]) - xForYards(teamBox[0])}
								{@const teamBoxTextHitWidth = Math.min(teamBoxWidth, Math.max(56, teamBoxLabel.length * 9 + 18))}
								<g>
									<rect x={xForYards(teamBox[0])} y={teamBoxY} width={teamBoxWidth} height="20" fill="transparent" pointer-events="none" />
									<rect
										data-pdf-outline
										x={xForYards(teamBox[0]) - 4}
										y={teamBoxY - 4}
										width={teamBoxWidth + 8}
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
										width={teamBoxWidth}
										height="20"
										fill="#d2b48c"
										stroke="rgba(255,255,255,0.82)"
										stroke-width="2"
										pointer-events="none"
									/>
									<rect
										data-field-element
										data-field-type="team-box-text"
										role="button"
										tabindex="0"
										aria-label={`${teamBoxLabel}, double-click to rename team box`}
										x={(xForYards(teamBox[0]) + xForYards(teamBox[1]) - teamBoxTextHitWidth) / 2}
										y={teamBoxY + 2}
										width={teamBoxTextHitWidth}
										height="16"
										fill="transparent"
										pointer-events="all"
										on:pointerdown|stopPropagation
										on:dblclick|stopPropagation={(event) => startEditingTeamBox(event, teamBoxY, teamBoxIndex)}
										on:keydown={(event) => {
											if (event.key === 'Enter') void startEditingTeamBox(event, teamBoxY, teamBoxIndex);
										}}
										class="cursor-text focus:outline-none"
									/>
									<text
										x={(xForYards(teamBox[0]) + xForYards(teamBox[1])) / 2}
										y={teamBoxY + 14}
										text-anchor="middle"
										fill="#292524"
										font-size="12"
										font-weight="800"
										letter-spacing="2"
										pointer-events="none">{teamBoxLabel}</text
									>
								</g>
							{/each}
						{/if}

						{#if fieldLayout.teamBox}
							{@const scoreboardTeamBox = fieldLayout.teamBox}
							{@const scoreboardTeamBoxY = fieldTop - fieldLayout.teamBoxSetbackYards * (fieldWidth / fieldLayout.totalYards) - teamBoxExtraSetback - 20}
							{@const scoreboardWidth = 58}
							{@const scoreboardGap = 10}
							{@const quarterBoxX = xForYards(scoreboardTeamBox[0]) - scoreboardGap - scoreboardWidth}
							{@const clockBoxX = xForYards(scoreboardTeamBox[1]) + scoreboardGap}
							{#each [{ kind: 'quarter' as const, x: quarterBoxX, value: fieldSettings.gameQuarter.toUpperCase(), label: `Quarter ${fieldSettings.gameQuarter}, click for next quarter` }, { kind: 'clock' as const, x: clockBoxX, value: formatPlayBuilderGameClock(fieldSettings.gameClockSeconds), label: `Game clock ${formatPlayBuilderGameClock(fieldSettings.gameClockSeconds)}, click to edit` }] as scoreboardItem}
								<g data-export-scoreboard>
									<rect
										x={scoreboardItem.x}
										y={scoreboardTeamBoxY}
										width={scoreboardWidth}
										height="20"
										fill="#111827"
										stroke="#facc15"
										stroke-width="2"
										pointer-events="none"
									/>
									{#if scoreboardItem.kind === 'clock' && editingScoreboard === 'clock'}
										<foreignObject
											bind:this={editorElement}
											data-scoreboard-inline-editor
											x={scoreboardItem.x}
											y={scoreboardTeamBoxY}
											width={scoreboardWidth}
											height="20"
										>
											<input
												bind:this={gameClockEditInput}
												bind:value={gameClockEditValue}
												inputmode="numeric"
												maxlength="5"
												pattern="[0-9][0-9]:[0-5][0-9]"
												aria-label="Game clock"
												autocomplete="off"
												enterkeyhint="done"
												class="block h-full w-full border-0 bg-transparent p-0 text-center font-mono text-[12px] font-black tracking-[0.075em] text-[#facc15] outline-none"
												on:beforeinput={handleGameClockInput}
												on:input={normalizeGameClockInput}
												on:blur={commitScoreboardEditor}
												on:keydown|stopPropagation={(event) => {
													if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
														event.preventDefault();
														void stepGameClock(event.key === 'ArrowUp' ? 1 : -1);
													} else if (event.key === 'Enter') {
														event.preventDefault();
														commitScoreboardEditor();
													} else if (event.key === 'Escape') {
														event.preventDefault();
														gameClockEditValue = formatPlayBuilderGameClock(fieldSettings.gameClockSeconds);
														gameClockEditDigits = gameClockEditValue.replace(/\D/g, '');
														editingScoreboard = null;
														scoreboardHistorySaved = false;
													}
												}}
											/>
										</foreignObject>
									{:else}
										<text
											x={scoreboardItem.x + scoreboardWidth / 2}
											y={scoreboardTeamBoxY + 14}
											text-anchor="middle"
											fill="#facc15"
											font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
											font-size="12"
											font-weight="900"
											letter-spacing="0.75"
											pointer-events="none">{scoreboardItem.value}</text
										>
									{/if}
									<rect
										data-field-element
										data-scoreboard-control={scoreboardItem.kind}
										role="button"
										tabindex={tool === 'laser' ? -1 : 0}
										aria-label={scoreboardItem.label}
										aria-disabled={tool === 'laser'}
										x={scoreboardItem.x}
										y={scoreboardTeamBoxY}
										width={scoreboardWidth}
										height="20"
										fill="transparent"
										pointer-events={tool === 'laser' || (scoreboardItem.kind === 'clock' && editingScoreboard === 'clock') ? 'none' : 'all'}
										on:pointerdown|stopPropagation
										on:click|stopPropagation={(event) => (scoreboardItem.kind === 'quarter' ? cycleGameQuarter(event) : startEditingGameClock(event))}
										on:keydown={(event) => {
											if (event.key !== 'Enter' && event.key !== ' ') return;
											event.preventDefault();
											if (scoreboardItem.kind === 'quarter') cycleGameQuarter(event);
											else startEditingGameClock(event);
										}}
										class={tool === 'laser' ? 'focus:outline-none' : 'cursor-pointer focus:outline-none'}
									/>
								</g>
							{/each}
						{/if}

						<rect x={fieldLeft} y={fieldTop} width={fieldWidth} height={fieldHeight} fill={fieldPalette.field} />
						<rect x={fieldLeft} y={fieldTop} width={fieldWidth} height={fieldHeight} fill="url(#builder-grass-stripe)" />
						<rect
							x={fieldLeft}
							y={fieldTop}
							width={xForYards(fieldLayout.goalLines[0]) - fieldLeft}
							height={fieldHeight}
							fill={fieldPalette.endZone}
						/>
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
							<rect
								x={xForYards(zone[0])}
								y={fieldTop}
								width={xForYards(zone[1]) - xForYards(zone[0])}
								height={fieldHeight}
								fill="rgba(0,0,0,0.06)"
							/>
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
							data-export-field-outline
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
						{#if (fieldSettings.fieldType === 'unified' || fieldSettings.fieldType === 'nfl-flag') && fieldSettings.showNoRunZoneText}
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
							{#each [fieldTop + 35, fieldBottom - 15] as yardLabelY}
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
							{#each [fieldTop + 35, fieldBottom - 15] as goalLabelY}
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
							{@const rawGuidePreviewX = placementSnapX ?? hoverPoint.x}
							{@const guidePreviewX = tool === 'line-to-gain' ? wholeYardLineToGainX(rawGuidePreviewX) : wholeYardLineOfScrimmageX(rawGuidePreviewX)}
							<line
								x1={guidePreviewX}
								y1={fieldTop + guideSidelineInset}
								x2={guidePreviewX}
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
						{:else if isOfficialKind(tool)}
							<image
								href={officialImages[tool]}
								x={hoverPoint.x - officialSize / 2}
								y={hoverPoint.y - officialSize / 2}
								width={officialSize}
								height={officialSize}
								opacity="0.58"
								pointer-events="none"
							/>
						{:else if tool === 'ball'}
							<image
								href="/images/football.webp"
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
								href="/images/penalty-flag.webp"
								x={hoverPoint.x - foulFlagSize / 2}
								y={hoverPoint.y - foulFlagSize / 2}
								width={foulFlagSize}
								height={foulFlagSize}
								opacity="0.58"
								pointer-events="none"
							/>
						{:else if tool === 'bean-bag'}
							<image
								href={beanBagImage(beanBagPlacementColor)}
								x={hoverPoint.x - beanBagSize / 2}
								y={hoverPoint.y - beanBagSize / 2}
								width={beanBagSize}
								height={beanBagSize}
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
							data-tutorial-kind={guide.kind}
							data-field-element
							data-field-type="guide"
							role="button"
							tabindex="0"
							aria-label={`${guideLabel(guide)}, double-click to format`}
							on:pointerdown|stopPropagation={(event) => beginOnGuide(event, guide)}
							on:pointerenter={() => (hoveringElement = tool !== 'ball' && tool !== 'event')}
							on:pointerleave={() => (hoveringElement = false)}
							on:dblclick|stopPropagation={(event) => startEditingGuide(event, guide)}
							on:keydown|stopPropagation={(event) => handleGuideKeydown(event, guide)}
							class="focus:outline-none"
							class:cursor-grab={tool !== 'free-draw' && tool !== 'event' && !isDragging('guide', guide.id)}
							class:cursor-grabbing={tool !== 'free-draw' && tool !== 'event' && isDragging('guide', guide.id)}
						>
							<line x1={guide.x} y1={fieldTop} x2={guide.x} y2={fieldBottom} stroke="transparent" stroke-width="14" />
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
						<g data-layer-type="path" data-layer-id={path.id} data-tutorial-kind={path.kind}>
							{#if path.kind === 'pass' || path.kind === 'kick'}
								<path
									data-field-element
									data-field-type="path"
									d={pathData(path.kind, start, path.end)}
									fill="none"
									stroke="transparent"
									stroke-width="44"
									role="button"
									tabindex="0"
									aria-label={`${path.kind} line`}
									class="focus:outline-none"
									class:cursor-grab={tool !== 'free-draw' && tool !== 'event' && !isDragging('path', path.id)}
									class:cursor-grabbing={tool !== 'free-draw' && tool !== 'event' && isDragging('path', path.id)}
									on:pointerenter={() => (hoveringElement = tool !== 'event')}
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
									stroke-width="44"
									role="button"
									tabindex="0"
									aria-label={`${path.kind} line`}
									class="focus:outline-none"
									class:cursor-grab={tool !== 'free-draw' && tool !== 'event' && !isDragging('path', path.id)}
									class:cursor-grabbing={tool !== 'free-draw' && tool !== 'event' && isDragging('path', path.id)}
									on:pointerenter={() => (hoveringElement = tool !== 'event')}
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
								{@const arrowTip = arrowHitTip(path.kind, start, path.end)}
								<circle
									data-field-element
									data-field-type="path"
									data-path-endpoint="start"
									cx={start.x}
									cy={start.y}
									r="18"
									fill="transparent"
									pointer-events="all"
									role="button"
									tabindex="-1"
									aria-label={`Move ${path.kind} origin`}
									class:cursor-grab={tool !== 'free-draw' && tool !== 'event' && !isDragging('path', path.id)}
									class:cursor-grabbing={tool !== 'free-draw' && tool !== 'event' && isDragging('path', path.id)}
									on:pointerenter={() => (hoveringElement = tool !== 'event')}
									on:pointerleave={() => (hoveringElement = false)}
									on:pointerdown|stopPropagation={(event) => beginOnPath(event, path, 'start')}
									on:dblclick|stopPropagation={(event) => startEditingPath(event, path)}
									on:keydown={(event) => handlePathKeydown(event, path)}
								/>
								<line
									data-field-element
									data-field-type="path"
									data-path-endpoint="end"
									x1={path.end.x}
									y1={path.end.y}
									x2={arrowTip.x}
									y2={arrowTip.y}
									stroke="transparent"
									stroke-width="36"
									pointer-events="all"
									role="button"
									tabindex="-1"
									aria-label={`Move ${path.kind} destination`}
									class:cursor-grab={tool !== 'free-draw' && tool !== 'event' && !isDragging('path', path.id)}
									class:cursor-grabbing={tool !== 'free-draw' && tool !== 'event' && isDragging('path', path.id)}
									on:pointerenter={() => (hoveringElement = tool !== 'event')}
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
							data-tutorial-kind={marker.kind}
							data-field-element
							data-field-type="marker"
							data-field-kind={marker.kind}
							on:pointerdown|stopPropagation={(event) => beginOnMarker(event, marker)}
							on:pointerenter={() =>
								(hoveringElement =
									tool === 'event' ? marker.kind === 'ball' || marker.kind === 'event' : !(isGuideTool(tool) && marker.kind === 'ball'))}
							on:pointerleave={() => (hoveringElement = false)}
							on:dblclick|stopPropagation={(event) => startEditingMarker(event, marker)}
							on:keydown|stopPropagation={(event) => handleMarkerKeydown(event, marker)}
							role="button"
							tabindex={isEditableMarker(marker) ? 0 : -1}
							aria-label={isTeamMarker(marker)
								? `${marker.label}, double-click to rename`
								: isOfficialMarker(marker)
									? `${marker.label ? `${marker.label}, ` : ''}${officialNames[marker.kind]}, double-click to add official name`
									: marker.kind === 'event'
										? `${marker.label}, double-click to edit`
										: marker.kind === 'flag'
											? `${marker.label ? `${marker.label}, ` : ''}penalty flag, double-click to add penalty text`
											: marker.kind === 'bean-bag'
												? `${marker.label ? `${marker.label}, ` : ''}bean bag, double-click to add text`
												: marker.kind === 'deflag'
													? `${marker.label ? `${marker.label}, ` : ''}flag belt, double-click to add text or change color`
													: marker.kind === 'ball'
														? `${marker.label ? `${marker.label}, ` : ''}football, double-click to add text`
														: marker.kind}
							class:cursor-grab={tool !== 'free-draw' &&
								(tool !== 'event' || marker.kind === 'ball' || marker.kind === 'event') &&
								!isDragging('marker', marker.id)}
							class:cursor-grabbing={tool !== 'free-draw' &&
								(tool !== 'event' || marker.kind === 'ball' || marker.kind === 'event') &&
								isDragging('marker', marker.id)}
							class:focus:outline-none={isEditableMarker(marker)}
						>
							{#if isTeamMarker(marker) || isOfficialMarker(marker)}
								<circle
									cx={marker.x}
									cy={marker.y}
									r={(isOfficialMarker(marker) ? officialSize / 2 : playerRadius) + markerHitPadding}
									fill="transparent"
									pointer-events="all"
								/>
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
							{:else if marker.kind === 'bean-bag'}
								<rect
									x={marker.x - beanBagSize * 0.45}
									y={marker.y - beanBagSize * 0.45}
									width={beanBagSize * 0.9}
									height={beanBagSize * 0.9}
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
							{:else if isOfficialMarker(marker)}
								<image
									href={officialImages[marker.kind]}
									x={marker.x - officialSize / 2}
									y={marker.y - officialSize / 2}
									width={officialSize}
									height={officialSize}
									pointer-events="none"
								/>
							{:else if marker.kind === 'ball'}
								<image
									href="/images/football.webp"
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
							{:else if marker.kind === 'bean-bag'}
								<image
									href={beanBagImage(marker.color)}
									x={marker.x - beanBagSize / 2}
									y={marker.y - beanBagSize / 2}
									width={beanBagSize}
									height={beanBagSize}
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
									href="/images/penalty-flag.webp"
									x={marker.x - foulFlagSize / 2}
									y={marker.y - foulFlagSize / 2}
									width={foulFlagSize}
									height={foulFlagSize}
									pointer-events="none"
								/>
							{/if}
							{#if marker.label && (isOfficialMarker(marker) || ['ball', 'flag', 'bean-bag', 'deflag'].includes(marker.kind))}
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
									filter="url(#builder-neon-glow)"
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
									filter="url(#builder-neon-glow)"
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
									filter="url(#builder-neon-glow)"
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
									filter="url(#builder-neon-glow)"
								/>
							{/if}
						{/if}
					</g>

					<g data-down-marker-layer>
						{#if hoverPoint && !hoveringElement && !drawing && !dragTarget && tool === 'line-to-gain' && fieldSettings.showDownMarker}
							{@const previewGuideX = wholeYardLineToGainX(placementSnapX ?? hoverPoint.x)}
							{@const previewDownMarker = downMarkerDisplay(currentLineToGain?.down ?? '1st', previewGuideX, lineOfScrimmageX)}
							<g class="down-marker-graphic" opacity="0.72" pointer-events="none">
								<rect x={previewGuideX - 32} y={fieldTop - 9} width="64" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5" />
								<text
									x={previewGuideX - (previewDownMarker.half ? 3.5 : 0)}
									y={fieldTop + 3.5}
									text-anchor="middle"
									fill="#ff5a1f"
									font-size="10"
									font-weight="900">{previewDownMarker.base}</text
								>
								{#if previewDownMarker.half}
									{@const fractionX = previewGuideX + previewDownMarker.baseWidth / 2 - 1.5}
									<g fill="#ff5a1f" font-size="5.5" font-weight="900" text-anchor="middle">
										<text x={fractionX} y={fieldTop - 1.5}>1</text>
										<line x1={fractionX - 2.5} y1={fieldTop + 0.25} x2={fractionX + 2.5} y2={fieldTop + 0.25} stroke="#ff5a1f" stroke-width="0.8" />
										<text x={fractionX} y={fieldTop + 5.5}>2</text>
									</g>
								{/if}
							</g>
						{/if}
						{#if fieldSettings.showDownMarker}
							{#each guides.filter((guide) => guide.kind === 'line-to-gain') as guide (guide.id)}
								{@const markerDisplay = downMarkerDisplay(guide.down ?? '1st', guide.x, lineOfScrimmageX)}
								<g
									class="down-marker-graphic"
									data-down-marker
									data-export-down-marker
									data-field-element
									data-field-type="guide"
									role="button"
									tabindex="0"
									aria-label={`${downMarkerText(guide.down ?? '1st', guide.x, lineOfScrimmageX)} down marker`}
									on:pointerdown|stopPropagation={(event) => beginOnGuide(event, guide, true)}
									on:click|stopPropagation={(event) => startEditingDownMarker(event, guide)}
									on:dblclick|stopPropagation={(event) => startEditingDownMarker(event, guide)}
									on:keydown|stopPropagation={(event) => {
										if (event.key === 'Enter' || event.key === ' ') startEditingDownMarker(event, guide);
									}}
									class:cursor-grab={!isDragging('guide', guide.id)}
									class:cursor-grabbing={isDragging('guide', guide.id)}
								>
									<rect x={guide.x - 32} y={fieldTop - 9} width="64" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5" />
									<text
										x={guide.x - (markerDisplay.half ? 3.5 : 0)}
										y={fieldTop + 3.5}
										text-anchor="middle"
										fill="#ff5a1f"
										font-size="10"
										font-weight="900"
										pointer-events="none">{markerDisplay.base}</text
									>
									{#if markerDisplay.half}
										{@const fractionX = guide.x + markerDisplay.baseWidth / 2 - 1.5}
										<g fill="#ff5a1f" font-size="5.5" font-weight="900" text-anchor="middle" pointer-events="none">
											<text x={fractionX} y={fieldTop - 1.5}>1</text>
											<line x1={fractionX - 2.5} y1={fieldTop + 0.25} x2={fractionX + 2.5} y2={fieldTop + 0.25} stroke="#ff5a1f" stroke-width="0.8" />
											<text x={fractionX} y={fieldTop + 5.5}>2</text>
										</g>
									{/if}
								</g>
							{/each}
						{/if}
						{#if hoverPoint && !hoveringElement && !drawing && !dragTarget && tool === 'line-of-scrimmage' && fieldSettings.showLineOfScrimmageMarker}
							{@const previewGuideX = wholeYardLineOfScrimmageX(placementSnapX ?? hoverPoint.x)}
							{@const previewLosMarker = lineOfScrimmageMarkerDisplay(previewGuideX)}
							<g class="los-marker-graphic" opacity="0.72" pointer-events="none">
								<rect x={previewGuideX - 26} y={fieldBottom - 9} width="52" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5" />
								<text
									x={previewGuideX - (previewLosMarker.half ? 3.5 : 0)}
									y={fieldBottom + 3.5}
									text-anchor="middle"
									fill="#ffffff"
									font-size="10"
									font-weight="900">{previewLosMarker.base}</text
								>
								{#if previewLosMarker.half}
									{@const fractionX = previewGuideX + previewLosMarker.baseWidth / 2 - 1.5}
									<g fill="#ffffff" font-size="5.5" font-weight="900" text-anchor="middle">
										<text x={fractionX} y={fieldBottom - 1.5}>1</text>
										<line
											x1={fractionX - 2.5}
											y1={fieldBottom + 0.25}
											x2={fractionX + 2.5}
											y2={fieldBottom + 0.25}
											stroke="#ffffff"
											stroke-width="0.8"
										/>
										<text x={fractionX} y={fieldBottom + 5.5}>2</text>
									</g>
								{/if}
							</g>
						{/if}
						{#if fieldSettings.showLineOfScrimmageMarker}
							{#each guides.filter((guide) => guide.kind === 'line-of-scrimmage') as guide (guide.id)}
								{@const markerDisplay = lineOfScrimmageMarkerDisplay(guide.x)}
								<g
									class="los-marker-graphic"
									data-los-marker
									data-export-los-marker
									data-field-element
									data-field-type="guide"
									role="button"
									tabindex="0"
									aria-label={`Line of Scrimmage at the ${losYardLine(guide.x)} yard line`}
									on:pointerdown|stopPropagation={(event) => beginOnGuide(event, guide, true)}
									on:click|stopPropagation={(event) => startEditingLineOfScrimmageMarker(event, guide)}
									on:dblclick|stopPropagation={(event) => startEditingLineOfScrimmageMarker(event, guide)}
									on:keydown|stopPropagation={(event) => {
										if (event.key === 'Enter' || event.key === ' ') startEditingLineOfScrimmageMarker(event, guide);
									}}
									class:cursor-grab={!isDragging('guide', guide.id)}
									class:cursor-grabbing={isDragging('guide', guide.id)}
								>
									<rect x={guide.x - 26} y={fieldBottom - 9} width="52" height="18" fill="#3f3f46" stroke="#111827" stroke-width="1.5" />
									<text
										x={guide.x - (markerDisplay.half ? 3.5 : 0)}
										y={fieldBottom + 3.5}
										text-anchor="middle"
										fill="#ffffff"
										font-size="10"
										font-weight="900"
										pointer-events="none">{markerDisplay.base}</text
									>
									{#if markerDisplay.half}
										{@const fractionX = guide.x + markerDisplay.baseWidth / 2 - 1.5}
										<g fill="#ffffff" font-size="5.5" font-weight="900" text-anchor="middle" pointer-events="none">
											<text x={fractionX} y={fieldBottom - 1.5}>1</text>
											<line
												x1={fractionX - 2.5}
												y1={fieldBottom + 0.25}
												x2={fractionX + 2.5}
												y2={fieldBottom + 0.25}
												stroke="#ffffff"
												stroke-width="0.8"
											/>
											<text x={fractionX} y={fieldBottom + 5.5}>2</text>
										</g>
									{/if}
								</g>
							{/each}
						{/if}
					</g>

					{#if tool === 'laser' || laserTrail.length > 0 || laserDrawings.length > 0 || (activeLaserDrawing?.points.length ?? 0) > 1}
						<g data-laser-pointer-layer pointer-events="none">
							{#each laserDrawings as drawing}
								{@const drawingFreshness =
									drawing.releasedAt === null ? 1 : Math.min(1, Math.max(0, 1 - (laserTrailClock - drawing.releasedAt) / laserFadeDuration))}
								<g
									data-laser-drawing
									data-laser-drawing-state={drawing.releasedAt === null ? 'persistent' : 'fading'}
									opacity={Math.pow(drawingFreshness, 1.25)}
								>
									<path
										d={laserDrawingPath(drawing.points)}
										fill="none"
										stroke={laserColorValue(drawing.color)}
										stroke-width="8"
										stroke-linecap="round"
										stroke-linejoin="round"
										opacity="0.2"
									/>
									<path
										d={laserDrawingPath(drawing.points)}
										fill="none"
										stroke={laserColorValue(drawing.color)}
										stroke-width="3.8"
										stroke-linecap="round"
										stroke-linejoin="round"
										opacity="0.88"
										filter="url(#builder-neon-glow)"
									/>
								</g>
							{/each}
							{#if activeLaserDrawing && activeLaserDrawing.points.length > 1}
								<g data-laser-active-drawing>
									<path
										d={laserDrawingPath(activeLaserDrawing.points)}
										fill="none"
										stroke={laserColorValue(activeLaserDrawing.color)}
										stroke-width="8"
										stroke-linecap="round"
										stroke-linejoin="round"
										opacity="0.2"
									/>
									<path
										d={laserDrawingPath(activeLaserDrawing.points)}
										fill="none"
										stroke={laserColorValue(activeLaserDrawing.color)}
										stroke-width="3.8"
										stroke-linecap="round"
										stroke-linejoin="round"
										opacity="0.88"
										filter="url(#builder-neon-glow)"
									/>
								</g>
							{/if}
							{#if laserTrail.length > 1}
								{@const trailStart = laserTrail[0]}
								{@const trailEnd = laserTrail.at(-1)!}
								{@const trailFreshness = Math.min(1, Math.max(0, 1 - (laserTrailClock - trailEnd.createdAt) / laserFadeDuration))}
								<defs>
									<linearGradient
										id="builder-laser-trail-gradient"
										x1={trailStart.x}
										y1={trailStart.y}
										x2={trailEnd.x}
										y2={trailEnd.y}
										gradientUnits="userSpaceOnUse"
									>
										<stop offset="0%" stop-color={laserColorValue(laserColor)} stop-opacity="0" />
										<stop offset="30%" stop-color={laserColorValue(laserColor)} stop-opacity="0.18" />
										<stop offset="70%" stop-color={laserColorValue(laserColor)} stop-opacity="0.55" />
										<stop offset="100%" stop-color={laserColorValue(laserColor)} stop-opacity="0.82" />
									</linearGradient>
								</defs>
								<path
									d={laserTrailPath(laserTrail, laserTrailClock)}
									fill="url(#builder-laser-trail-gradient)"
									opacity={Math.pow(trailFreshness, 1.25)}
									filter="url(#builder-neon-glow)"
								/>
							{/if}
							{#if tool === 'laser' && laserPointer && pointerOnField}
								<circle cx={laserPointer.x} cy={laserPointer.y} r="7" fill={laserColorValue(laserColor)} opacity="0.2" />
								<circle cx={laserPointer.x} cy={laserPointer.y} r="3" fill={laserColorValue(laserColor)} filter="url(#builder-neon-glow)" />
							{/if}
						</g>
					{/if}
				</svg>

				{#if editingDownGuide}
					<div
						bind:this={editorElement}
						class="absolute z-20 flex -translate-x-1/2 gap-px bg-stone-900 p-px shadow-xl ring-2 ring-stone-950"
						style:left={`${editingDownGuide.x / 10}%`}
						style:top={`${((fieldTop + 14) / 484) * 100}%`}
						role="group"
						aria-label="Select down"
					>
						{#each downMarkerOptions as option}
							<button
								type="button"
								aria-label={option.label}
								aria-pressed={(editingDownGuide.down ?? '1st') === option.id}
								on:click={() => selectDownMarkerValue(option.id)}
								class="h-7 w-10 cursor-pointer bg-stone-100 text-[10px] font-black whitespace-nowrap text-stone-800 hover:bg-orange-100"
								class:!bg-stone-700={(editingDownGuide.down ?? '1st') === option.id}
								class:!text-[#ff5a1f]={(editingDownGuide.down ?? '1st') === option.id}>{option.label}</button
							>
						{/each}
						{#if !isAtMidfieldX(editingDownGuide.x)}
							<button
								type="button"
								aria-label={`Field side ${downGuideSide.toUpperCase()}; switch to ${downGuideSide === 'a' ? 'B' : 'A'}`}
								title={`${downGuideSide.toUpperCase()} Side`}
								on:click={() => setDownGuideSide(downGuideSide === 'a' ? 'b' : 'a')}
								class="h-7 w-7 shrink-0 cursor-pointer border border-stone-900 text-[11px] font-black"
								class:bg-stone-900={downGuideSide === 'a'}
								class:text-white={downGuideSide === 'a'}
								class:bg-white={downGuideSide === 'b'}
								class:text-stone-950={downGuideSide === 'b'}>{downGuideSide.toUpperCase()}</button
							>
						{/if}
						<label class="sr-only" for="custom-down-yardage">Custom yardage</label>
						<input
							id="custom-down-yardage"
							type="number"
							min="0"
							max={maximumDownMarkerYardage(editingDownGuide.x, lineOfScrimmageX)}
							step="0.5"
							inputmode="decimal"
							bind:value={downYardageValue}
							aria-label="Custom yardage"
							title="Custom yardage"
							class="down-yardage-input h-7 w-10 border-0 bg-stone-100 px-1 text-center text-[10px] font-black text-stone-800 outline-none hover:bg-orange-100 focus:bg-white focus:ring-1 focus:ring-[#ff5a1f] focus:ring-inset"
							on:focus={(event) => (event.currentTarget as HTMLInputElement).select()}
							on:input={updateDownMarkerYardage}
							on:keydown|stopPropagation={(event) => {
								if (event.key !== 'Enter' && event.key !== 'Escape') return;
								event.preventDefault();
								commitDownMarkerEditor();
							}}
						/>
					</div>
				{/if}

				{#if editingTeamBoxY !== null}
					<form
						bind:this={editorElement}
						class="absolute z-10 w-64 -translate-x-1/2 -translate-y-1/2 bg-white p-1 shadow-xl ring-2 ring-stone-900"
						style:left="50%"
						style:top={`${((editingTeamBoxY + 10) / 484) * 100}%`}
						on:submit|preventDefault={commitTeamBoxEditor}
					>
						<label for="team-box-label" class="sr-only">Team box title</label>
						<input
							bind:this={teamBoxEditInput}
							bind:value={teamBoxEditValue}
							id="team-box-label"
							maxlength={PLAY_BUILDER_TEAM_BOX_LABEL_MAX_LENGTH}
							aria-label="Team box title"
							class="block h-8 w-full border-0 bg-stone-100 px-2 text-center text-sm font-black tracking-wide text-stone-900 outline-none focus:ring-2 focus:ring-stone-500"
						/>
					</form>
				{/if}

				{#if editingMarker}
					<form
						bind:this={editorElement}
						data-tutorial="marker-editor"
						class="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-white p-1 shadow-xl ring-2 ring-stone-900"
						class:w-48={editingMarker.kind === 'deflag' || editingMarker.kind === 'bean-bag'}
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
							on:keydown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									commitMarkerEditor();
								}
							}}
							class="mx-auto block h-8 border-0 bg-stone-100 px-2 text-center text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-stone-500"
							class:w-16={isTeamMarker(editingMarker)}
							class:w-40={!isTeamMarker(editingMarker) && editingMarker.kind !== 'deflag' && editingMarker.kind !== 'bean-bag'}
							class:w-full={editingMarker.kind === 'deflag' || editingMarker.kind === 'bean-bag'}
						/>
						{#if editingMarker.kind === 'ball'}
							<div class="mx-auto mt-1 flex w-40 gap-px" role="group" aria-label="Move football">
								<button
									type="button"
									on:click={() => moveEditingFootball('x')}
									class="h-7 flex-1 cursor-pointer bg-stone-100 px-1 text-[10px] font-black whitespace-nowrap text-stone-800 hover:bg-stone-200"
									>Move to X</button
								>
								<button
									type="button"
									disabled={lineOfScrimmageX === null}
									on:click={() => moveEditingFootball('line-of-scrimmage')}
									class="h-7 flex-1 cursor-pointer bg-stone-100 px-1 text-[10px] font-black whitespace-nowrap text-stone-800 hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
									>Move to L.O.S.</button
								>
							</div>
						{/if}
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
						{#if editingMarker.kind === 'bean-bag'}
							<div class="mt-1 flex justify-center gap-1" role="group" aria-label="Bean bag color">
								{#each beanBagColors as option}
									<button
										type="button"
										title={option.label}
										aria-label={`${option.label} bean bag`}
										aria-pressed={(editingMarker.color ?? 'blue') === option.id}
										on:click={() => updateBeanBagColor(option.id)}
										class="h-6 w-6 cursor-pointer border border-stone-600 ring-offset-1 ring-offset-white hover:ring-1 hover:ring-stone-500"
										class:ring-2={(editingMarker.color ?? 'blue') === option.id}
										class:ring-stone-950={(editingMarker.color ?? 'blue') === option.id}
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
						data-tutorial="line-editor"
						class="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-white p-2 shadow-xl ring-2 ring-stone-900"
						style:left={`${Math.max(16, Math.min(84, lineEditorPoint.x / 10))}%`}
						style:top={`${Math.max(12, Math.min(88, (lineEditorPoint.y / 484) * 100))}%`}
						on:submit|preventDefault={commitActiveEditor}
						aria-label="Line format"
					>
						{#if editingGuide?.kind === 'line-of-scrimmage' || editingGuide?.kind === 'line-to-gain'}
							{@const editingLos = editingGuide.kind === 'line-of-scrimmage'}
							{#if !isAtMidfieldX(editingGuide.x)}
								<button
									type="button"
									aria-label={`Field side ${editingGuideSide.toUpperCase()}; switch to ${editingGuideSide === 'a' ? 'B' : 'A'}`}
									title={`${editingGuideSide.toUpperCase()} Side`}
									on:click={() => setEditingGuideSide(editingGuideSide === 'a' ? 'b' : 'a')}
									class="h-7 w-7 shrink-0 cursor-pointer border border-stone-900 text-[11px] font-black"
									class:bg-stone-900={editingGuideSide === 'a'}
									class:text-white={editingGuideSide === 'a'}
									class:bg-white={editingGuideSide === 'b'}
									class:text-stone-950={editingGuideSide === 'b'}>{editingGuideSide.toUpperCase()}</button
								>
							{/if}
							<label class="sr-only" for="guide-yardage">{editingLos ? 'Line of Scrimmage yard line' : 'Line to Gain distance'}</label>
							<input
								bind:this={guideYardageInput}
								id="guide-yardage"
								type="number"
								min={editingLos ? 0.5 : 0}
								max={editingLos ? maximumLosYardLine() : maximumDownMarkerYardage(editingGuide.x, lineOfScrimmageX)}
								step="0.5"
								inputmode="decimal"
								bind:value={losYardageValue}
								aria-label={editingLos ? 'Line of Scrimmage yard line' : 'Line to Gain distance'}
								title={editingLos ? 'L.O.S. yard line' : 'L.T.G. distance'}
								class="down-yardage-input h-7 border-0 bg-stone-100 px-1 text-center text-[10px] font-black text-stone-800 outline-none hover:bg-stone-200 focus:bg-white focus:ring-1 focus:ring-stone-700 focus:ring-inset"
								class:w-8={editingLos}
								class:w-10={!editingLos}
								on:focus={(event) => (event.currentTarget as HTMLInputElement).select()}
								on:input={updateGuideYardage}
								on:keydown|stopPropagation={(event) => {
									if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
										event.preventDefault();
										moveEditingGuideByYard(event.key === 'ArrowLeft' ? -1 : 1);
										return;
									}
									if (event.key !== 'Enter' && event.key !== 'Escape') return;
									event.preventDefault();
									commitGuideEditor();
								}}
							/>
						{/if}
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
					</form>
				{/if}

				{#if !viewOnly && deleteTarget && deletePosition}
					<button
						bind:this={deleteButtonElement}
						type="button"
						title="Delete element"
						aria-label="Delete element"
						on:pointerdown|preventDefault|stopPropagation={deleteHoveredElement}
						class="element-delete-button absolute z-20 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center border-2 border-white bg-stone-900 text-white shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-white"
						style:left={`${deletePosition.x / 10}%`}
						style:top={`${(deletePosition.y / 484) * 100}%`}
					>
						<img src="/images/toolbar/trash-can.webp" alt="" class="h-4 w-4 object-contain invert" draggable="false" loading="lazy" />
					</button>
				{/if}
			</div>
		</div>
	</div>
	{#if viewOnly}
		<nav
			class="view-only-play-tabs play-tabs-scroll overflow-x-auto overflow-y-hidden bg-stone-800 p-2"
			aria-label="Plays in this shared play builder"
		>
			<div class="flex w-max min-w-full items-stretch gap-1">
				{#each playEntries as play, index (play.id)}
					<button
						type="button"
						aria-label={`View ${play.name}`}
						aria-current={index === activePlayIndex ? 'page' : undefined}
						on:click={() => switchPlay(play.id)}
						class="flex h-9 min-w-20 shrink-0 cursor-pointer items-center justify-center border border-stone-500 bg-stone-100 px-3 text-[10px] font-black whitespace-nowrap text-stone-800 hover:bg-white aria-[current=page]:border-white aria-[current=page]:bg-stone-950 aria-[current=page]:text-white"
					>
						{play.name}
					</button>
				{/each}
			</div>
		</nav>
	{/if}
</section>

{#snippet exportColorSpectrum(picker: 'background' | 'border', color: string)}
	{@const selection = hexToHueLightness(color)}
	<div
		role="slider"
		tabindex="0"
		aria-label={picker === 'background' ? 'Custom export background color' : 'Export field border color'}
		aria-valuemin="0"
		aria-valuemax="360"
		aria-valuenow={Math.round(selection.hue)}
		aria-valuetext={color}
		class="relative h-16 w-full cursor-crosshair touch-none overflow-hidden border border-stone-600 outline-none focus:ring-2 focus:ring-stone-900 focus:ring-inset"
		style="background-image: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,1) 100%), linear-gradient(to right, #ff0000 0%, #ffff00 16.67%, #00ff00 33.33%, #00ffff 50%, #0000ff 66.67%, #ff00ff 83.33%, #ff0000 100%);"
		on:pointerdown={(event) => updateExportSpectrumFromPointer(event, picker)}
		on:pointermove={(event) => {
			if (event.buttons === 1) updateExportSpectrumFromPointer(event, picker);
		}}
		on:keydown={(event) => handleExportSpectrumKeydown(event, picker, color)}
	>
		<span
			class="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-white bg-transparent shadow-[0_0_0_1px_#1c1917]"
			style:left={`${(selection.hue / 360) * 100}%`}
			style:top={`${100 - selection.lightness}%`}
		></span>
	</div>
{/snippet}

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
			{:else if isArrowKind(item.id)}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<svg viewBox="0 0 32 32" class="h-8 w-8" style:color={guideColor(arrowPlacementColors[item.id])} aria-hidden="true">
						<path
							d={toolbarArrowShaft(item.id)}
							fill="none"
							stroke="currentColor"
							stroke-width={item.id === 'run' ? 2.5 : 2.25}
							stroke-dasharray={toolbarArrowDash(arrowPlacementStyles[item.id])}
							stroke-linecap={arrowPlacementStyles[item.id] === 'dotted' ? 'round' : 'butt'}
						/>
						<path d={toolbarArrowHead(item.id)} fill="currentColor" />
					</svg>
				</div>
			{:else if item.image}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<img src={toolbarToolImage(item)} alt="" class="h-9 w-9 object-contain" draggable="false" loading="lazy" decoding="async" />
				</div>
			{:else if item.icon === 'event'}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<svg viewBox="0 0 24 24" class="h-8 w-8" aria-hidden="true">
						<path d="M4 5h16v11H9l-4 3v-3H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" />
						<path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2" />
					</svg>
				</div>
			{:else if item.icon === 'line-of-scrimmage' || item.icon === 'line-to-gain'}
				{@const guideToolId = item.icon}
				<div class="flex h-11 w-11 items-center justify-center border border-stone-400 bg-stone-100">
					<span class="relative block h-9 w-5 border border-stone-900" style:background-color={fieldPalette.field} aria-hidden="true">
						<span
							class="absolute top-0.5 bottom-0.5 left-1/2 -translate-x-1/2 border-l-2"
							class:border-dashed={guidePlacementStyles[guideToolId] === 'dashed'}
							class:border-dotted={guidePlacementStyles[guideToolId] === 'dotted'}
							class:border-solid={guidePlacementStyles[guideToolId] === 'solid'}
							style:border-left-color={guideColor(guidePlacementColors[guideToolId])}
						></span>
					</span>
				</div>
			{/if}
		</div>
		<div class="min-w-0 text-sm">
			<div class="flex flex-wrap items-center gap-2">
				<h4 class="font-black">{item.label}</h4>
				{#if item.shortcutKeys.length > 0}
					<span class="bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{displayedToolShortcutKeys(item).join(' + ')}</span>
				{/if}
			</div>
			<p class="mt-1 leading-snug text-stone-600">{toolHelp[item.id]}</p>
		</div>
	</div>
{/snippet}

{#if showExportSettings}
	<div class="fixed inset-0 z-50">
		<button
			type="button"
			aria-label="Close export settings"
			on:click={() => (showExportSettings = false)}
			class="absolute inset-0 cursor-default bg-transparent"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="play-builder-export-settings-title"
			class="fixed z-10 w-[min(19rem,calc(100vw-2rem))] border-2 border-stone-950 bg-stone-50 text-stone-800 shadow-2xl"
			style:top={`${exportSettingsTop}px`}
			style:right={`${exportSettingsRight}px`}
		>
			<header class="flex items-center justify-between border-b-2 border-stone-900 bg-stone-900 px-3 py-2 text-white">
				<div>
					<h2 id="play-builder-export-settings-title" class="text-sm font-black tracking-wide uppercase">Export Settings</h2>
					<p class="text-[10px] text-stone-300">Applies to every export format.</p>
				</div>
				<button
					bind:this={exportSettingsCloseButton}
					type="button"
					aria-label="Close export settings"
					on:click={() => (showExportSettings = false)}
					class="flex h-7 w-7 cursor-pointer items-center justify-center bg-white text-lg font-black text-stone-900 hover:bg-stone-200">×</button
				>
			</header>

			<div class="space-y-4 p-3">
				{#if exportPrompt?.trim()}
					<section>
						<label class="flex cursor-pointer items-center justify-between gap-3 border border-stone-400 bg-white p-2 hover:border-stone-900">
							<span>
								<strong class="block text-xs font-black">Include Case Play Prompt</strong>
								<span class="mt-0.5 block text-[10px] leading-tight text-stone-600">Places the prompt above PNG, JPG, and WebP exports.</span>
							</span>
							<input bind:checked={includeExportPrompt} type="checkbox" class="h-4 w-4 cursor-pointer accent-stone-900" />
						</label>
					</section>
				{/if}
				<section>
					<h3 class="mb-1.5 text-[10px] font-black tracking-wide uppercase">Background</h3>
					<div class="grid gap-1" role="radiogroup" aria-label="Export background">
						{#each exportBackgroundOptions as option}
							<div
								class="flex items-stretch border border-stone-400 bg-white hover:border-stone-900"
								class:!border-stone-950={exportBackground === option.id}
								class:!bg-stone-900={exportBackground === option.id}
								class:text-white={exportBackground === option.id}
							>
								<button
									type="button"
									role="radio"
									aria-checked={exportBackground === option.id}
									on:click={() => (exportBackground = option.id)}
									class="min-w-0 flex-1 cursor-pointer p-2 text-left"
								>
									<strong class="block text-xs font-black">{option.label}</strong>
									<span class="mt-0.5 block text-[10px] leading-tight opacity-75">{option.description}</span>
								</button>
								{#if option.id === 'color'}
									<button
										type="button"
										aria-label="Choose solid export background color"
										aria-expanded={exportColorPicker === 'background'}
										on:click={() => {
											exportBackground = 'color';
											exportColorPicker = exportColorPicker === 'background' ? null : 'background';
										}}
										class="relative m-2 h-8 w-12 shrink-0 cursor-pointer overflow-hidden border-2 border-white shadow-[0_0_0_1px_#57534e]"
										style="background-color: #fff; background-image: linear-gradient(45deg,#d6d3d1 25%,transparent 25%),linear-gradient(-45deg,#d6d3d1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d6d3d1 75%),linear-gradient(-45deg,transparent 75%,#d6d3d1 75%); background-size: 8px 8px; background-position: 0 0,0 4px,4px -4px,-4px 0;"
									>
										<span class="absolute inset-0" style:background={exportBackgroundColor} style:opacity={exportBackgroundOpacity}></span>
									</button>
								{/if}
							</div>
						{/each}
					</div>
					{#if exportColorPicker === 'background'}
						<div role="dialog" aria-label="Background color picker" class="mt-1 border border-stone-500 bg-white p-2 shadow-lg">
							{@render exportColorSpectrum('background', exportBackgroundColor)}
							<label class="mt-2 block text-[10px] font-black tracking-wide uppercase">
								<span class="flex justify-between"><span>Opacity</span><span>{Math.round(exportBackgroundOpacity * 100)}%</span></span>
								<input
									type="range"
									min="0"
									max="100"
									value={exportBackgroundOpacity * 100}
									on:input={(event) => (exportBackgroundOpacity = Number(event.currentTarget.value) / 100)}
									aria-label="Export background opacity"
									class="block w-full cursor-pointer accent-stone-900"
								/>
							</label>
						</div>
					{/if}
				</section>

				<section class="border-t border-stone-300 pt-3">
					<div class="flex items-center justify-between gap-3 border border-stone-400 bg-white p-2">
						<span>
							<strong class="block text-xs font-black">Outer Field Border</strong>
							<span class="block text-[10px] text-stone-600">Adds color outside the white field boundary.</span>
						</span>
						<button
							type="button"
							aria-label="Choose outer field border color"
							aria-expanded={exportColorPicker === 'border'}
							on:click={() => (exportColorPicker = exportColorPicker === 'border' ? null : 'border')}
							class="relative h-8 w-12 shrink-0 cursor-pointer overflow-hidden border border-stone-600"
							style="background-color: #fff; background-image: linear-gradient(45deg,#d6d3d1 25%,transparent 25%),linear-gradient(-45deg,#d6d3d1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d6d3d1 75%),linear-gradient(-45deg,transparent 75%,#d6d3d1 75%); background-size: 8px 8px; background-position: 0 0,0 4px,4px -4px,-4px 0;"
						>
							<span class="absolute inset-0" style:background={exportFieldBorderColor} style:opacity={exportFieldBorderOpacity}></span>
						</button>
					</div>
					{#if exportColorPicker === 'border'}
						<div role="dialog" aria-label="Border color picker" class="mt-1 border border-stone-500 bg-white p-2 shadow-lg">
							{@render exportColorSpectrum('border', exportFieldBorderColor)}
							<label class="mt-2 block text-[10px] font-black tracking-wide uppercase">
								<span class="flex justify-between"><span>Opacity</span><span>{Math.round(exportFieldBorderOpacity * 100)}%</span></span>
								<input
									type="range"
									min="0"
									max="100"
									value={exportFieldBorderOpacity * 100}
									on:input={(event) => (exportFieldBorderOpacity = Number(event.currentTarget.value) / 100)}
									aria-label="Export field border opacity"
									class="block w-full cursor-pointer accent-stone-900"
								/>
							</label>
						</div>
					{/if}
				</section>
			</div>
		</div>
	</div>
{/if}

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
				<div class="flex items-center gap-2">
					<button
						type="button"
						disabled={fieldSettingsAreDefault}
						on:click={resetFieldSettings}
						class="h-9 cursor-pointer bg-white px-3 text-[10px] font-black tracking-wide text-stone-900 uppercase hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-xs"
					>
						Revert to Defaults
					</button>
					<button
						bind:this={settingsCloseButton}
						type="button"
						aria-label="Close settings"
						on:click={() => (showSettings = false)}
						class="flex h-9 w-9 cursor-pointer items-center justify-center bg-white text-xl font-black text-stone-900 hover:bg-stone-200">×</button
					>
				</div>
			</header>

			<div class="space-y-6 p-5 sm:p-6">
				<section>
					<h3 class="mb-2 text-sm font-black tracking-wide uppercase">Field Type</h3>
					<div data-tutorial="field-type-options" class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Field type">
						{#each fieldTypeOptions as option}
							<button
								type="button"
								role="radio"
								aria-checked={fieldSettings.fieldType === option.id}
								on:click={() => updateFieldSetting('fieldType', option.id)}
								class="flex h-full cursor-pointer flex-col justify-start border-2 border-stone-400 bg-white/75 p-3 text-left hover:border-stone-900 hover:bg-white/90 aria-checked:border-stone-950 aria-checked:bg-stone-900 aria-checked:text-white"
							>
								<span class="flex w-full items-baseline justify-between gap-2">
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
								class="flex h-full cursor-pointer items-start gap-3 border border-stone-400 bg-white/75 p-3 text-left hover:border-stone-900 hover:bg-white/90"
							>
								<span
									class="relative mt-0.5 h-5 w-9 shrink-0 border-2 border-stone-700 bg-stone-300 transition-colors"
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
					<div
						data-tutorial="field-color-options"
						class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
						role="radiogroup"
						aria-label="Field color"
					>
						{#each fieldColorOptions as option}
							<button
								type="button"
								role="radio"
								aria-checked={fieldSettings.fieldColor === option.id}
								on:click={() => updateFieldSetting('fieldColor', option.id)}
								class="cursor-pointer border-2 border-stone-400 bg-white/75 p-1.5 text-center hover:border-stone-950 aria-checked:border-stone-950 aria-checked:ring-2 aria-checked:ring-stone-950"
							>
								<span
									class="block h-9 border border-stone-800"
									style={`background-color: ${option.field}; background-image: repeating-linear-gradient(108deg, rgba(255, 255, 255, 0.08) 0 16px, rgba(255, 255, 255, 0.035) 16px 32px);`}
								></span>
								<span class="mt-1 block text-[10px] font-black">{option.label}</span>
							</button>
						{/each}
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

{#if showFeedback}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
		<button
			type="button"
			aria-label="Close feedback"
			on:click={() => (showFeedback = false)}
			class="absolute inset-0 cursor-default bg-stone-950/75 backdrop-blur-[1px]"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="play-builder-feedback-title"
			class="relative z-10 w-full max-w-md border-2 border-stone-950 bg-stone-50 text-stone-800 shadow-2xl"
		>
			<header class="flex items-center justify-between border-b-2 border-stone-900 bg-stone-900 px-5 py-3 text-white">
				<div>
					<h2 id="play-builder-feedback-title" class="text-xl font-black tracking-tight">Feedback</h2>
					<p class="text-xs text-stone-300">Help improve the play builder.</p>
				</div>
				<button
					bind:this={feedbackCloseButton}
					type="button"
					aria-label="Close feedback"
					on:click={() => (showFeedback = false)}
					class="flex h-9 w-9 cursor-pointer items-center justify-center bg-white text-xl font-black text-stone-900 hover:bg-stone-200">×</button
				>
			</header>
			<div class="space-y-4 p-5 text-sm leading-relaxed">
				<p>Found a problem or have an idea? Send your feedback to <strong>feedback@caseplay.org</strong>.</p>
				<a
					href="mailto:feedback@caseplay.org"
					class="inline-flex h-9 cursor-pointer items-center border-2 border-stone-900 bg-stone-900 px-4 text-xs font-black tracking-wide text-white uppercase hover:bg-stone-700"
					>Email Feedback</a
				>
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
							<strong>Place:</strong> Choose a tool, then click the field. Clicking an arrow tool places the previewed default arrow. If you drag, your
							movement adjusts its endpoint from that default position to shorten, lengthen, or redirect it.
						</p>
						<p>
							<strong>Move:</strong> Drag any placed element. When an arrow tool is selected, dragging from a player starts the arrow from—and keeps
							it attached to—that player. Moving an attached origin moves its player or football, and every attached arrow follows. Hold
							<kbd>Shift</kbd>
							while moving a free origin to snap and attach it to a nearby element.
						</p>
						<p>
							<strong>Edit:</strong> Double-click players, officials, footballs, event tags, penalty flags, flag belts, routes, arrows, and cross-field
							lines to open their inline editor.
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
					<h3 class="mb-3 border-b border-stone-300 pb-1 text-lg font-black">Official Positions</h3>
					<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{#each helpOfficialTools as item}
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
								strokes only while Draw is selected. Outside Draw mode, it also deletes touched players, field elements, routes, and cross-field lines.
								One continuous eraser gesture is one Undo action.
							</li>
							<li>
								<strong>Surface Pen barrel button:</strong> Hold the side/right-click button while using Straight to lock the stroke to the nearest
								45-degree angle, just like holding <kbd>Shift</kbd>.
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
						<li>Snap points automatically follow the markings available on the selected Traditional, 4v4, Unified, or NFL Flag field.</li>
						<li>
							<strong>Setup</strong> uses the selected field’s proper starting spot and first line to gain: A’s 14 to A’s 20 on Traditional, A’s 10 to midfield
							on 4v4, A’s 5 to midfield on Unified, or A’s 5 to midfield on NFL Flag. It adds A-1 and the appropriate initial official positions: a four-person
							crew on Traditional and Unified, or the R and LJ on 4v4 and NFL Flag. One Undo restores the previous diagram.
						</li>
					</ul>
				</section>

				<section>
					<h3 class="mb-2 border-b border-stone-300 pb-1 text-lg font-black">Multiple Plays</h3>
					<div class="grid gap-3 text-sm leading-relaxed md:grid-cols-2">
						<p>
							<strong>Switch and add:</strong> Use the Play tabs in the lower-left corner to move between diagrams. The <strong>+</strong> button adds a
							new blank diagram named Play 2, Play 3, and so on. Each play builder can contain up to ten plays. Scroll the tab row horizontally when the
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
							Try/yard markers, and team boxes. Changes appear immediately and are included in every export format.
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
							<strong>Exports:</strong> PNG, JPG, and WebP export the selected play. PDF exports every play in tab order on its own page. Export Settings
							controls transparent, grassy, or solid-color backgrounds and an optional outer field border. All formats preserve the live builder’s typography
							and layer order.
						</p>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}

<style>
	:global([data-tutorial='draw-workspace'].driver-active-element) {
		position: relative;
		z-index: 1000000001;
	}
	:global([data-tutorial='play-management'].driver-active-element) {
		position: absolute !important;
		z-index: 1000000001;
	}
	:global(.driver-overlay path) {
		pointer-events: none !important;
	}

	@keyframes tutorial-dock-bounce {
		0%,
		20%,
		50%,
		80%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-9px);
		}
		60% {
			transform: translateY(-5px);
		}
	}
	.tutorial-launch-bouncing {
		animation: tutorial-dock-bounce 1.35s ease-in-out infinite;
		transform-origin: bottom center;
	}
	:global(.driver-popover.caseplay-tutorial-popover) {
		max-width: 320px;
		border: 2px solid #1c1917;
		border-radius: 0;
		background: #fafaf9;
		color: #292524;
		font-family: ui-sans-serif, system-ui, sans-serif;
		box-shadow: 7px 7px 0 rgba(28, 25, 23, 0.35);
	}
	:global(.driver-popover.caseplay-tutorial-popover .driver-popover-title) {
		font-size: 16px;
		font-weight: 900;
		line-height: 1.15;
		color: #1c1917;
	}
	:global(.driver-popover.caseplay-tutorial-popover .driver-popover-description) {
		font-size: 12px;
		line-height: 1.45;
		color: #44403c;
	}
	:global(.driver-popover.caseplay-tutorial-popover .driver-popover-progress-text) {
		font-size: 10px;
		font-weight: 800;
		color: #78716c;
	}
	:global(.driver-popover.caseplay-tutorial-popover button) {
		border: 2px solid #1c1917;
		border-radius: 0;
		background: #1c1917;
		padding: 5px 10px;
		color: white;
		font-size: 11px;
		font-weight: 900;
		text-shadow: none;
		cursor: pointer;
	}
	:global(.driver-popover.caseplay-tutorial-popover button:hover) {
		background: #44403c;
		color: white;
	}
	:global(.driver-popover.caseplay-tutorial-popover button.caseplay-tutorial-end) {
		background: #fafaf9;
		color: #1c1917;
	}
	:global(.driver-popover.caseplay-tutorial-popover button.caseplay-tutorial-end:hover) {
		background: #e7e5e4;
		color: #1c1917;
	}
	:global(.driver-popover.caseplay-tutorial-popover .driver-popover-close-btn) {
		border: 0;
		background: transparent;
		color: #57534e;
		font-size: 20px;
	}
	:global(.driver-popover.caseplay-tutorial-popover .driver-popover-close-btn:hover) {
		background: transparent;
		color: #1c1917;
	}
	@media (prefers-reduced-motion: reduce) {
		.tutorial-launch-bouncing {
			animation: none;
			outline: 3px solid #facc15;
		}
	}
	.play-tabs-scroll {
		scrollbar-width: none;
	}
	.play-tabs-scroll::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}
	.down-yardage-input {
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.down-yardage-input::-webkit-inner-spin-button,
	.down-yardage-input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
		-webkit-appearance: none;
	}
	.play-builder-interaction {
		container-type: inline-size;
	}
	.field-canvas {
		aspect-ratio: 1000 / 484;
	}
	.view-only {
		border: 0;
		box-shadow: none;
	}
	.view-only [data-tutorial='draw-workspace'] {
		gap: 0;
		padding: 0;
	}
	.view-only .tool-column,
	.view-only .play-builder-interaction > :not(.field-canvas) {
		display: none !important;
	}
	.view-only .play-builder-interaction,
	.view-only .field-canvas {
		width: 100%;
	}
	.view-only .field-canvas {
		pointer-events: none;
	}
	.element-delete-button:hover,
	.element-delete-button:focus-visible {
		background-color: #dc2626 !important;
	}
	.tool-column {
		container-type: inline-size;
		width: clamp(2rem, calc((100dvh - 14rem) / 13), 3rem);
	}
	@container (max-width: 42px) {
		.tool-column [data-builder-tool] {
			gap: 0;
		}
		.tool-column [data-builder-tool] svg,
		.tool-column [data-builder-tool] img {
			width: 1.5rem;
			height: 1.5rem;
		}
		.tool-column [data-builder-tool] span {
			font-size: 7px;
		}
	}
	@container (max-width: 900px) {
		.down-marker-graphic {
			transform: translateY(22px);
		}
		.los-marker-graphic {
			transform: translateY(-22px);
		}
	}
	.drawing-cursor,
	.drawing-cursor [data-field-element] {
		cursor:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M5 26l3-8L23 3l6 6-15 15-9 2Z' fill='%23fff' stroke='%231c1917' stroke-width='2' stroke-linejoin='miter'/%3E%3Cpath d='m8 18 6 6' stroke='%231c1917' stroke-width='2'/%3E%3C/svg%3E")
				4 28,
			crosshair !important;
	}
	.erasing-cursor,
	.erasing-cursor [data-field-element] {
		cursor:
			url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M4 24 17 5l11 8-11 15H9Z' fill='%23fff' stroke='%231c1917' stroke-width='2' stroke-linejoin='miter'/%3E%3Cpath d='m11 18 8 6' fill='none' stroke='%231c1917' stroke-width='2'/%3E%3C/svg%3E")
				4 24,
			crosshair !important;
	}
	.laser-cursor,
	.laser-cursor * {
		cursor: none !important;
	}
	@media (max-height: 850px) {
		.draw-options-panel {
			position: absolute;
			top: 100%;
			left: 0;
			display: grid;
			width: min(20rem, calc(100vw - 3rem));
			grid-template-columns: 1fr 2fr 1fr;
			grid-template-rows: 1.75rem auto;
			gap: 1px;
			margin-top: 1px;
		}
		.draw-options-line-types {
			grid-column: 1;
			grid-row: 1;
		}
		.draw-options-thickness {
			grid-column: 2;
			grid-row: 1;
			margin-top: 0;
		}
		.draw-options-actions {
			grid-column: 3;
			grid-row: 1;
			margin-top: 0;
		}
		.draw-options-colors {
			grid-column: 1 / -1;
			grid-row: 2;
			grid-template-columns: repeat(10, minmax(0, 1fr));
			margin-top: 0;
		}
		.draw-options-colors button {
			min-height: 0;
		}
	}
</style>
