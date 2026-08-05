import type { OfficialKind, PlayerKind } from '$lib/play-builder-scene';
import type { PlayBuilderSportDefinition, PlayBuilderToolDefinition, PlayBuilderToolGroup } from '$lib/play-builder-definition';

export type FlagFootballTool =
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

export type FlagFootballToolIcon = 'event' | 'line-of-scrimmage' | 'line-to-gain';
export type FlagFootballToolDefinition = PlayBuilderToolDefinition<FlagFootballTool, FlagFootballToolIcon>;

export const FLAG_FOOTBALL_TOOL_GROUPS: readonly PlayBuilderToolGroup<FlagFootballTool, FlagFootballToolIcon>[] = [
	[
		{ id: 'team-a', label: 'Team A', symbol: 'A', shortcut: 'a', shortcutKeys: ['A'] },
		{ id: 'team-b', label: 'Team B', symbol: 'B', shortcut: 'b', shortcutKeys: ['B'] }
	],
	[
		{ id: 'team-k', label: 'Team K', symbol: 'K', shortcut: 'k', shortcutKeys: ['K'] },
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
	[{ id: 'bean-bag', label: 'Bean Bag', symbol: '', shortcut: 't', shortcutKeys: ['T'], caption: 'Bean Bag', image: '/images/bean-bag-blue.webp' }],
	[{ id: 'deflag', label: 'Flag Belt', symbol: '', shortcut: 'l', shortcutKeys: ['L'], caption: 'Flag Belt', image: '/images/flag-belt.webp' }],
	[{ id: 'event', label: 'Event Tag', symbol: '', shortcut: 'e', shortcutKeys: ['E'], caption: 'Event Tag', icon: 'event' }],
	[{ id: 'run', label: 'Run Arrow', symbol: '', shortcut: 'shift+r', shortcutKeys: ['Shift', 'R'], caption: 'Run', image: '/images/run-arrow.png' }],
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

export const FLAG_FOOTBALL_PLAY_BUILDER_DEFINITION: PlayBuilderSportDefinition<'flag-football', FlagFootballTool, FlagFootballToolIcon> = {
	id: 'flag-football',
	label: 'Flag Football',
	toolGroups: FLAG_FOOTBALL_TOOL_GROUPS
};
