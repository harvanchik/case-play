# Play-builder architecture and future-sport parity record

Last updated: **2026-11-05**.

This is the living handoff for the play-builder family. Read it before implementing basketball or changing shared builder behavior. It records what exists, what is reusable, what still needs adaptation, and the experience future sports must retain. Source code is authoritative; update this record alongside changes rather than allowing it to become an older design proposal.

## Product direction and scope

The user wants additional sports to feel like the same application with a different sport surface and sport-specific tools. Animation, editing conventions, presentation, and shared controls should stay consistent. A fix or enhancement to shared functionality should benefit every sport through one implementation.

**Current implementation:** flag football only. Basketball, Soccer, Volleyball, Floor Hockey, and Softball are disabled Coming Soon navigation entries. There is no basketball route, court renderer, element set, or completed basketball builder in the inspected checkout/remote branches. A shared-code refactor is not permission to start one.

Do not create basketball by copying `FlagFootballPlayBuilder.svelte`. Do not create a second animation doc or independent clipboard/history/playback implementation. Extract remaining common behavior when needed, connect flag football to it first, and supply sport-specific adapters.

## Start here in a future session

1. Read this record and [the controller contracts](play-builder-shared-controllers.md).
2. Inspect `git status` and the current implementations; this record describes implemented working-tree changes, not a guarantee they have all been committed.
3. Use `src/lib/components/FlagFootballPlayBuilder.svelte` as the integrated behavior reference, not a template to duplicate.
4. Check the reuse classifications below. A file being under `components/play-builder` does not prove that its logic or types are sport-neutral.
5. Keep shared appearance and interaction behavior; obtain decisions for genuinely sport-specific rules and defaults when implementation requires them.
6. Verify the existing flag football flows after moving shared behavior. Add a second sport only when explicitly requested.

## Architecture inventory

### Implemented sport-neutral controllers

| Module | Responsibilities | Integration boundary |
| --- | --- | --- |
| `src/lib/play-builder-controller.ts` | Bounded Undo/Redo; immutable snapshots; clipboard copies; cut/paste history; repeated same-play paste offsets; relative placement across play surfaces; history suspension/restoration | Sport supplies authoring snapshots and opaque clipboard payloads. Adapter allocates IDs, remaps links, and handles object-specific uniqueness rules. |
| `src/lib/play-builder-interaction-controller.ts` | Selection and ordering; group bounds; marquee sessions; deferred Shift-deselection; drag thresholds and lifecycle; pointer identity; angle constraints; modifier bypass; bounded translation | Sport supplies target keys, existence/bounds/hit tests, geometry payloads, movement application, and native pointer capture. `createMovementController` is also used for drawing movement. |
| `src/lib/play-builder-animation-controller.ts` | Step/preview lifecycle; edit capture versus evaluated preview; open/close; commit/replace; step selection and seeking; elapsed-time playback; loop/restart/pause; temporary shuttling; frame cleanup | Sport supplies scene/animation types, clone/capture/evaluation functions, durations, step times, scene application, and editor/preview hooks. Clock injection supports deterministic tests. |
| `src/lib/play-builder-reorder-controller.ts` | Play-tab drag threshold, pointer identity, preview order, cancel/commit, click suppression | Host supplies stable IDs, DOM hit testing/capture/edge scroll, and history-aware persistence. |
| `src/lib/play-builder-presentation-controller.ts` | Native fullscreen entry/exit, failed-request recovery, restoration lifecycle | Host supplies the surface root, native browser API, and opaque authoring restoration state. |
| `src/lib/play-builder-annotations.ts` | Transient laser/spotlight gestures, sampling, fade lifecycle, geometry, frame cleanup | Host supplies synchronous state, palette paints, pointer capture, injected clock, and history routing. No sport document or field dimensions are embedded in the controller. |
| `src/lib/play-builder-drawing-controller.ts` | Authored drawing sampling/completion and stale pen-up protection | Host supplies constrained points, minimum length, identity/color, persistence and animation integration. |
| `src/lib/play-builder-editor-controller.ts`, `src/lib/play-builder-element-editor.ts` | Per-builder exclusive editor leases, capability declarations, shared drag/placement action and optional outside/Escape dismissal | Sport supplies editor fields, commit/close callbacks, capability checks and element anchors. Svelte context/action lives in the second module; the coordinator itself is framework-independent. |

