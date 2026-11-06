# Shared play-builder controllers

For the living component inventory, future-sport UX parity requirements, remaining work, and running change log, read [Play-builder architecture](play-builder-architecture.md). Update that record whenever these contracts or shared behavior change.

The flag football builder uses the shared controllers and UI described below. The framework-independent controllers contain no sport definitions, field dimensions, artwork, or document-version assumptions. A sport supplies adapters; the existing flag football UI and document format remain intact.

## Clipboard and history

`src/lib/play-builder-controller.ts` owns bounded Undo/Redo stacks and the internal element clipboard.

- Supply `snapshot` and `restore` for the complete authoring state. The default cloning uses `structuredClone`, so snapshots and clipboard payloads must be data, not DOM elements or functions.
- Call `checkpoint` before a normal edit. `mutate`, `cut`, and `paste` capture their pre-edit state automatically; do not checkpoint again inside their apply callbacks.
- Apply callbacks are synchronous. Returning `false` means nothing was changed. Keep validation/preparation before mutation.
- Copy an opaque sport-specific payload with its source play ID, surface rectangle, and selection bounds. The controller calculates successive same-play offsets and field-relative cross-play placement. The adapter allocates IDs, remaps links, and handles sport-specific uniqueness rules.
- `onChange` exposes `canUndo`, `canRedo`, and `hasClipboard` for reactive UI. Clearing history preserves the clipboard.
- `exportHistory` and `restoreHistory` preserve history around the temporary tutorial play. Fullscreen spotlight history uses a separate instance so it cannot undo authoring changes.

## Selection and movement

`src/lib/play-builder-interaction-controller.ts` owns selection gestures and shared movement calculations.

- Targets are opaque. Supply their stable keys, existence checks, bounds, selection getter/setter, and marquee hit tests. Field-wide guides can use different hit rules from ordinary objects.
- `select` preserves an existing group when directly clicking one of its members. `selectForDrag` defers Shift-deselection until a click finishes, allowing a selected group to be dragged while Shift is held.
- Marquee sessions match pointer IDs. Selection ordering, bounds unions, hit regions, group containment, and bounded translations are shared.
- Movement sessions retain their initial pointer/geometry payload. The engine handles the drag threshold, first-move checkpoint, pointer identity, Shift angle constraints, Ctrl/Cmd bypass, finish, and cancellation. The adapter applies the resulting displacement to its objects.
- Supply an alternate angle origin for movement constrained from a previous animation pose. Drawings use the same movement engine with their existing radial angle behavior.
- `angleConstrainedPoint` handles straight route/drawing placement within a supplied viewport. `constrainTranslation` handles group/path bounds without knowing the sport's dimensions.
- Native pointer capture, football guide snapping, attached-arrow updates, element-specific bounds, and editor controls remain in the flag football adapter.

## Animation authoring and playback

`src/lib/play-builder-animation-controller.ts` owns the animation lifecycle and frame scheduling.

- Supply synchronous `read` and `write` adapters for animation/UI state. A subsequent read must immediately reflect the preceding write.
- Supply pure scene/animation cloning, edit capture, step evaluation, arbitrary-time evaluation, durations, and step times. Rendering and document contents stay sport-specific.
- `content` captures authoring edits only at a selected step. Preview scenes are never captured back into authored poses.
- `replace` checkpoints a change and selects its resulting step without overwriting a new pose with the previous visible scene.
- Open/close, commit, step selection, exact-boundary seeking, preview, pause, restart, looping, elapsed-time playback, and temporary forward/reverse shuttling are shared.
- `onStep` is an optional scene-application override. If supplied, it must apply the scene itself; flag football also preserves valid selections there. `onPreview` and `onOpen` handle tool/editor UI cleanup.
- `editable` protects authoring operations while leaving shared-link playback available. The presentation shell controls whether its read-only dock is open.
- `shuttle(direction, speed = 2)` accepts authored seconds per real second, preserves playing/paused state, and restores the configured playback rate on release. Keyboard adapters pass the selected preview rate for plain arrows and 2 for Shift+arrows; transport buttons retain the default 2. The keyboard scrubber receives `rate` and `change` callbacks; held keys do not issue discrete seeks.
- The controller owns its animation-frame handle and cancels it on pause/disposal. An injectable clock makes timing deterministic in tests.

## Shell, plays, exports, and presentation

