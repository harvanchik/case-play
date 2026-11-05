export interface ReorderAdapter<Id> {
	ids: () => Id[];
	enabled: () => boolean;
	preview: (ids: Id[] | null, drag: { id: Id; moved: boolean } | null) => void;
	hit: (x: number) => Id | undefined;
	capture: (pointerId: number) => void;
	scroll: (x: number) => void;
	commit: (ids: Id[]) => void;
	suppressClick: () => void;
}

/** Horizontal reorder gesture. The host owns its data, history and DOM hit testing. */
export function createReorderController<Id>(adapter: ReorderAdapter<Id>) {
	let drag: { id: Id; x: number; pointer: number; moved: boolean } | null = null;
	let order: Id[] | null = null;
	return {
		begin(event: Pick<PointerEvent, 'button' | 'clientX' | 'pointerId'>, id: Id) {
			if (event.button !== 0 || !adapter.enabled()) return;
			drag = { id, x: event.clientX, pointer: event.pointerId, moved: false };
			adapter.preview(null, drag);
		},
		move(event: Pick<PointerEvent, 'clientX' | 'pointerId'>) {
			if (!drag || event.pointerId !== drag.pointer || (!drag.moved && Math.abs(event.clientX - drag.x) < 5)) return;
			if (!drag.moved) adapter.capture(event.pointerId);
			drag.moved = true;
			adapter.scroll(event.clientX);
			const target = adapter.hit(event.clientX);
			if (target !== undefined && target !== drag.id) {
				const ids = order ?? adapter.ids();
				const index = ids.indexOf(target);
				if (index >= 0) {
					order = ids.filter(id => id !== drag!.id);
					order.splice(index, 0, drag.id);
				}
			}
			adapter.preview(order, drag);
		},
		end(cancel = false) {
			if (drag?.moved) {
				adapter.suppressClick();
				if (!cancel && order) adapter.commit(order);
			}
			drag = null;
			order = null;
			adapter.preview(null, null);
		}
	};
}