Flag football **already uses these controllers**. Its fullscreen spotlight history uses a separate instance of the shared history controller. Framework-independent controllers do not import football rules, field sizes, artwork, or Svelte components. They accept sport-specific data through adapters.

Keep these contracts synchronous where documented: reads must immediately reflect writes. History snapshots and clipboard data must be cloneable authoring data, not DOM nodes. Do not capture rendered preview scenes back into authored poses. Detailed callback and transaction semantics are in the controller-contract guide.

### Shared UI and utilities to reuse

Paths in this table are relative to `src/lib/`.

| Existing code | Reuse guidance |
| --- | --- |
| `components/play-builder/BuilderActionButton.svelte` | Shared white square action button, label/icon, disabled/busy states, tooltip/keycaps. |
| `components/PublicSiteFooter.svelte` | Shared site footer with the current application version from `package.json` immediately after Privacy Choices; retain it for future sport pages. Commit versioning follows `docs/versioning.md`. |
| `components/play-builder/BuilderActionBar.svelte`, `BuilderPlayTabs.svelte` | Shared corner bar layout/scaling and actual play-tab controls/overflow/reorder animation. Slot sport-specific actions and existing play options instead of rebuilding the shell. |
| `components/play-builder/BuilderExportControls.svelte` | Standard image/video menus, eligible-play counts, progress/cancel, Options and Go Full. Export callbacks and authentication decisions are supplied by the host. |
| `components/play-builder/BuilderPresentationControls.svelte`, `BuilderPlaybackControls.svelte`, `BuilderAnimationDock.svelte` | Shared presentation/viewer controls and animation-doc portal, stacking and placement. Supply playback state/callbacks; the existing panel continues to render timeline contents. |
| `components/play-builder/BuilderAnnotationOverlay.svelte`, `BuilderDrawingTools.svelte` | Shared transient laser/spotlight rendering with injected surface dimensions, and generic authored drawing palette/tools. Temporary marks remain excluded from exports and documents. |
| `components/play-builder/ElementNameInput.svelte`, `ElementActionButton.svelte` | Shared bound name field and Delete/Revert behavior, tooltips and hover styling. Sport supplies field limits, placement, icons, capabilities and mutations. |
| `components/HoverTooltip.svelte` | Custom cursor/focus-aware tooltips, keycaps, and fullscreen-aware portal. Reuse instead of native title tooltips. |
| `components/play-builder/DropdownChevron.svelte` | Existing icon and open/close rotation; use for related dropdowns. |
| `components/play-builder/BuilderToggleCard.svelte`, `ModalCloseButton.svelte` | Shared toggle-card/modal visual conventions. |
| `components/play-builder/LineFormatControls.svelte`, `ColorSwatchPalette.svelte` | Reusable color/style palettes. Supply the sport's palette and actual shortcut keycaps. |
| `components/play-builder/TransitionDuration.svelte` | Inline seconds editor with suffix, limits, and normal/fine keyboard increments. |
| `play-builder-keyboard-scrub.ts` | Shared held-arrow scrubbing/shuttle behavior with injected timeline callbacks. |
| `play-builder-color.ts` | Perceptual OKLab color blending and neutral-preserving fabric tint matrices, shared by browser and export rendering. |
| `play-builder-definition.ts` | Existing generic sport/tool metadata types. This is a small palette contract, not a finished sport-plugin or renderer interface. |
| `play-builder-watermark.ts`, `play-builder-watermark-guard.ts` | Geometry fitting and casual DOM-edit repair; restore the authored mark before export. This does not make a browser-controlled watermark tamper-proof. |
| `play-builder-video-batch.ts` | Bounded parallel export orchestration, ordering, cancellation, and cleanup. |

### Existing reusable building blocks with remaining coupling

Reuse and adapt these centrally; do not copy them into basketball-specific alternatives.