- `BuilderActionBar.svelte` owns the existing corner layout, scaling, and container breakpoints. Pass sport-specific actions as slot content; do not recreate button layouts in a new sport. `BuilderExportControls.svelte` owns the image/video dropdowns, progress/cancel states, Options and Go Full buttons. The adapter supplies export callbacks, counts of eligible plays, authentication decisions, and disabled states; exporting itself remains in the existing pipeline.
- `BuilderPlayTabs.svelte` renders the established tabs, selected style, Add button, overflow, and reorder animation. IDs are stable numbers and names are supplied by the host. Bind `strip` for hit testing/scrolling. The existing play-options menu is slot content inside the same positioned wrapper.
- `play-builder-reorder-controller.ts` owns the horizontal drag threshold, pointer identity, preview order, cancellation, and click suppression. Supply IDs, hit/capture/edge-scroll callbacks, and a commit callback. Only commit checkpoints history and persists the reordered plays; the preview must not mutate the document or switch the active play. Shared tabs apply a global grabbing cursor during the moved gesture and remove it on completion/cancellation/teardown.
- `BuilderPresentationControls.svelte` owns Laser/Clear/Exit Full; `BuilderPlaybackControls.svelte` owns viewer/presentation Start, Play/Restart, speed, loop, and the optional presentation timeline button. Supply state and callbacks. These components never edit scenes.
- `play-builder-presentation-controller.ts` owns the native fullscreen request/exit lifecycle. `prepare` synchronously captures opaque restoration state and enters the read-only UI; `failed` restores after a rejected request; `leave` restores after `fullscreenchange`. The sport adapter pauses playback, commits edits, clears tools/selections, and restores the selected step. Call `sync` from the fullscreen event.
- `BuilderAnimationDock.svelte` owns the fixed portal, stacking, visibility and bounds. Supply `fullscreenRoot` during presentation, otherwise it portals to `document.body`. Its child animation panel retains the existing drag/resize or read-only fixed presentation behavior.

## Laser, spotlight, and authored drawing tools

- `play-builder-annotations.ts` exports the shared transient types, stroke/trail geometry, fade visibility, and `createAnnotationController`. `read`/`write` expose the complete transient state synchronously, as with the animation controller. Keep these objects out of the sport document.
- The controller owns pointer-matched sampling, laser/spotlight stroke completion, clear/release fade behavior, and frame scheduling. Inject a clock plus native capture/release and layer-promotion callbacks. Dispose it on unmount. History checkpoints are tagged `laser` or `spotlight`; flag football routes spotlight checkpoints to its independent presentation history when fullscreen. Presentation laser marks do not checkpoint authoring history.
- `BuilderAnnotationOverlay.svelte` renders the shared laser, trail and spotlight masks with the existing export-exclusion markers. Supply surface `width`/`height`, palette paint functions, pointer/tool visibility, and transient state. It does not capture authoring poses or create animatable objects.
- The overlay raises its SVG layer after insertion/mode changes, so spotlight dimming covers all artwork immediately without requiring pointer motion. Shift+L explicitly activates the regular laser and exits spotlight mode; Ctrl/Cmd+Shift+L remains the spotlight toggle.
- `BuilderDrawingTools.svelte` owns the drawing shape, thickness, palette, Erase and Clear UI. Bind its selection values and supply a generic color palette, actual keycaps, color-navigation handler, and guarded clear callback. It preserves the compact-height layout.
- `play-builder-drawing-controller.ts` owns authored stroke sampling/completion, minimum straight-line length, and protection against stale pen-up coordinates. The host supplies the constrained pointer point and persists the completed stroke with its own IDs/color, history, layers, and animation pose. Existing shared movement/selection controllers handle moving drawings; football's drawing-animation evaluator still needs model adaptation for another sport.
- Its `crayonCursor(color)` creates the shared color-aware drawing cursor. Use the selected palette value; the wrapper uses that color and both tips use a pale overlay. All sports should reuse this artwork rather than introduce a different drawing cursor.
- Keep the annotation layer above artwork when reordering/restoring layers, including history restoration; do not place it back under selected ghost artwork. The overlay's state-driven raising also responds to spotlight-stroke changes.

## Element-editor framework

