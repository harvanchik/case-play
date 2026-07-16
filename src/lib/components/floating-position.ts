export type CursorFloatingPositionOptions = {
	cursorX: number;
	cursorY: number;
	panelWidth: number;
	panelHeight: number;
	offsetX?: number;
	offsetY?: number;
	padding?: number;
};

export const cursorFloatingPosition = ({
	cursorX,
	cursorY,
	panelWidth,
	panelHeight,
	offsetX = 24,
	offsetY = 18,
	padding = 8
}: CursorFloatingPositionOptions) => {
	let left = cursorX + offsetX;
	let top = cursorY + offsetY;

	if (left + panelWidth + padding > window.innerWidth) left = cursorX - panelWidth - offsetX;
	if (top + panelHeight + padding > window.innerHeight) top = cursorY - panelHeight - offsetY;

	return {
		left: Math.max(padding, Math.min(left, window.innerWidth - panelWidth - padding)),
		top: Math.max(padding, Math.min(top, window.innerHeight - panelHeight - padding))
	};
};