| Existing code | What still needs attention |
| --- | --- |
| `components/play-builder/AnimationPanel.svelte`, `AnimationTiming.svelte`, `AnimationOverlay.svelte` | Established animation UI and route editing. They still use the current scene/animation model, target names, and some football-specific controls. Parameterize supported targets/options/render hooks where necessary. |
| `components/play-builder/DrawingAnimationPicker.svelte`, `DrawingStylePicker.svelte`, `ElementEditorModes.svelte` | Existing editor UX; some callback/data types still depend on the current model. Share the UI while adapting data contracts. |
| `components/play-builder/ExportDropdown.svelte` | Shared export menu/progress/cancel UX; format lists and eligible-play counts come from the host. |
| `play-builder-popover.ts` | Shared dragging and placement machinery. Current DOM conventions include arrow ink and cross-field-line anchors; adapt those conventions rather than duplicating placement code. |
| `play-builder-animation.ts`, `play-builder-drawing-animation.ts` | Pure deterministic evaluation and authoring helpers, but the current poses/attachments/downs/scene types retain football assumptions. The generic animation controller injects these functions; it does not eliminate that model coupling. |
| `play-builder-rendering.ts`, `components/play-builder/ArrowArtwork.svelte`, `DrawnArrow.svelte`, `MarkerArtwork.svelte` | Geometry and artwork building blocks; current arrow kinds, asset selection, ball artwork, and player representations are football-oriented. Supply renderer capabilities/assets instead of mapping basketball to football artwork. |
| `play-builder-export.ts`, `play-builder-browser-video.ts` | Existing canvas/image/PDF/client-video machinery. Supply the sport surface and deterministic frame rendering; preserve current UI and free client-side processing. Some DOM selectors and surface treatment still assume the football diagram. |
| `play-builder-animation-tutorial.ts` and tutorial integration in the football component | Reuse tutorial structure/visuals and temporary-play lifecycle; lesson content, targets, and demonstrations need sport-appropriate hooks. |
| Football integration in `FlagFootballPlayBuilder.svelte` | Now consumes shared shell/presentation, annotation/drawing, and editor framework components. Sport-specific toolbar definitions, scene mutation, setup/settings forms, preferences persistence, editor contents and tutorial lessons still need formal sport adapters. Do not copy the remaining host into a new sport. |

## UX and behavior parity baseline

The following are implemented reference behaviors, not a proposal for separate basketball versions. Reusing the same UI/controllers is the preferred way to retain them. Sport-specific tool labels, assets, court geometry, and rule choices may differ.

### Visual and interaction conventions

- Preserve existing button/icon sizes, spacing, borders, typography, hover/focus states, inline editors, and popover conventions.
- Animation doc uses a light graph/grid background and Dodger Blue `#1E90FF` accent. Shared labels/tooltips use the established title-case conventions; step names display uppercase.
- Keyboard focus uses the existing inset square blue treatment where appropriate; ordinary pointer clicks should not produce keyboard-focus borders. Reuse custom tooltip/keycap behavior.
- Double-click and right-click open equivalent editors/options. Direct element click behavior, drawing color editing, and separate animation editing remain consistent.
- Element popovers are draggable temporarily and constrained to the viewport. Ordinary element anchors are centered below the actual element/ink when space permits. Cross-field lines use side placement with cursor-relative vertical position; do not apply that football rule to all court objects.
- Plays support horizontal drag reordering, selected-only bold/darker appearance, and uniform play/add button dimensions.

### Selection, clipboard, and history

- Single selection, additive selection, marquee selection, and mixed groups include drawings. A marquee selecting one element still shows its selection boundary; direct clicking does not need that boundary.
- Group movement moves every selected object and drawing. Attached arrows and special-axis objects are handled by the sport adapter.
- Shift constrains movement to the existing angle behavior; Ctrl/Cmd bypasses snapping. Animation movement can constrain from the previous-step origin, while custom routes and ordinary groups use their drag origin. Do not replace these with conflicting placement shortcuts.
- Ctrl/Cmd+A selects field elements when the builder is focused and no text input is active. Native selected-text copying must continue working.
- Copy/cut/paste remaps identity and links. Same-play paste offsets slightly down/right, with bounds handling; cross-play paste preserves field-relative placement.
- Undo/Redo covers authoring changes, animation operations, group/drawing edits, and temporary spotlight drawing/clearing. The tutorial must restore pre-tutorial authoring history.

