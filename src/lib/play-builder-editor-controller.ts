export type ElementEditorCapabilities = {
	label?: boolean;
	color?: boolean;
	motion?: boolean;
	remove?: boolean;
	revert?: boolean;
};

/** A lease prevents a closing editor from accidentally unregistering its replacement. */
export function createElementEditorController() {
	let active: { token: symbol; close: () => void; capabilities: ElementEditorCapabilities } | null = null;
	return {
		activate(close: () => void, capabilities: ElementEditorCapabilities = {}) {
			const previous = active;
			const token = Symbol('element-editor');
			active = { token, close, capabilities };
			previous?.close();
			return () => { if (active?.token === token) active = null; };
		},
		close() {
			const previous = active;
			active = null;
			previous?.close();
		},
		get capabilities() { return active?.capabilities ?? null; }
	};
}
export type ElementEditorController = ReturnType<typeof createElementEditorController>;