- Call `provideElementEditors()` once during builder initialization. Each editor component calls `useElementEditor()` during initialization and applies that action to its existing root. This shares viewport placement/dragging through `play-builder-popover.ts`, without adding a visual wrapper or changing sport-specific fields.
- Supply `close` and declared `capabilities` (`label`, `color`, `motion`, `remove`, `revert`). The per-builder coordinator closes the previous editor on activation. Its lease ensures an old editor's delayed destruction cannot unregister the new one. Separate builders have separate coordinators.
- For self-contained editors, `outside: true` adds shared outside-click/Escape dismissal; `ignore` supplies permitted targets such as drawings and tutorial popovers. Existing football inline editors retain their current host commit/outside behavior and use the shared action for dragging and exclusivity.
- `ElementNameInput.svelte` shares bound names/input references and keyboard forwarding; pass the existing name limits, labels, placeholder, and appearance. `ColorSwatchPalette`, `LineFormatControls`, and `ElementEditorModes` remain the common color/style and one-way Element/Animation controls.
- `ElementActionButton.svelte` owns Delete/Revert pointer handling, custom below-left tooltips, and hover inversion. The host supplies capability checks, position containers, labels, icons, and mutation callbacks. This preserves element and drawing variants without copying their behavior.
- Pass `onall` only when later poses exist to enable its compact split menu. The primary/current-only action invokes `onactivate`; the future-steps action invokes `onall`. The sport adapter owns the atomic history transaction, origin geometry and visibility updates. Menus close on outside clicks/Escape and portal into the active fullscreen surface or document body.
- Supply the total selected `count` for This/These menu wording. Shared action tooltips show DELETE/BACKSPACE keycaps. Escape dismisses the menu and clears the selected objects/drawings.
- Sport geometry, editable fields, valid animation types, and mutation/persistence remain adapter responsibilities. The existing football marker/guide/path and drawing-motion data models are not a generic basketball schema.

## Color and tooltip conventions

- `play-builder-color.ts` uses `perceptualColorTransition` to decode sRGB, linearly blend OKLab lightness/opponent coordinates, and convert back to sRGB with bounded display channels and exact endpoints. Use it in every sport evaluator and export renderer. Jump timing continues to choose endpoints rather than rotating through intermediate hues.
- `fabricTintMatrix` tints reference fabric artwork while preserving neutral outlines/highlights. Render one image, not source/destination opacity layers. The browser and server renderer use the same matrix.
- `HoverTooltip` has an optional `dismissOnClick` latch for dropdown triggers. Once clicked, its tooltip stays hidden until pointer exit/re-entry, including when the pointer moves within the trigger.

## Verification

Controller unit tests use opaque selection/state types and a fake playback clock. Browser regressions exercise the real flag football adapter: mixed groups and drawings, snapping modifiers, Undo/Redo, independent step destinations, tutorial restoration, shared links, saved reloads, and image/video exports.

Keep new shared behavior in the controllers and new sport rules in adapters. Adding another sport should not require copying the flag football component or importing its rules into these modules.


## Animation dock preferences and export holds

- `play-builder-dock-preference.ts` stores only locked dock geometry in browser storage (`caseplay-animation-dock-v1`). Invalid or unavailable storage falls back safely. This is UI state, excluded from documents, history, dirty state, and database persistence.
- `AnimationPanel` restores locked position/width, clamps to the viewport, and disables dragging, resizing, and automatic width growth until unlocked. Presentation mode remains fixed and does not overwrite the preference.
- `play-builder-video-timing.ts` adds one second of final-pose frames at the output frame rate. The browser exporter renders the exact endpoint once and reuses it for that hold, including batch exports. Authored duration and preview playback remain unchanged.
- `AnimationOverlay` tracks route/ghost artwork placements and repairs their destinations after SVG layer replacement. A component-local child-list observer disconnects when all placements are destroyed; detached or disposed homes cannot reinsert artwork.

- `MarkerArtwork` keeps attached image labels hidden until the SVG image loads; parent opacity/scale still controls the complete Jump transition. Keep marker instances keyed by stable IDs when their visibility changes between steps.

- The animation controller owns the one-second real-time loop endpoint hold. It is transient playback state, not an authored pause; pause/seek/shuttle cancel it. Reuse this controller for editor, shared viewing, and presentation playback.

- `PlayClockArtwork` is a reusable SVG clock square; the football adapter attaches it to the LOS label. `playBuilderPlayClockSeconds` owns field defaults and deterministic elapsed-time evaluation. The visibility toggle is document state; clock countdown is derived preview state, not a saved edit.

- Drawing tracks may target Start to author the first outgoing transition. Default Start artwork stays visible unless explicitly authored otherwise; a drawing absent from the destination is removed at that boundary rather than on the first playback tick. Ghost selection supplies previous-pose geometry to shared action controls.
- Play Clock visibility uses an opt-out setting bit for compatibility with older documents; optional initial seconds are validated integers from 0–99. Clock input event isolation must not open guide properties, and export output uses SVG text rather than the editing input.

- `firstBallMovementTime(scene, animation)` derives the play-clock stop time. Clamp clock elapsed time to this value in preview and exports; never modify authored clock settings or apply the stop to the game clock. The football adapter owns this sport-specific rule.
