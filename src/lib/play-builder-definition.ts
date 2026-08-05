/**
 * Presentation metadata shared by every sport's tool palette.
 * Interaction behavior stays inside the sport builder so a definition cannot
 * accidentally bypass that sport's placement and validation rules.
 */
export type PlayBuilderToolDefinition<TTool extends string, TIcon extends string = never> = {
	id: TTool;
	label: string;
	symbol: string;
	shortcut: string;
	shortcutKeys: readonly string[];
	caption?: string;
	image?: string;
	icon?: TIcon;
};

export type PlayBuilderToolGroup<TTool extends string, TIcon extends string = never> = readonly PlayBuilderToolDefinition<TTool, TIcon>[];

/**
 * The intentionally small contract every sport builder can provide today.
 * Field rendering and sport rules remain encapsulated by the sport-specific
 * builder until a second sport proves which parts of those systems are shared.
 */
export type PlayBuilderSportDefinition<TSport extends string, TTool extends string, TIcon extends string = never> = {
	id: TSport;
	label: string;
	toolGroups: readonly PlayBuilderToolGroup<TTool, TIcon>[];
};