### Animation authoring

- Static editing is the default. Opening Animate selects the normal cursor rather than leaving an element ready to place.
- Start is a still formation with disabled `0s` step duration. Later steps own their incoming movement/duration; the interval between Start and Step 2 belongs to Step 2.
- New steps append to the end and copy the last step. Current defaults/limits are 1-second transitions, 60 authored seconds, and up to 61 steps including Start. Keep these product limits in the shared model/policy layer rather than embedding football assumptions in the generic controller.
- Earlier pose edits do not silently change later destinations. New objects appear in their authored step and in subsequently copied steps, without being inserted into already-authored later steps.
- Deletion hides an element from that step onward under the current editing rules. Ghosts/revert affordances follow the existing element capabilities.
- Ghosts stay faded. Selected ghosts/routes can render above other elements without making ghosts opaque. Playback does not display editor ghosts.
- Keep existing route/easing/timing controls, element speed/window linkage, inline departure/arrival seconds, fine increments, and transition-effect duration controls. Available path/transition types depend on the element's capabilities.
- Keep color transitions, step-dependent labels/names, drawing movement/reveal/instant behavior, arrow reveal/morph behavior, and their existing timing/easing semantics. Replace football-only terminology with sport-specific capabilities, not a second animation system.
- Between steps, authoring tools and duration editing are disabled while drawing/laser behavior follows the existing allowed modes. Playback/scrubbing must not dirty the authored document.
- The floating doc supports constrained dragging/resizing, width growth up to the automatic limit, horizontal overflow/wheel scrolling, step reordering, compact step options, and inline duration editing. Reuse it rather than redesigning the basketball editor.

### Playback and shortcuts

- Preserve play/pause, start/end, previous/next step, rewind/fast-forward, speed cycling/reverse cycling, loop, scrubber snapping, and keyboard operation.
- Existing core bindings include Space/K play-pause, J/L previous/next step, Home/End endpoints, 1-9 step selection, comma/period 0.01-second scrubbing, and Ctrl/Cmd+Left/Right previous/next step.
- Held Left/Right arrows move backward/forward at the selected playback rate, whether paused or playing, without an initial discrete jump. Shift+arrows use 2x authored speed; adding/removing Shift while holding an arrow changes speed immediately. Releasing resumes the prior playing/paused state. Comma/period remain discrete 0.01-second seeks. Alt+A toggles the animation doc; Alt+Up/Down adjusts playback speed.
- F11 enters/exits native builder fullscreen. Preserve text-input exemptions, tutorial restrictions, saving guards, and editable versus viewing modes.
- Tool-key plus palette number chooses that tool's color; the bare tool shortcut keeps its current color. Laser uses Shift+L+1-4. Tooltip keycaps must describe the actual bindings. K/L color chords coexist with their animation shortcuts.
- Sport-specific tool bindings must avoid collisions with shared controls. Use the current definitions/handlers as the authoritative full binding list.

### Presentation, laser, spotlight, and tutorials

- Fullscreen uses the actual diagram area without page chrome, authoring/export buttons, or the surrounding page background. Laser/Clear are top-left; Exit Full is top-right. Plays remain bottom-left and viewing controls bottom-right.
- Fullscreen Animate opens a fixed bottom-right read-only timeline, replacing its small playback controls. It cannot be moved/resized or used to edit authored poses/durations.
- Laser is temporary, independent of steps, and usable while paused between steps or playing. Clear and leaving the tool follow the existing fade/cleanup behavior. Rapid clicking supports the existing rainbow mode.
- Spotlight is the extra laser-palette square, toggled with Ctrl/Cmd+Shift+L. It has a soft circular cursor opening, Shift+wheel resizing, and persistent painted highlights.
- Spotlight openings combine without putting a ring/darkening inside an already lit region. C clears highlights while keeping the field dimmed until the tool is exited. Temporary marks are excluded from saves, animation data, and exports.
- Reuse the tutorial framework/UI. Animation tutorial creates a default temporary play named Tutorial and removes it on completion/exit, restoring the user's state/history. Teach steps and movement before advanced features, and provide sport-appropriate examples.

