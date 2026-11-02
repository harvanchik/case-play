<script lang="ts">
	import {
		animationDuration,
		appendAnimationStep,
		cloneAnimation,
		defaultMotion,
		insertAnimationStep,
		rebuildTransitions,
		relativePoint,
		sameTarget,
		stepTime,
		type AnimationTarget,
		type Motion,
		type PlayAnimation
	} from '$lib/play-builder-animation';
	import { playBuilderAirbornePoint } from '$lib/play-builder-rendering';
	import type { PlayBuilderScene } from '$lib/play-builder-scene';
	import { flip } from 'svelte/animate';
	import { onMount, tick } from 'svelte';
 import { createKeyboardScrubber } from '$lib/play-builder-keyboard-scrub';
	import AnimationIcon from './AnimationIcon.svelte';
	import HoverTooltip from '../HoverTooltip.svelte';
	const tooltipMinorWords = new Set([
		'a',
		'an',
		'and',
		'as',
		'at',
		'but',
		'by',
		'for',
		'from',
		'if',
		'in',
		'into',
		'nor',
		'of',
		'on',
		'or',
		'per',
		'the',
		'to',
		'via',
		'vs',
		'with'
	]);
	function tooltipTitle(value: string) {
		if (value === 'Max Length Reached (1 min)') return value;
		const words = value.match(/\p{L}[\p{L}\p{N}'’]*/gu) ?? [];
		let index = 0;
		return value.replace(/\p{L}[\p{L}\p{N}'’]*/gu, (word) => {
			const position = index++,
				lower = word.toLowerCase();
			if (['MP4', 'PDF', 'NFL', 'QB', 'LOS', 'LTG'].includes(word.toUpperCase())) return word.toUpperCase();
			return position > 0 && position < words.length - 1 && tooltipMinorWords.has(lower) ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
		});
	}
	let tooltipText = '';
 let tooltipAboveMarker = false;
	let tooltipKeys: string[] = [];
	let tooltipPointer: { x: number; y: number } | undefined;
	let hoveredTimelineStep: string | null = null;
	let draggingPlayhead = false;
	let playheadDragOffset = 0;
	let keyboardSeeking = false;
	let markerDrag: { original: PlayAnimation; index: number; x: number; width: number; total: number; moved: boolean } | null = null;
	let suppressMarkerClick = false;
	function beginMarker(event: PointerEvent, index: number) {
		if (!index || index === animation.steps.length - 1 || event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		markerDrag = { original: cloneAnimation(animation), index, x: event.clientX,
			width: Math.max(1, panel.querySelector('.playback-timeline')!.getBoundingClientRect().width - 12), total, moved: false };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function moveMarker(event: PointerEvent) {
		if (!markerDrag) return;
		const drag = markerDrag;
		if (!drag.moved && Math.abs(event.clientX - drag.x) < 3) return;
		drag.moved = true;
		const next = cloneAnimation(drag.original);
		const before = next.transitions[drag.index - 1];
		const after = next.transitions[drag.index];
		const increment = event.shiftKey ? 0.01 : 0.05;
        const delta = Math.round(((event.clientX - drag.x) / drag.width * drag.total) / increment) * increment;
		const adjusted = Math.max(0.1, Math.min(before.duration + delta, before.duration + (after ? after.duration - 0.1 : 0)));
		if (after) after.duration = Math.round((after.duration + before.duration - adjusted) * 100) / 100;
		before.duration = Math.round(adjusted * 100) / 100;
		animation = next;
	}
	function endMarker(cancel = false) {
		if (!markerDrag) return;
		const drag = markerDrag;
		markerDrag = null;
		const next = animation;
		animation = drag.original;
		suppressMarkerClick = drag.moved;
		if (drag.moved && !cancel) onchange(next, drag.index);
		setTimeout(() => (suppressMarkerClick = false), 0);
	}
	function snapTime(value: number) {
		const rail = panel?.querySelector<HTMLElement>('.playback-timeline');
		const width = Math.max(1, (rail?.getBoundingClientRect().width ?? 12) - 12);
		const nearest = animation.steps
			.map((step, index) => ({ step, time: stepTime(animation, index) }))
			.sort((a, b) => Math.abs(a.time - value) - Math.abs(b.time - value))[0];
		return nearest && total && (Math.abs(nearest.time - value) / total) * width <= 6 ? nearest.time : value;
	}
	function seekPointer(event: PointerEvent) {
		const bounds = panel.querySelector<HTMLElement>('.playback-timeline')!.getBoundingClientRect();
		onseek(snapTime(Math.max(0, Math.min(1, (event.clientX - playheadDragOffset - bounds.left - 6) / (bounds.width - 12))) * total));
	}
	function beginPlayhead(event: PointerEvent) {
		if (!total || event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		draggingPlayhead = true;
		const handleBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
		playheadDragOffset = event.clientX - handleBounds.left - handleBounds.width / 2;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function updateTooltip(event: Event) {
  tooltipAboveMarker = false;
		tooltipPointer = event instanceof PointerEvent ? { x: event.clientX, y: event.clientY } : undefined;
		const target = event.target as Element;
		const timeline = target?.closest('.playback-timeline');
		hoveredTimelineStep = null;
		tooltipKeys = [];
		if (timeline && event instanceof PointerEvent) {
			const bounds = timeline.getBoundingClientRect();
			const nearest = animation.steps
				.map((step, index) => ({ step, x: bounds.left + 6 + (total ? stepTime(animation, index) / total : 0) * (bounds.width - 12) }))
				.sort((a, b) => Math.abs(a.x - event.clientX) - Math.abs(b.x - event.clientX))[0];
			if (nearest && Math.abs(nearest.x - event.clientX) <= 10) {
				hoveredTimelineStep = nearest.step.id;
    tooltipAboveMarker = true;
    const marker = timeline.querySelector<HTMLElement>(`[data-animation-step-marker="${nearest.step.id}"]`);
    tooltipPointer = { x: nearest.x, y: marker?.getBoundingClientRect().top ?? bounds.top };
				tooltipText = nearest.step.name;
				const index = animation.steps.findIndex((step) => step.id === nearest.step.id);
				tooltipKeys = index >= 0 && index < 9 ? [String(index + 1)] : [];
				return;
			}
		}
		const button = (event.target as Element)?.closest('button');
		const timelineStepId = button?.getAttribute('data-animation-step-marker');
  if (timelineStepId) {
   const index = animation.steps.findIndex(step => step.id === timelineStepId);
   const bounds = button!.getBoundingClientRect();
   tooltipAboveMarker = true;
   tooltipPointer = { x: bounds.left + bounds.width / 2, y: bounds.top };
   tooltipText = animation.steps[index]?.name ?? '';
   tooltipKeys = index >= 0 && index < 9 ? [String(index + 1)] : [];
   return;
  }
  const shortcut = button?.getAttribute('data-animation-shortcut');
		if (shortcut) {
			if (shortcut === 'PlaybackSpeed') tooltipKeys = ['Alt', '↑ / ↓'];
			else if (shortcut === 'KeyK') tooltipKeys = ['K / Space'];
			else if (shortcut === 'Home') tooltipKeys = ['HOME'];
            else if (shortcut === 'End') tooltipKeys = ['END'];
            else if (['KeyJ', 'KeyL'].includes(shortcut)) tooltipKeys = [shortcut.replace('Key', '')];
			else if (['KeyA', 'KeyT'].includes(shortcut)) tooltipKeys = ['Alt', shortcut.replace('Key', '')];
			else tooltipKeys = ['Alt', 'Shift', shortcut.replace('Key', '').replace('ArrowRight', '→').replace('ArrowLeft', '←')];
		}

		const stepId = button?.getAttribute('data-step-id');
		if (stepId) {
			const index = animation.steps.findIndex((step) => step.id === stepId);
			tooltipText = animation.steps[index]?.name ?? '';
			tooltipKeys = index >= 0 && index < 9 ? [String(index + 1)] : [];
			return;
		}
		tooltipText = button?.getAttribute('data-animation-tooltip') || button?.getAttribute('aria-label') || button?.textContent?.trim() || '';
	}
	export let animation: PlayAnimation;
	export let scene: PlayBuilderScene;
	export let stepIndex = 0;
	export let selection: AnimationTarget[] = [];
	export let readOnly = false;
 export let minimumStepCount = 1;
	export let shortcutsEnabled = true;
	export let playing = false;
	export let preview = false;
	export let time = 0;
	export let rate = 1;
	export let loop = false;
	export let ghosts = true;
	export let onchange: (animation: PlayAnimation, step?: number) => void;
	export let onstep: (index: number) => void;
	export let onseek: (time: number) => void;
 export let onshuttle: (direction: number) => void;
	export let onplay: () => void;
	export let onclose: () => void;
 export let tutorialAttention = false;
 export let ontutorial: () => void;
 export let onreset: () => void;
 export let oncreateplay: (index: number) => void;
 export let canCreatePlay = true;
	export let onerror: (message: string) => void;
	let timing = false;

	let panel: HTMLDivElement;
 let durationInput: HTMLInputElement;
	let dockX: number | null = null,
		dockY: number | null = null;
	let viewportWidth = 1440,
		viewportHeight = 900;
	let preferredWidth = 720;
	let stepScrolling = false;
 let manuallyResized = false;
 let growingForSteps = false;
 let growthRevision = 0;
 $: if (panel) { panelWidth; void updateStepScrolling(); }
 async function updateStepScrolling() {
  await tick();
  if (growingForSteps) return;
  const rail = panel?.querySelector<HTMLElement>('.steps');
  if (rail) stepScrolling = rail.scrollWidth - rail.clientWidth > 2;
 }
	$: if (panel) {
		animation.steps;
		viewportWidth;
		void growForSteps();
	}
	async function growForSteps() {
        const revision = ++growthRevision;
        growingForSteps = true;
		await tick();
		const rail = panel?.querySelector<HTMLElement>('.steps');
		if (!rail || dockResize) { growingForSteps = false; void updateStepScrolling(); return; }
		const overflow = rail.scrollWidth - rail.clientWidth;
		const available = Math.min(viewportWidth - 16, viewportWidth * 0.75);
		if (overflow > 1 && panelWidth < available) {
			preferredWidth = Math.max(preferredWidth, Math.min(available, panelWidth + overflow + 2));
			await fitDock();
		}
		await tick();
		if (revision !== growthRevision) return;
        growingForSteps = false;
        stepScrolling = rail.scrollWidth - rail.clientWidth > 2;
		void scrollSelectedStep(animation.steps[stepIndex]?.id);
	}
	$: panelWidth = Math.min(preferredWidth, viewportWidth - 16, manuallyResized ? Infinity : viewportWidth * 0.75);
	const speeds = [0.25, 0.5, 1, 1.25, 1.5, 1.75, 2];
	function adjustPlaybackSpeed(direction: number) {
		const index = speeds.indexOf(rate);
		rate = speeds[Math.max(0, Math.min(speeds.length - 1, index + direction))];
	}
	function cycleSpeed() {
		rate = speeds[(speeds.indexOf(rate) + 1) % speeds.length];
	}
	async function fitDock() {
		await tick();
		if (!panel) return;
		const combinedWidth = panelWidth + 0;
		const combinedHeight = panel.offsetHeight;
		dockX = Math.max(8, Math.min(dockX ?? (viewportWidth - panelWidth) / 2, viewportWidth - combinedWidth - 8));
		dockY = Math.max(8, Math.min(dockY ?? viewportHeight - panel.offsetHeight - 32, viewportHeight - combinedHeight - 8));
	}
	let dockResize: { side: 'left' | 'right'; x: number; left: number; right: number; width: number } | null = null;
	function resizeWidth(delta: number, start: { side: 'left' | 'right'; left: number; right: number; width: number }) {
        manuallyResized = true;
		const extra = 0;
		const minimum = Math.min(480, viewportWidth - 16 - extra);
		if (start.side === 'left') {
			const left = Math.max(8, Math.min(start.right - minimum, start.left + delta));
			dockX = left;
			preferredWidth = start.right - left;
		} else {
			preferredWidth = Math.max(minimum, Math.min(viewportWidth - 8 - extra - start.left, start.width + delta));
		}
	}
	function beginResize(event: PointerEvent, side: 'left' | 'right') {
		if (event.button !== 0) return;
		event.preventDefault();
		event.stopPropagation();
		const bounds = panel.getBoundingClientRect();
		dockResize = { side, x: event.clientX, left: bounds.left, right: bounds.right, width: bounds.width };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function moveResize(event: PointerEvent) {
		if (dockResize) resizeWidth(event.clientX - dockResize.x, dockResize);
	}
	function resizeKey(event: KeyboardEvent, side: 'left' | 'right') {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		event.preventDefault();
		event.stopPropagation();
		const bounds = panel.getBoundingClientRect();
		resizeWidth(event.key === 'ArrowLeft' ? -16 : 16, { side, left: bounds.left, right: bounds.right, width: bounds.width });
	}
	let dockDrag: { x: number; y: number; left: number; top: number } | null = null;
	let order: string[] | null = null;
	let stepDrag: { id: string; x: number; moved: boolean } | null = null;
	let suppressStepClick = false;
	$: orderedSteps = order ? order.map((id) => animation.steps.find((step) => step.id === id)!).filter(Boolean) : animation.steps;
	function beginDock(event: PointerEvent) {
		if ((event.target as Element).closest('button, input, select, label, [data-animation-popup]') || event.button !== 0) return;
		const bounds = panel.getBoundingClientRect();
		dockDrag = { x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function moveDock(event: PointerEvent) {
		if (!dockDrag) return;
		dockX = Math.max(8, Math.min(viewportWidth - panelWidth - 0 - 8, dockDrag.left + event.clientX - dockDrag.x));
		dockY = Math.max(8, Math.min(viewportHeight - panel.offsetHeight - 8, dockDrag.top + event.clientY - dockDrag.y));
	}
	$: scrollSelectedStep(animation.steps[stepIndex]?.id);
	async function scrollSelectedStep(id: string | undefined) {
		await tick();
		if (!panel || !id || stepDrag) return;
		const button = panel.querySelector<HTMLElement>(`[data-step-id="${id}"]`),
			rail = panel.querySelector<HTMLElement>('.steps');
		if (!button || !rail) return;
		if (id === animation.steps.at(-1)?.id) {
            rail.scrollTo({ left: rail.scrollWidth, behavior: 'smooth' });
            return;
        }
        const bounds = rail.getBoundingClientRect(),
			item = button.getBoundingClientRect();
		if (item.right > bounds.right) rail.scrollBy({ left: item.right - bounds.right + 5, behavior: 'smooth' });
		else if (item.left < bounds.left) rail.scrollBy({ left: item.left - bounds.left - 5, behavior: 'smooth' });
	}
 function scrollStepsWithWheel(event: WheelEvent) {
  const rail = event.currentTarget as HTMLElement;
  if (event.ctrlKey || rail.scrollWidth <= rail.clientWidth + 2) return;
  const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (!delta) return;
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? rail.clientWidth : 1;
  rail.scrollLeft += delta * unit;
 }
	function beginStep(event: PointerEvent, id: string) {
		if (readOnly || event.button !== 0) return;
		stepDrag = { id, x: event.clientX, moved: false };
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function moveStep(event: PointerEvent) {
		if (!stepDrag || (Math.abs(event.clientX - stepDrag.x) < 5 && !stepDrag.moved)) return;
		stepDrag.moved = true;
		const rail = panel.querySelector<HTMLElement>('.steps')!;
		const railBounds = rail.getBoundingClientRect();
		if (event.clientX < railBounds.left + 20) rail.scrollLeft -= 12;
		if (event.clientX > railBounds.right - 20) rail.scrollLeft += 12;
		const hovered = [...panel.querySelectorAll<HTMLElement>('[data-step-id]')].find((button) => {
			const r = button.getBoundingClientRect();
			return event.clientX >= r.left && event.clientX <= r.right;
		});
		if (!hovered || hovered.dataset.stepId === stepDrag.id) return;
		const ids = order ?? animation.steps.map((step) => step.id),
			target = ids.indexOf(hovered.dataset.stepId!);
		const next = ids.filter((id) => id !== stepDrag!.id);
		next.splice(target, 0, stepDrag.id);
		order = next;
	}
	function endStep() {
		if (stepDrag?.moved && order) {
			const next = cloneAnimation(animation);
			next.steps = order.map((id) => next.steps.find((step) => step.id === id)!);
			const rebuilt = rebuildTransitions(next);
			if (animationDuration(rebuilt) <= 60) onchange(rebuilt, order.indexOf(animation.steps[stepIndex].id));
			else onerror('Animation exceeds 60 seconds.');
			suppressStepClick = true;
			setTimeout(() => (suppressStepClick = false), 0);
		}
		stepDrag = null;
		order = null;
	}
	onMount(() => {
		panel.focus({ preventScroll: true });

		const resize = () => {
			viewportWidth = window.innerWidth;
			viewportHeight = window.innerHeight;
			void fitDock();
		};
		resize();
		void document.fonts.ready.then(growForSteps);
        const rail = panel.querySelector<HTMLElement>('.steps');
        const observer = new ResizeObserver(() => void updateStepScrolling());
        if (rail) observer.observe(rail);

		window.addEventListener('resize', resize);
		return () => {
   keyboardScrubber.stop();
            stopTransportScrub();
            observer.disconnect();
			window.removeEventListener('resize', resize);
		};
	});
	$: total = animationDuration(animation);
	$: canDuplicate =
		animation.steps.length < 61 && total + (animation.transitions[stepIndex] ? 2 - animation.transitions[stepIndex].duration : 1) <= 60;
 $: canAdd = animation.steps.length < 61 && total + 1 <= 60;
	$: transitionIndex = preview
  ? Math.min(animation.transitions.length - 1, Math.max(0, animation.steps.filter((_, index) => stepTime(animation, index) <= time).length - 1))
  : stepIndex - 1;
	$: transition = animation.transitions[transitionIndex];
	$: from = animation.steps[transitionIndex];
	$: to = animation.steps[transitionIndex + 1];
	$: selected = selection[0];
	$: motion = selected ? (transition?.motions.find((item) => sameTarget(item, selected)) ?? defaultMotion(selected)) : undefined;
	$: selectedMarker = selected?.type === 'marker' ? scene.markers.find((item) => item.id === selected.id) : undefined;
	$: sourceCarrier = selected ? from?.poses.find((item) => sameTarget(item, selected))?.carrierId : undefined;
	$: carriedThroughout = sourceCarrier !== undefined && to?.poses.find((item) => sameTarget(item, selected))?.carrierId === sourceCarrier;
	$: movers =
		from && to
			? from.poses.filter((a) => {
					const b = to.poses.find((item) => sameTarget(item, a));
					if (a.carrierId !== undefined && a.carrierId === b?.carrierId) return false;
					return (
						b &&
						a.visible &&
						b.visible &&
						(a.x !== b.x || a.y !== b.y || a.carrierId !== b.carrierId || transition?.motions.some((item) => sameTarget(item, a)))
					);
				})
			: [];

	const defaultNames: Record<string, string> = {
		'official-r': 'Referee',
		'official-l': 'Line Judge',
		'official-f': 'Field Judge',
		'official-b': 'Back Judge',
		ball: 'Football',
		flag: 'Penalty Flag',
		'bean-bag': 'Bean Bag',
		deflag: 'Flag Belt',
		event: 'Event Marker',
		'team-a': 'Team A Player',
		'team-b': 'Team B Player',
		'team-k': 'Team K Player',
		'team-r': 'Team R Player',
		'line-of-scrimmage': 'Line of Scrimmage',
		'line-to-gain': 'Line to Gain',
		custom: 'Guide Line'
	};
	const label = (target: AnimationTarget, objects = scene) => {
		const object =
			target.type === 'guide' ? objects.guides.find((item) => item.id === target.id) : objects.markers.find((item) => item.id === target.id);
		return (
			object?.name ||
			(target.type === 'marker' ? objects.markers.find((item) => item.id === target.id)?.label : '') ||
			defaultNames[object?.kind ?? ''] ||
			'Object'
		);
	};
	$: selectedName = selected ? label(selected, scene) : '';
	function updateMotion(next: Motion) {
		if (!transition) return;
		const value = cloneAnimation(animation);
		value.transitions[transitionIndex].motions = [...transition.motions.filter((item) => !sameTarget(item, next)), next];
		onchange(value);
	}
	let focusedTitle: HTMLInputElement | null = null;
	let selectTitleOnClick = false;
	function titlePointerDown(event: PointerEvent) {
		selectTitleOnClick = document.activeElement !== event.currentTarget;
	}
	function selectTitle(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (event.type === 'click' && !selectTitleOnClick) return;
		focusedTitle = input;
		input.select();
		requestAnimationFrame(() => {
			if (document.activeElement === input && focusedTitle === input) input.select();
		});
		if (event.type === 'click') selectTitleOnClick = false;
	}
	function adjustSeconds(event: KeyboardEvent, update: (value: number) => void) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		update(Number((event.currentTarget as HTMLInputElement).value) + (event.key === 'ArrowUp' ? 0.25 : -0.25));
	}
 function durationKeydown(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && !/[0-9.]/.test(event.key)) event.preventDefault();
  adjustSeconds(event, duration);
 }
 function durationPaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text').trim() ?? '';
  event.preventDefault();
  if (!/^\d*\.?\d+$/.test(value)) return;
  duration(Math.min(60, Number(value)));
 }
 function durationInputChange(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  if (Number(input.value) > 60) { input.value = '60'; duration(60); }
  if (Number(input.value) < 0) { input.value = '0'; duration(0); }
 }
	function duration(value: number) {
		if (!transition || !Number.isFinite(value)) return;
		const next = cloneAnimation(animation);
		next.transitions[transitionIndex].duration = Math.round(Math.max(0.1, Math.min(value, 60 - total + transition.duration)) * 100) / 100;
		onchange(next);
	}
 let stepMenuId: string | null = null;
 let stepMenuX = 0, stepMenuY = 0;
 async function openStepMenu(event: MouseEvent, id: string) {
  event.preventDefault(); event.stopPropagation();
  if (readOnly || suppressStepClick) return;
  onstep(animation.steps.findIndex(step => step.id === id));
  stepMenuId = id;
  await positionStepMenu();
 }
 async function positionStepMenu() {
  await tick();
  if (!stepMenuId || !panel) return;
  const anchor = panel.querySelector<HTMLElement>(`[data-step-id="${stepMenuId}"]`);
  if (!anchor) { stepMenuId = null; return; }
  const box = anchor.getBoundingClientRect();
  stepMenuX = Math.max(8, Math.min(window.innerWidth - 196, box.left));
  stepMenuY = box.bottom + 100 > window.innerHeight - 8 ? box.top - 100 : box.bottom + 4;
 }
 $: if (stepMenuId) { dockX; dockY; panelWidth; void positionStepMenu(); }
 function stepMenuAction(action: 'duplicate' | 'delete' | 'create-play') {
  const index = animation.steps.findIndex(step => step.id === stepMenuId);
  stepMenuId = null;
  if (index < 0) return;
  if (action === 'create-play') oncreateplay(index); else if (action === 'duplicate') duplicate(index); else removeStep(index);
 }
	function duplicate(index = stepIndex) {
		try {
			const next = insertAnimationStep(animation, index);
			onchange(next, index + 1);
		} catch (error) {
			onerror((error as Error).message);
		}
	}
	function add() {
		try {
			const next = appendAnimationStep(animation);
			onchange(next, next.steps.length - 1);
		} catch (error) {
			onerror((error as Error).message);
		}
	}
	function removeStep(index = stepIndex) {
		if (animation.steps.length <= minimumStepCount) return;
		const next = cloneAnimation(animation);
		next.steps.splice(index, 1);
		const rebuilt = rebuildTransitions(next);
		if (animationDuration(rebuilt) > 60) return onerror('Animation exceeds 60 seconds.');
		onchange(rebuilt, Math.max(0, index - 1));
	}
	function possession(value: string, throwBall = false) {
		if (!selectedMarker || !selected) return;
		const next = cloneAnimation(animation);
		const index = throwBall ? Math.min(next.steps.length - 1, stepIndex + 1) : stepIndex;
		const pose = next.steps[index].poses.find((item) => sameTarget(item, selected));
		if (!pose) return;
		if (!value) {
			delete pose.carrierId;
			delete pose.offset;
		} else {
			pose.carrierId = Number(value);
			pose.offset = { x: 12, y: 8 };
			const carrier = next.steps[index].poses.find((item) => item.type === 'marker' && item.id === pose.carrierId);
			if (carrier) {
				pose.x = carrier.x + 12;
				pose.y = carrier.y + 8;
			}
			if (throwBall && next.transitions[stepIndex]) {
				const item = next.transitions[stepIndex];
				item.motions = [
					...item.motions.filter((m) => !sameTarget(m, selected)),
					{ ...defaultMotion(selected), path: 'curve', points: [{ x: 0.5, y: -35 }] }
				];
			}
		}
		onchange(next, throwBall ? index : stepIndex);
	}
	function offset(axis: 'x' | 'y', value: number) {
		if (!selected || !Number.isFinite(value)) return;
		const next = cloneAnimation(animation),
			pose = next.steps[stepIndex].poses.find((item) => sameTarget(item, selected));
		if (pose?.carrierId !== undefined) {
			pose.offset = { x: pose.offset?.x ?? 12, y: pose.offset?.y ?? 8, [axis]: value };
			onchange(next);
		}
	}
	function useArrow(id: number) {
		if (!selected || !motion) return;
		const arrow = scene.paths.find((item) => item.id === id);
		if (!arrow) return;
		const points =
			arrow.points ??
			(arrow.kind === 'pass' || arrow.kind === 'kick'
				? Array.from({ length: 33 }, (_, i) => playBuilderAirbornePoint(arrow.kind as 'pass' | 'kick', arrow.start, arrow.end, i / 32, 50))
				: [arrow.start, arrow.end]);
		updateMotion({
			...motion,
			path: 'custom',
			points: points.slice(1, -1).map((point) => relativePoint(point, arrow.start, arrow.end)),
			smooth: true
		});
	}
	function previousAnimationStep() {
		if (!preview) {
			if (stepIndex > 0) onstep(stepIndex - 1);
			return;
		}
		for (let index = animation.steps.length - 1; index >= 0; index--)
			if (stepTime(animation, index) < time - 0.000001) {
				onstep(index);
				return;
			}
	}
	function nextAnimationStep() {
		if (!preview) {
			if (stepIndex < animation.steps.length - 1) onstep(stepIndex + 1);
			return;
		}
		const index = animation.steps.findIndex((_, index) => stepTime(animation, index) > time + 0.000001);
		if (index >= 0) onstep(index);
	}
 let transportFrame: number | null = null;
 let transportPress: { direction: number; started: number; held: boolean; button: HTMLElement } | null = null;
 function stopTransportScrub() {
  if (transportFrame !== null) cancelAnimationFrame(transportFrame);
  transportFrame = null;
  if (transportPress?.held) onshuttle(0);
  transportPress = null;
 }
 function scrubTransport(direction: number) { onseek(Math.max(0, Math.min(total, time + direction * 0.25))); }
 function finishTransportScrub(event: PointerEvent) {
  const press = transportPress;
  if (!press) return;
  const singleClick = !press.held && performance.now() - press.started < 200 && press.button.contains(event.target as Node);
  stopTransportScrub();
  if (singleClick) scrubTransport(press.direction);
 }
 function beginTransportScrub(event: PointerEvent, direction: number) {
  if (event.button !== 0) return;
  event.preventDefault();
  stopTransportScrub();
  transportPress = { direction, started: performance.now(), held: false, button: event.currentTarget as HTMLElement };
  const waitForHold = (now: number) => {
   transportFrame = null;
   if (!transportPress) return;
   if (now - transportPress.started >= 200) {
    transportPress.held = true;
    onshuttle(direction);
   } else transportFrame = requestAnimationFrame(waitForHold);
  };
  transportFrame = requestAnimationFrame(waitForHold);
 }
 const keyboardScrubber = createKeyboardScrubber(() => time, () => total, value => onseek(value), { playing: () => playing, change: onshuttle });
	function animationKeydown(event: KeyboardEvent) {
  keyboardScrubber.modifier(event.shiftKey);
  if (!['ArrowLeft', 'ArrowRight', 'Shift'].includes(event.key)) keyboardScrubber.stop();
		if (event.defaultPrevented || !shortcutsEnabled || event.ctrlKey || event.metaKey || event.isComposing) return;
		if ((event.target as Element)?.closest('input:not([type="range"]),textarea,select,[contenteditable="true"],[data-timing-rail]')) return;
		if (!event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
			event.preventDefault();
			event.stopPropagation();
			keyboardScrubber.keydown(event);
			return;
		}
		if (event.repeat) return;
		if (!event.altKey && !event.shiftKey) {
			if (event.code === 'Space') {
				event.preventDefault();
				event.stopPropagation();
				if (total) onplay();
				return;
			}
			if (['KeyJ', 'KeyK', 'KeyL'].includes(event.code)) {
				event.preventDefault();
				event.stopPropagation();
				if (event.code === 'KeyK' && total) onplay();
				else if (event.code === 'KeyJ') previousAnimationStep();
				else if (event.code === 'KeyL') nextAnimationStep();
				return;
			}

			const number = /^Numpad[1-9]$/.test(event.code) ? Number(event.code.slice(-1)) : /^[1-9]$/.test(event.key) ? Number(event.key) : 0;
			const index = number ? number - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? animation.steps.length - 1 : -1;
			if (index >= 0 && index < animation.steps.length) {
				event.preventDefault();
				event.stopPropagation();
				onstep(index);
			}
			return;
		}
		if (event.altKey && !event.shiftKey) {
			const actions: Record<string, () => void> = {
				KeyA: onclose,
				ArrowUp: () => adjustPlaybackSpeed(1),
				ArrowDown: () => adjustPlaybackSpeed(-1),
				...(!readOnly
					? {
							KeyT: () => {
								if (transition && !preview) { durationInput?.focus(); durationInput?.select(); }
							},

						}
					: {})
			};
			const action = actions[event.code];
			if (action) {
				event.preventDefault();
				event.stopPropagation();
				action();
			}
			return;
		}
		if (!event.altKey || !event.shiftKey) return;
		const actions: Record<string, () => void> = {
			ArrowLeft: previousAnimationStep,
			ArrowRight: nextAnimationStep,
			...(!readOnly
				? {
						KeyN: () => {
							if (canAdd) add();
						},
						KeyD: () => {
							if (canDuplicate && !preview) duplicate();
						},
						Backspace: () => {
							if (!preview && animation.steps.length > 1) removeStep();
						}
					}
				: {})
		};
		const action = actions[event.code];
		if (!action) return;
		event.preventDefault();
		event.stopPropagation();
		action();
	}
</script>

<svelte:window
 on:keyup={(event) => keyboardScrubber.keyup(event)}
 on:blur={() => { keyboardScrubber.stop(); stopTransportScrub(); }}
 on:pointerup={finishTransportScrub}
 on:pointercancel={stopTransportScrub}
 on:pointerdown={(event) => { if (!(event.target as Element)?.closest('[data-step-menu], [data-step-id]')) stepMenuId = null; }}
	on:keydown|capture={(event) => {
		if (event.key === 'Escape') stepMenuId = null;
		animationKeydown(event);
	}}
/>
<div
	class="contents"
	role="presentation"
	on:pointerover|capture={updateTooltip}
	on:pointermove|capture={updateTooltip}
	on:focusin|capture={updateTooltip}
>
	<HoverTooltip
		reopenOnPointerMove
		pointerPosition={tooltipPointer}
		text={tooltipTitle(tooltipText)}
		shortcutKeys={tooltipKeys}
		minWidthPx={0}
		placement={tooltipAboveMarker ? "above" : "right"}
  cursorOffsetYPx={tooltipAboveMarker ? 8 : 18}
		wrapperClass="contents"
	>
		<div
			bind:this={panel}
			data-animation-ui
			class="animation-panel"
			role="toolbar"
			tabindex="-1"
			on:pointerdown={beginDock}
			on:pointermove={moveDock}
			on:pointerup={() => (dockDrag = null)}
			on:pointercancel={() => (dockDrag = null)}
			style:width={`${panelWidth}px`}
			class:positioned={dockX !== null}
			style:left={dockX === null ? undefined : `${dockX}px`}
			style:top={dockY === null ? undefined : `${dockY}px`}
			aria-label="Play animation controls"
		>
			{#each ['left', 'right'] as side}
				<button
					type="button"
					class="dock-resize"
					class:resize-left={side === 'left'}
					class:resize-right={side === 'right'}
					aria-label={`Resize animation dock from ${side}`}
					data-animation-tooltip="Resize dock width"
					on:pointerdown={(event) => beginResize(event, side as 'left' | 'right')}
					on:pointermove={moveResize}
					on:pointerup={() => (dockResize = null)}
					on:pointercancel={() => (dockResize = null)}
					on:keydown={(event) => resizeKey(event, side as 'left' | 'right')}
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" /></svg
					>
				</button>
			{/each}

			<div class="transport">
				<div class="step-strip">
					<div class="steps" class:scrollable={stepScrolling} on:wheel|nonpassive={scrollStepsWithWheel} role="group" aria-label="Animation steps">
						{#each orderedSteps as step (step.id)}
							<button
								animate:flip={{ duration: 160 }}
								type="button"
								data-step-id={step.id}
								aria-keyshortcuts={animation.steps.indexOf(step) < 9 ? String(animation.steps.indexOf(step) + 1) : undefined}
								class:active={step.id === animation.steps[stepIndex].id && !preview}
								class:dragging={stepDrag?.moved && stepDrag.id === step.id}
								on:pointerdown={(e) => beginStep(e, step.id)}
    on:dblclick={(event) => openStepMenu(event, step.id)}
    on:contextmenu={(event) => openStepMenu(event, step.id)}
								on:pointermove={moveStep}
								on:pointerup={endStep}
								on:pointercancel={() => {
									stepDrag = null;
									order = null;
								}}
								on:click={() => {
 if (!suppressStepClick) onstep(animation.steps.findIndex(item => item.id === step.id));
 }}
 aria-label={`Animation step ${animation.steps.indexOf(step) + 1}: ${step.name}`}
								aria-pressed={step.id === animation.steps[stepIndex].id && !preview}>{step.name}</button
							>
						{/each}
						{#if !readOnly}<button
								class="icon add"
								data-animation-tooltip={total >= 60 ? 'Max Length Reached (1 min)' : 'Add step'}
								aria-label="Add animation step"
								data-animation-shortcut={canAdd ? 'KeyN' : undefined}
								aria-keyshortcuts="Alt+Shift+N"
								disabled={!canAdd}
								on:click={add}><AnimationIcon name="plus" /></button
							>{/if}
					</div>
				</div>


				<button
					class="icon"
					data-animation-tooltip="Close animation editor"
					aria-label="Close animation editor"
					data-animation-shortcut="KeyA"
					aria-keyshortcuts="Alt+A"
					on:click={onclose}><AnimationIcon name="close" /></button
				>
			</div>
			<div class="strip playback">
				<div class="playback-timeline" role="group" aria-label="Playback timeline" on:pointerleave={() => (hoveredTimelineStep = null)}>
					<div class="progress-track" style={`--progress:${total ? (time / total) * 100 : 0}%`}></div>
					<input
						aria-label="Animation playhead"
						type="range"
						min="0"
						max={total || 1}
						step="0.01"
						value={time}
						style={`--progress:${total ? Math.min(100, (time / total) * 100) : 0}%`}
						disabled={!total}
						on:pointerdown={() => (keyboardSeeking = false)}
						on:keydown={() => (keyboardSeeking = true)}
						on:input={(e) => onseek(keyboardSeeking ? Number(e.currentTarget.value) : snapTime(Number(e.currentTarget.value)))}
					/>
					<div class="step-markers" role="group" aria-label="Timeline step starts">
						{#each animation.steps as step, index (step.id)}
							<button
								type="button"
								class="timeline-step"
                                class:marker-draggable={index > 0 && index < animation.steps.length - 1}
                                class:marker-dragging={markerDrag?.index === index}
								class:hovered={hoveredTimelineStep === step.id}
								data-animation-step-marker={step.id}
								style:left={`${total ? (stepTime(animation, index) / total) * 100 : 0}%`}
								data-animation-tooltip={step.name.toUpperCase()}
								aria-label={`Select ${step.name} at ${stepTime(animation, index)} seconds`}
								on:pointerdown={(event) => beginMarker(event, index)}
								on:pointermove={moveMarker}
								on:pointerup={() => endMarker()}
								on:pointercancel={() => endMarker(true)}
								on:lostpointercapture={() => endMarker(true)}
								on:click={() => { if (!suppressMarkerClick) onstep(index); }}><span class="step-square"></span></button
							>
						{/each}
						<button
							type="button"
							class="playhead-handle"
							aria-label="Animation playhead drag handle"
							disabled={!total}
							style:left={`${total ? (time / total) * 100 : 0}%`}
							on:pointerdown={beginPlayhead}
							on:pointermove={(event) => {
								if (draggingPlayhead) seekPointer(event);
							}}
							on:pointerup={() => (draggingPlayhead = false)}
							on:pointercancel={() => (draggingPlayhead = false)}
							on:keydown={(event) => {
								if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
									event.preventDefault();
									onseek(Math.max(0, Math.min(total, time + (event.key === 'ArrowLeft' ? -0.01 : 0.01))));
								}
							}}><span class="playhead-square"></span></button
						>
					</div>
				</div>
				<span>{time.toFixed(2)} / {total.toFixed(2)}s</span><button
					class="speed subtle"
					data-animation-tooltip="Playback speed"
					aria-label="Cycle playback speed"
					data-animation-shortcut="PlaybackSpeed"
					aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
					on:click={cycleSpeed}>{rate.toFixed(rate % 0.5 === 0 ? 1 : 2)}×</button
				>
    <button class="icon toggle" class:enabled={loop} aria-label="Loop playback" aria-pressed={loop} data-animation-tooltip="Loop Playback" on:click={() => loop = !loop}><AnimationIcon name="repeat" /></button>
			</div>

			<div class="strip footer" class:compact={panelWidth < 680}>
<div class="transport-center" role="group" aria-label="Timeline playback controls">
 <button class="icon" data-animation-tooltip="Start of Timeline" aria-label="Go to animation start" data-animation-shortcut="Home" aria-keyshortcuts="Home" disabled={time <= 0} on:click={() => onstep(0)}><AnimationIcon name="timeline-start" /></button>
 <button class="icon" data-animation-tooltip="Prior Step" aria-label="Previous animation step" data-animation-shortcut="KeyJ" aria-keyshortcuts="J Alt+Shift+ArrowLeft" disabled={preview ? time <= 0 : stepIndex <= 0} on:click={previousAnimationStep}><AnimationIcon name="start" /></button>
 <button class="icon" data-animation-tooltip="Rewind" aria-label="Rewind animation" disabled={!total || time <= 0} on:pointerdown={(event) => beginTransportScrub(event, -1)} on:click={(event) => { if (event.detail === 0) scrubTransport(-1); }}><AnimationIcon name="rewind" /></button>
 <button class="icon" data-animation-tooltip={playing ? 'Pause' : total > 0 && time >= total ? 'Restart' : 'Play'} aria-label={playing ? 'Pause animation' : total > 0 && time >= total ? 'Restart animation' : 'Play animation'} data-animation-shortcut="KeyK" aria-keyshortcuts="K Space" disabled={!total} on:click={onplay}><AnimationIcon name={playing ? 'pause' : total > 0 && time >= total ? 'reset' : 'play'} /></button>
 <button class="icon" data-animation-tooltip="Fast Forward" aria-label="Fast forward animation" disabled={!total || time >= total} on:pointerdown={(event) => beginTransportScrub(event, 1)} on:click={(event) => { if (event.detail === 0) scrubTransport(1); }}><AnimationIcon name="fast-forward" /></button>
 <button class="icon" data-animation-tooltip="Next Step" aria-label="Next animation step" data-animation-shortcut="KeyL" aria-keyshortcuts="L Alt+Shift+ArrowRight" disabled={preview ? time >= total : stepIndex >= animation.steps.length - 1} on:click={nextAnimationStep}><AnimationIcon name="end" /></button>
 <button class="icon" data-animation-tooltip="End of Timeline" aria-label="Go to animation end" data-animation-shortcut="End" aria-keyshortcuts="End" disabled={!total || time >= total} on:click={() => onstep(animation.steps.length - 1)}><AnimationIcon name="timeline-end" /></button>
</div>
 {#if !readOnly}<button class="subtle reset-animation" aria-label="Clear animation" disabled={animation.steps.length <= 1} on:click={onreset}><AnimationIcon name="reset" /><span>Clear Animation</span></button><button class="icon animation-tutorial" class:pulse-tutorial={tutorialAttention} aria-label="Start animation tutorial" data-animation-tooltip="Animation Tutorial" on:click={ontutorial}><AnimationIcon name="tutorial" /></button>{/if}
				{#if !readOnly}<button class="icon toggle" class:enabled={ghosts} aria-label="Show ghosts" aria-pressed={ghosts} data-animation-tooltip="Show Ghosts" on:click={() => ghosts = !ghosts}><AnimationIcon name="ghost" /></button><label class="step-duration" class:disabled={preview || !transition} on:pointerdown={(event) => { if (event.target !== durationInput && !preview && transition) { event.preventDefault(); durationInput?.focus(); durationInput?.select(); } }}>
 <AnimationIcon name="clock" /><span class="duration-label">Step Duration</span>
 <div class="duration-control">
 <input bind:this={durationInput} class="duration-number" aria-label="Step duration seconds" aria-keyshortcuts="Alt+T" type="number" min="0.1" max="60" step="0.25" disabled={preview || !transition} value={transition?.duration ?? 0} on:change={(event) => duration(Number(event.currentTarget.value))} on:keydown={durationKeydown} on:paste={durationPaste} on:input={durationInputChange} />
 <span aria-hidden="true">s</span>
 </div>
 </label>
					{/if}
			</div>
		</div>
{#if stepMenuId && !readOnly}
 <div data-step-menu data-animation-ui class="step-menu" role="group" aria-label="Step actions" style:left={`${stepMenuX}px`} style:top={`${stepMenuY}px`}>
  <button type="button" disabled={!canCreatePlay} on:click={() => stepMenuAction('create-play')}><AnimationIcon name="plus" /> Create Play from Step</button>
  <button type="button" disabled={!canDuplicate} on:click={() => stepMenuAction('duplicate')}><AnimationIcon name="copy" /> Duplicate</button>
  <button type="button" disabled={animation.steps.length <= minimumStepCount} on:click={() => stepMenuAction('delete')}><AnimationIcon name="trash" /> Delete</button>
 </div>
{/if}
	</HoverTooltip>
</div>

<style>
	.animation-panel{
		user-select: none;
		-webkit-user-select: none;
		background: #fff;
		background-image: linear-gradient(#f5f5f4f7, #f5f5f4f7), url('/svg/graph.svg');
		color: #1c1917;
		font-family: Inter, sans-serif;
		font-size: 11px;
		border: 1px solid #d6d3d1;
		box-shadow: 0 4px 18px #0003;
	}
	.animation-panel input{
		user-select: text;
		-webkit-user-select: text;
	}
	.animation-panel {
		width: min(720px, calc(100vw - 16px));
		height: 112px;
	}
	.animation-panel.positioned {
		position: fixed;
	}
	button.dock-resize {
		position: absolute;
		top: 0;
		width: 8px;
		height: 100%;
		min-height: 0;
		padding: 0;
		border: 0;
		background: transparent;
		z-index: 10;
		cursor: ew-resize;
		touch-action: none;
	}
	button.dock-resize.resize-left {
		left: -4px;
	}
	button.dock-resize.resize-right {
		right: -4px;
	}
	button.dock-resize svg {
		opacity: 0;
		flex-shrink: 0;
		background: white;
		box-shadow: 0 0 0 1px #d6d3d1;
		pointer-events: none;
	}
	button.dock-resize:hover,
	button.dock-resize:focus-visible {
		background: #1e90ff22;
		cursor: ew-resize;
	}
	button.dock-resize:hover svg,
	button.dock-resize:focus-visible svg {
		opacity: 1;
	}
	.animation-panel:focus,
	.animation-panel:focus-visible {
		outline: none !important;
	}
	button.icon:hover,
	button.dock-resize:hover,
	button.timeline-step:hover,
	button.playhead-handle:hover,
	button.speed:hover,
	.steps button:hover {
		border-color: transparent !important;
		outline: none !important;
	}
	button.toggle.enabled {
  color: #1e90ff;
 }
	.transport {
		display: flex;
		align-items: center;
		height: 44px;
		padding: 0 7px;
		gap: 5px;
		cursor: grab;
		touch-action: none;
	}
	.footer.compact .reset-animation span, .footer.compact .duration-label { display: none; }
	.transport-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  align-items: center;
		display: flex;
		flex-shrink: 0;
		gap: 5px;
	}
	.animation-panel {
		cursor: grab;
		touch-action: none;
	}
	.animation-panel:active {
		cursor: grabbing;
	}
	.strip {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 7px;
		padding: 7px 9px;
	}
	.playback {
  gap: 2px;
  padding-block: 0;
		height: 28px;
		flex-wrap: nowrap;
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}
	.playback-timeline {
		position: relative;
		flex: 1;
		min-width: 40px;
		height: 24px;
	}
	.playback-timeline input {
		display: block;
		width: 100%;
		margin: 0;
	}
	.progress-track {
		position: absolute;
		left: 6px;
		right: 6px;
		top: 10px;
		height: 4px;
		background: linear-gradient(to right, #1e90ff var(--progress), #d6d3d1 var(--progress));
		pointer-events: none;
	}
	.step-markers {
		position: absolute;
		left: 6px;
		right: 6px;
		top: 12px;
		height: 0;
		pointer-events: none;
		z-index: 2;
	}
	button.timeline-step,
	button.playhead-handle {
		position: absolute;
		top: 0;
		width: 18px;
		height: 18px;
		min-height: 18px;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		transform: translate(-50%, -50%);
		pointer-events: auto;
		touch-action: none;
	}
	.step-square {
		display: block;
		width: 8px;
		height: 8px;
		background: white;
		border: 1px solid #0069cc;
		pointer-events: none;
	}
	button.timeline-step:hover .step-square,
	button.timeline-step.hovered .step-square,
	button.timeline-step:focus-visible .step-square {
		background: #0069cc;
	}
	button.timeline-step {
		cursor: pointer;
	}
	button.timeline-step.marker-dragging {
		cursor: pointer;
	}
	button.playhead-handle {
		z-index: 4;
		width: 20px;
		height: 20px;
		min-height: 20px;
	}
	.playhead-square {
		display: block;
		width: 12px;
		height: 12px;
		background: #1e90ff;
		pointer-events: none;
	}
	button.playhead-handle:hover .playhead-square {
		background: #0069cc;
	}
	button.timeline-step:hover,
	button.playhead-handle:hover {
		background: transparent;
	}
	.playback input {
		flex: 1;
		min-width: 40px;
	}
	.step-strip {
		min-width: 0;
		flex: 1;
		overflow: hidden;
	}
	.steps {
		display: flex;
		align-items: center;
		gap: 5px;
		width: 100%;
		overflow-x: hidden;
		scrollbar-width: thin;
		scrollbar-color: #44403c #d6d3d1;
	}
	.steps.scrollable {
		overflow-x: auto;
	}
	.steps{
		scrollbar-width: thin;
		scrollbar-color: #44403c #d6d3d1;
	}
	.steps::-webkit-scrollbar{
		width: 8px;
		height: 8px;
	}
	.steps::-webkit-scrollbar-track{
		background: #d6d3d1;
		border-radius: 0;
	}
	.steps::-webkit-scrollbar-thumb{
		background: #44403c;
		border: 1px solid #d6d3d1;
		border-radius: 0;
	}
	.steps::-webkit-scrollbar-thumb:hover{
		background: #1c1917;
	}
	/* Chromium's standard scrollbar properties override the custom pseudo-elements. */
	@supports selector(::-webkit-scrollbar) {
		.steps{
			scrollbar-width: auto;
			scrollbar-color: auto;
		}
	}
	.steps button {
  letter-spacing: 0.06em;
		text-transform: uppercase;
		touch-action: none;
		user-select: none;
		max-width: 130px;
		overflow: hidden;
		text-overflow: ellipsis;
		flex-shrink: 0;
	}
	button,
	input:not([type='range']):not([type='checkbox']) {
		border: 1px solid #d6d3d1;
		border-radius: 0;
		min-height: 27px;
		padding: 3px 7px;
		font:
			600 11px Inter,
			sans-serif;
	}
	button {
		background: #1c1917;
		color: white;
		cursor: pointer;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
	}
	button:hover {
		background: #44403c;
	}
	button.active {
		box-shadow: none;
		color: #1e90ff;
	}
	button.dragging {
		opacity: 0.5;
		cursor: grabbing;
	}
	button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	button.icon,
	button.subtle {
		background: transparent;
		color: #1c1917;
		border: 1px solid transparent;
	}
	button.icon {
		flex-shrink: 0;
		width: 29px;
		height: 28px;
		padding: 0;
		font-size: 17px;
	}
	button.icon:hover,
	button.subtle:hover {
		border-color: #d6d3d1;
		background: #f5f5f4;
	}
	button.icon:not(:disabled):hover {
		background: #00000012;
		border-radius: 4px;
	}
	button.add {
		font-size: 24px;
	}
	.animation-tutorial { margin-right: auto; }
 @keyframes tutorial-attention { 0%,100% { background-color: transparent; } 50% { background-color: #00000012; } }
 button.pulse-tutorial { border-radius: 4px; animation: tutorial-attention 1.5s ease-in-out infinite; }
 @media (prefers-reduced-motion: reduce) { button.pulse-tutorial { animation: none; background-color: #00000012; } }
	.reset-animation {
		margin-right: 0;
	}
	.footer {
  position: relative;
		justify-content: flex-end;
		height: 40px;
		border-top: 1px solid #e7e5e4;
		flex-wrap: nowrap;
		padding-block: 4px;
		gap: 3px;
	}
	input[type='range'] {
		accent-color: #1e90ff;
	}
	input {
		color: #1c1917;
		background: #fff;
	}
	.playback button.icon {
  width: 24px;
  height: 24px;
  min-height: 24px;
 }
	button.speed {
		width: 40px;
		min-width: 40px;
		flex: 0 0 40px;
  padding-inline: 2px;
		font-variant-numeric: tabular-nums;
	}
	.playback input[type='range'] {
		appearance: none;
		height: 16px;
		background: transparent;
		border: 0;
		border-radius: 0;
		padding: 0;
		cursor: pointer;
	}
	.playback input[type='range']::-webkit-slider-runnable-track {
		height: 4px;
		border: 0;
		border-radius: 0;
		background: transparent;
	}
	.playback input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 12px;
		height: 12px;
		margin-top: -4px;
		background: transparent;
		border: 0;
		border-radius: 0;
	}
	.playback input[type='range']::-moz-range-track {
		height: 4px;
		background: transparent;
		border: 0;
		border-radius: 0;
	}
	.playback input[type='range']::-moz-range-progress {
		height: 4px;
		background: transparent;
		border: 0;
		border-radius: 0;
	}
	.playback input[type='range']::-moz-range-thumb {
		width: 12px;
		height: 12px;
		background: transparent;
		border: 0;
		border-radius: 0;
	}
	.duration-control {
		display: inline-flex;
		align-items: center;
		position: relative;
	}
	input.duration-number {
		width: 58px;
		min-height: 25px;
		padding: 2px 16px 2px 4px;
		text-align: center;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	input.duration-number::-webkit-inner-spin-button,
	input.duration-number::-webkit-outer-spin-button {
		appearance: none;
		margin: 0;
	}
	.duration-control span {
		position: absolute;
		right: 6px;
		pointer-events: none;
	}
	button:focus,
 button:focus-visible {
  outline: none !important;
  box-shadow: none !important;
 }
	input:focus-visible {
		outline: 2px solid #1e90ff;
		outline-offset: 2px;
	}
.step-duration { display: flex; line-height: 16px; cursor: text; align-items: center; gap: 1px; font-weight: 600; padding: 3px 7px; min-height: 27px; }
 .step-duration.disabled { opacity: .35; }
 .step-duration input:disabled { opacity: 1; }
 .step-duration input.duration-number {
  background: transparent;
  border: 0;
  width: 4.5ch;
  flex: 0 0 4.5ch;
  height: 25px;
  line-height: 21px;
  box-sizing: border-box;
  padding: 2px 0;
  text-align: right;
  outline: none !important;
  box-shadow: none !important;
 }
 .step-duration .duration-control span { position: static; margin-left: 1px; }
 .step-duration :global(svg) { margin-right: 3px; }
 button.subtle:not(:disabled):hover,
 .steps button:not(:disabled):hover,
 .step-duration:not(.disabled):hover {
  background: #00000012;
  border-radius: 4px;
  border-color: transparent;
 }
 .steps button:not(:disabled):hover { color: #1c1917; }
 .steps button.active:not(:disabled):hover { color: #1e90ff; }
.step-menu { position: fixed; z-index: 1002; width: 188px; padding: 4px; background: white; box-shadow: 0 0 0 2px #1c1917, 0 4px 12px #0002; }
 .step-menu button { display: flex; align-items: center; gap: 6px; width: 100%; height: 28px; border: 0; background: white; color: #1c1917; text-align: left; }
 .step-menu button:not(:disabled):hover { background: #00000012; border-radius: 4px; }
</style>
