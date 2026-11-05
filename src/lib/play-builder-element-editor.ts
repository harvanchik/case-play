import { getContext, setContext } from 'svelte';
import { createElementEditorController, type ElementEditorCapabilities, type ElementEditorController } from './play-builder-editor-controller';
import { draggablePopover } from './play-builder-popover';

const context = Symbol('builder-element-editors');
export function provideElementEditors() {
	return setContext(context, createElementEditorController());
}
export interface ElementEditorOptions {
	close: () => void;
	capabilities?: ElementEditorCapabilities;
	outside?: boolean;
	ignore?: string;
}

/** Call during component initialization, then apply the returned action to its editor root. */
export function useElementEditor() {
	const coordinator = getContext<ElementEditorController | undefined>(context);
	return (node: HTMLElement, initial: ElementEditorOptions) => {
		let options = initial;
		const release = coordinator?.activate(() => options.close(), options.capabilities);
		const drag = draggablePopover(node);
		const outside = (event: PointerEvent) => {
			if (!options.outside || !(event.target instanceof Element)) return;
			if (node.contains(event.target) || event.target.closest(options.ignore ?? '.driver-popover')) return;
			options.close();
		};
		const key = (event: KeyboardEvent) => { if (options.outside && event.key === 'Escape') options.close(); };
		window.addEventListener('pointerdown', outside, true);
		window.addEventListener('keydown', key);
		return {
			update(next: ElementEditorOptions) { options = next; },
			destroy() {
				release?.();
				drag.destroy();
				window.removeEventListener('pointerdown', outside, true);
				window.removeEventListener('keydown', key);
			}
		};
	};
}