### Persistence, viewing, and export

- Keep anonymous browser edit-token ownership, reload/browser-return edit access, signed-in ownership/claiming, local drafts, autosave feedback, saved-link viewing, and duplicate-to-edit behavior.
- Save locks prevent conflicting actions while a snapshot is in flight. Playback and temporary laser/spotlight marks do not create authored changes.
- Shared viewers have playback/step navigation but no editing cues or editable objects. Preserve the existing layout and controls for shared viewing and presentation.
- Reuse image/video split dropdowns, ALL controls, progress/cancel treatment, filename conventions, and export settings. Multiple images/videos use ZIPs; PDF uses one play per page.
- Video eligibility is based on animated plays, not total play count: omit static plays and show ALL only for multiple animated plays. Video processing stays client-side and free, with production sign-in requirements and the existing localhost exception.
- Authored timing, not preview slow motion, controls video exports. Preserve deterministic evaluation, cancellation, state restoration, parallel batch behavior, and supported-format fallbacks.
- A new surface must render correctly in browser, thumbnails/social previews, image/PDF, and video. Start is the thumbnail/social formation. Basketball must render court treatment, not accidentally inherit grass or football assets.
- Keep the watermark and its export restoration behavior across surfaces. Browser-owner tampering cannot be made impossible; do not describe the repair action as a security guarantee.

## Football-specific behavior that stays outside generic controllers

- A/B/K/R defaults and custom letters, footballs, penalty flags, bean bags, flag belts, R/L/F/B official artwork/names, and football formation rules.
- Traditional, four-on-four, Unified, and NFL Flag layouts, yard coordinates, sidelines/end zones, line of scrimmage, line to gain, downs, and field markings.
- Default, 3rd/4th, Goal Line, Reverse GL, and Punt setup mechanics; official out-of-bounds movement and guide/yardage snapping.
- Football pass-placement shortcut, receiver eligibility, ball offset, curved-flight treatment, shadows, and football-specific attachment/rendering details. A basketball pass shortcut may share orchestration while supplying its own rules/artwork.
- Surface-specific colors/patterns, labels, team boxes, and setup defaults. Shared preferences/shell work must not hardcode grass into a basketball renderer.

## Remaining architecture work before exposing another sport

These items are **not completed** merely because the controllers exist:

1. Introduce a formal sport adapter for surface rendering, available elements, inspector capabilities, settings, setups, and export artwork. Current generic metadata is smaller than this contract.
2. Reuse the extracted shell/presentation/laser/spotlight/play-management/editor units. Formalize remaining toolbar definitions, settings/preferences persistence and sport editor contents through adapters. Retain the existing component appearance; the generic shell is not yet a complete sport-registration API.
3. Make persistence explicitly sport-aware. Current `play-builder-scene.ts` version 7 and validation still describe football scenes. Preserve legacy static v1-v6 and existing animated v7 documents; do not reinterpret them as another sport or silently change their format.
4. Adapt the pure evaluator/scene model and animation components where they assume football kinds, guides, downs, or ball artwork. Keep reusable timing/path behavior in shared code.
5. Route the correct surface/renderer through browser rendering, shared links, account/library thumbnails, social images, and every export path. Existing save endpoints should be reused where appropriate rather than copied per sport.
6. Only after these contracts work for flag football, implement explicitly authorized basketball rules, court choices, tools, assets, setups, and lessons. Obtain sport/ruleset decisions when needed; no basketball implementation has been authorized by this documentation task.

## Verification baseline and known limitations

Latest shared-UI/refactor completion checks recorded on 2026-11-05:

