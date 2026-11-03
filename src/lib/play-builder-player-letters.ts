import type { PlayBuilderFieldSettings, PlayBuilderScene, PlayerKind } from './play-builder-scene';
import type { PlayAnimation } from './play-builder-animation';
export const playerLetter = (settings: PlayBuilderFieldSettings, kind: PlayerKind) =>
	(settings.playerLetters ?? 'ABKR')['abkr'.indexOf(kind.slice(-1))];
export function renamePlayerLetter<T extends { scene: PlayBuilderScene; settings: PlayBuilderFieldSettings; animation?: PlayAnimation }>(
	play: T,
	kind: PlayerKind,
	letter: string
): T {
	const previous = playerLetter(play.settings, kind);
	const rename = (value: string | null | undefined) =>
		value && (value === previous || new RegExp(`^${previous}-\\d+$`).test(value)) ? letter + value.slice(1) : value;
	const ids = new Set(play.scene.markers.filter((marker) => marker.kind === kind).map((marker) => marker.id));
	const letters = (play.settings.playerLetters ?? 'ABKR').split('');
	letters['abkr'.indexOf(kind.slice(-1))] = letter;
	return {
		...play,
		settings: { ...play.settings, playerLetters: letters.join('') },
		scene: {
			...play.scene,
			markers: play.scene.markers.map((marker) =>
				ids.has(marker.id) ? { ...marker, label: rename(marker.label) ?? undefined, name: rename(marker.name) ?? undefined } : marker
			)
		},
		animation: play.animation
			? {
					...play.animation,
					steps: play.animation.steps.map((step) => ({
						...step,
						poses: step.poses.map((pose) =>
							pose.type === 'marker' && ids.has(pose.id) ? { ...pose, label: rename(pose.label), name: rename(pose.name) } : pose
						)
					}))
				}
			: undefined
	};
}