- 75 unit tests passed; one optional FFmpeg/server-video integration test skipped.
- 36 focused Chrome scenarios passed across the run and focused retries, including annotation/drawing tools, timing, editor exclusivity, group/future-step operations, save/reload, fullscreen, clipboard and play reordering. Seven WebKit scenarios also passed, including all four new animation/selection regressions.
- All nine before/final screenshot comparisons were pixel-identical: static field, plays, element editor, animation doc, movement routes/ghosts, motion editor, laser palette, spotlight and fullscreen.
- Svelte/type checking reported 0 errors and 0 warnings. The prior full Chrome run had 68 passes, one opt-in visual harness skip, and three timeouts; all three timed-out scenarios subsequently passed. One older drawing-effect fixture was corrected to actually move the drawing before requesting animation options, matching the established unchanged-element behavior.

Earlier broader baseline recorded on 2026-11-04:

- 65 unit tests passed; one optional FFmpeg/server-video integration test skipped.
- 58 Chrome browser cases and 7 WebKit cases passed, covering existing animation, mixed selections/drawings, snapping, clipboard/history, tutorial cleanup, save/reload/shared duplication, and exports.
- Real client MP4, MOV, WebM, GIF, image ZIP, and multi-page PDF outputs were exercised, including restoring the selected editing state afterward.
- Svelte/type checking reported 0 errors and 0 warnings.
- Production client/server compilation succeeded. Final local Vercel packaging failed with Windows symlink `EPERM`; a complete deployment-package build is not verified by that local run. Do not claim a new Vercel deployment was verified.

These are dated results, not a promise that later edits have already been tested. Repeat the relevant checks after behavioral changes. Browser pointer-coordinate tests allow native pixel rounding; controller math uses deterministic unit tests. Local browser tests use the disposable `caseplay-animation-test.db`, not production data.

Relevant test entry points:

- `tests/play-builder-controller.test.ts`
- `tests/play-builder-interaction-controller.test.ts`
- `tests/play-builder-animation-controller.test.ts`, `tests/play-builder-keyboard-scrub.test.ts`
- `tests/play-builder-animation.test.ts`, `tests/play-builder-motion-updates.test.ts`, `tests/play-builder-arrow-animation.test.ts`
- `tests/browser/play-builder-animation.spec.ts`, `tests/browser/presentation-clipboard.spec.ts`
- `tests/browser/animation-motion-updates.spec.ts`, `tests/browser/animation-label-popovers.spec.ts`
- `tests/browser/arrow-animation.spec.ts`, `tests/browser/arrow-draw-pass.spec.ts`, `tests/browser/arrow-placement-editors.spec.ts`
- `tests/browser/browser-video.spec.ts`, `tests/browser/batch-exports.spec.ts`

## Running change log

### 2026-11-05 — Application version tracking

- Established `package.json` version `1.1.0` as the shared footer's version source, displayed immediately after Privacy Choices. Added missing shared footers to login/admin/preview/redirect pages and error-layout fallback coverage.
- Added `docs/versioning.md`, `CHANGELOG.md`, version-bump commands, and repository instructions requiring a SemVer increase for every subsequent commit, including each commit in a batch. Future sport pages reuse the shared footer and version source.
- Verification: browser coverage checked one footer and adjacent version text across 11 routes; Svelte/type checking reported 0 errors and 0 warnings.

### 2026-11-05 — OKLab blending and play-reorder cursor

- Replaced HSL color-wheel interpolation with shared `perceptualColorTransition`: decode sRGB, interpolate OKLab coordinates, convert back to displayable sRGB. Exact endpoints and Jump cuts remain unchanged. `fabricTintMatrix` retains single-image fabric tinting and neutral details. All preview/export and drawing/object consumers use the same implementation.
- Shared play tabs show grabbing across the page during an active reorder gesture, restoring normal cursors on drop, cancellation, blur, and component teardown.
- Unit tests cover known OKLab midpoints, neutrals, endpoint clamping, symmetry and fabric tinting. Verification: 77 unit tests passed (one optional FFmpeg integration skipped), four Chrome/WebKit browser checks passed for cursor restoration and actual player/drawing/fabric colors, and Svelte/type checking reported 0 errors and 0 warnings.


Entries describe implementation milestones, not assumed Git commits. Consult Git history for commit IDs. Add new entries here in the same task as shared changes; update the affected sections above rather than only appending history.

### 2026-11-04 — Shared shell, annotation tools, and element-editor framework

- Flag football now uses shared action bars, export controls, play tabs/reordering, fullscreen lifecycle and controls, viewer playback controls, and the animation-doc portal. Existing DOM geometry, selected styles, tooltips, shortcuts, read-only states and save locks are retained.
- Extracted transient laser/spotlight state operations and overlay rendering, plus the authored drawing palette and sampling/completion engine. Existing history adapters, animation persistence, temporary-mark exclusion and pen behavior remain connected.
- Added per-builder editor coordination/capabilities and shared dragging/dismissal action. Marker, guide, path, team-box, drawing-color and motion editors use it. Added shared name input and Delete/Revert controls; sport-specific fields remain in adapters.
- Added deterministic lifecycle/reorder/editor/drawing tests and an opt-in before/after screenshot harness. Nine desktop visual states were pixel-identical after extraction. The completion checks are recorded in the verification section above.
- No basketball implementation, document-format change, new backend service, or deployment was introduced.

### 2026-11-05 — Refactor completion and animation editing fixes

- Guarded/deferred animation artwork placement when an SVG parent is not attached. This addresses the null `querySelector` exception during step/ghost replacement; navigation regression coverage captures uncaught page errors.
- Laser/spotlight activation initializes its field cursor immediately. Transient marks retain independent history and export exclusion.
- Newly appearing posed elements honor the authored departure time. Added markers/guides preselect Jump and retain their other primary controls disabled; arrows retain initial Draw/Morph options and drawings retain their own reveal types. Hard Cut/Fade/Shrink appearance uses the same deterministic evaluator for preview and export.
- Delete handles mixed element/drawing selections; Backspace reverts selected items to their previous-step origins in animation mode. Revert supports groups. Shared action split menus offer current-step-only versus future-step updates when selected items have later poses. Reverting with future updates applies the restored origin position to those later poses; Delete with future updates hides them there.
- Added a shared color-aware crayon cursor with pale tips. No basketball implementation or saved-document version change.
- Verification: 75 unit passes (one optional FFmpeg skip), 36 focused Chrome scenarios passed across the run and retries, seven WebKit passes, nine exact visual matches, and clean Svelte/type checking. Fixed a portal-menu selection loss found during testing; updated a pre-existing drawing-effect fixture to move its drawing before expecting animation controls. Removed the one-off extraction scripts after their changes were integrated. Earlier dated baseline results remain distinguishable from current checks.

### 2026-11-05 — Spotlight and action-control follow-up

- Shared Revert/Delete menus use These for groups, and action tooltips include BACKSPACE/DELETE keycaps. Help and existing tutorial descriptions document the same shortcuts. Escape closes an action menu without clearing the selection.
- Raised the shared annotation layer after SVG insertion/mode updates, fixing elements remaining bright until the first pointer move. Shift+L exits spotlight and selects the regular laser, including presentation mode.
- Restored the familiar disabled primary controls for added markers/guides with Jump selected. Added arrows keep their initial Draw option; drawing animation controls are unchanged.
- Extended browser coverage for immediate topmost spotlight placement, laser-mode switching, plural menus/keycaps, added-marker disabled controls, and added-arrow Draw availability. Verification: nine Chrome scenarios passed across the run and focused retry; five WebKit scenarios passed; Svelte/type checking reported 0 errors and 0 warnings.

### 2026-11-05 — Selection, overlay ordering, and color-wheel transitions

- Select-all handles body focus after leaving toolbar controls and clears stale native text selection. Escape clears mixed object/drawing selections. Mixed selections use one action bar, hidden while a drawing or group drag is active.
- Header navigation stacks above the dock and editor portals. Annotation layer restoration keeps spotlight dimming above selected ghosts after Undo, without requiring a pointer move.
- Shared dropdown tooltips opt into a click-dismiss latch, reopening only after pointer exit/re-entry.
- Added `play-builder-color.ts`: all animated object/guide/arrow/drawing fills use shortest-arc HSL interpolation. Belts and bean bags use a single tinted image instead of two dissolving images, retaining neutral details. Browser and server/export renderers share the color/tint functions; Jump still cuts colors according to its transition.
- Verification: 77 unit tests passed (one optional FFmpeg integration skipped), 11 Chrome scenarios and 10 WebKit scenarios passed across the runs and focused retries, and clean Svelte/type checking. Spotlight Undo includes an exact before/after ghost-region screenshot comparison; artwork color checks inspect the rendered artwork rather than transparent hit targets. No document schema change or new sport implementation.

### 2026-11-04 — Playback-speed arrow scrubbing

- Updated `play-builder-keyboard-scrub.ts`, the shared animation controller's `shuttle(direction, speed = 2)` contract, and editor/viewer adapters. Plain arrows now use the selected preview speed; Shift+arrows use 2x authored speed. Mouse transport retains its existing 2x hold behavior.
- Removed the initial arrow-key nudge and delayed slow scrub; comma/period remain 0.01-second seeks. Rewind/fast-forward tooltips show Shift+arrow keycaps in both playback states.
- Added modifier/rate regression coverage in `tests/play-builder-keyboard-scrub.test.ts`, `tests/play-builder-animation-controller.test.ts`, and the editor/fullscreen browser tests. Verification: 8 focused unit checks and 3 Chrome scenarios passed; type checking reported 0 errors and 0 warnings. These focused results supplement the earlier full-refactor baseline, not a new full-suite run.

### 2026-11-04 — Initial living record and future-sport reuse requirement

- Captured the current flag football baseline, shared-code inventory, remaining coupling, basketball parity requirements, and known build limitation.
- Added root `AGENTS.md` instructions to read this record before builder work and maintain it as shared code/components/controllers evolve.
- Linked the record from README and the detailed controller guide. Documentation-only change; implementation test results above were carried forward with their date, not rerun or represented as newly run.

### 2026-11-04 — Shared interaction and animation controller extraction

- Added `play-builder-interaction-controller.ts` and `play-builder-animation-controller.ts` and connected the football builder through adapters.
- Moved shared selection/marquee/drag/angle/bounds behavior and drawing movement into the interaction/movement controllers.
- Moved animation capture/preview/step lifecycle, playback/scrubbing/shuttling, and frame scheduling into the animation controller.
- Retained football-specific target geometry, snap rules, attachments, pose evaluation, rendering, and inspector UI in the existing integration.
- Added deterministic controller tests, real mixed-group/drawing browser regressions, and adapter-contract documentation. Verification: the dated baseline above. No basketball code or document-format migration was added.

### 2026-11-04 — Shared clipboard and Undo/Redo foundation

- Added `play-builder-controller.ts`; football now uses it for clipboard storage, cut/paste history, repeated offsets, cross-play mapping, bounded history, and tutorial history preservation.
- Replaced fullscreen spotlight's custom history stacks with a separate shared-controller instance.
- Kept identity/link remapping and football uniqueness rules in its adapter. Added controller isolation/immutability/history/placement tests and browser copy/cut/paste Undo/Redo checks.

### Initial inventory — Existing behavior retained through extraction

The established builder already included the animation doc, motion/drawing/arrow editing, color/name transitions, anonymous/account persistence, viewing/presentation, exports, tutorials, custom tooltips/keycaps, keyboard shortcuts/color chords, temporary laser/spotlight drawing with history, play reordering, setup presets, and watermark restoration. These were retained and verified; their presence does not mean every implementation has already been extracted into a sport-neutral module.

## Maintenance checklist for future changes

- Update Last updated when implemented architecture or behavior changes.
- Add/rename/move paths in the inventory; mark each capability genuinely neutral, reusable with coupling, or sport-specific.
- Record new adapter APIs, state ownership, mutation/preview rules, lifecycle cleanup, and applicable limits in the controller guide.
- Keep one shared implementation for behavior meant to match across sports. Do not hide new duplication behind sport-specific wrapper components.
- Update parity notes when the user changes UX or shortcuts; do not preserve an obsolete requirement just because an older log entry contains it.
- Record tests actually run and their outcomes, plus unresolved limitations. Never label planned work implemented.
- When basketball is eventually authorized, explicitly document which shared modules it uses, what coupling was removed, and which differences are intentionally basketball-specific.
