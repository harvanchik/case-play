# Play builder animation

Each play can optionally contain a version 7 animation. Existing version 1–6 documents remain readable. The field and its existing tools are unchanged; Animate opens a floating dock aligned with the field. The dock keeps controls within the viewport without resizing the diagram. Detailed controls live in motion popovers and the inline Step Duration control.

## Editing and playback

- Add Step copies the last pose. Movement defaults to straight, steady, and one second. A transition is not a pause.
- Complete marker/guide poses are stored for each step. Editing a pose does not change later destinations. New objects become visible from their insertion step; deleting hides them from that step onward.
- Object appearance, diagram arrows, and field settings belong to the whole play. Freehand drawings can animate within individual steps. Motion geometry uses endpoint-relative coordinates. Timing is normalized so transition duration changes scale the movement window.
- Animation evaluation is pure and time-based. Playback/scrubbing use a separate preview state; saving and autosave always serialize the authoring document. Select a step to resume editing. Closing the dock selects Start; removing an animation keeps Start.
- The ball may attach only to team players. Release and catch positions are evaluated at their actual transition times, allowing moving receivers. Carry offsets remain editable.
- Limits: 61 steps, 60 seconds, 256 intermediate route points, and the existing 1.5 MB document limit. Social/library images use Start. Raster/PDF exports exclude animation handles and ghosts.

## Browser video downloads

Signed-in users can export the active animation as a single MP4, MOV, WebM, or GIF file. The MP4 split button exposes the other video formats. The PNG split button exposes JPG, WebP, and PDF. Menus close on outside clicks or Escape and render above the page.

`canvas-record` performs encoding entirely in the browser. No export job, database record, uploaded frames, Blob output, Sandbox, or paid rendering service is used. The old export API endpoints return 410; the legacy server pipeline is disconnected. Leave its feature flag disabled. No export rate limit is necessary because rendering runs on the user's device. Ordinary static asset delivery still uses hosting bandwidth.

MP4, MOV, and WebM use 1920×1080 at 30 fps; GIF uses 960×540 at 15 fps to limit memory use. Exports have no audio and use authored timing at 1×, independently of preview speed. Export backgrounds, grass, padding, borders, prompts, branding, and layer order use the existing image renderer. Video letterboxing uses the darkest extended grass, derived from the live end-zone color, with the same grass stripe pattern. Image assets are cached across frames. The submitted play snapshot is fixed during export; progress and Cancel are shown, then the editing step and selection are restored.

Codec support is checked before encoding. MP4 has a bundled software fallback; MOV and WebM require a compatible WebCodecs encoder and show an actionable error otherwise. Files remain on the user's device and are downloaded individually without ZIP packaging.

## Verification

```sh
pnpm test
pnpm check
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

Browser tests use a separate `caseplay-animation-test.db` and cover authoring, undo/redo, custom paths, possession, timing, saving, reopening in the same browser, shared playback, unauthorized updates/exports, and Make Copy. Chrome and Edge projects use installed browsers; Firefox and WebKit use Playwright engines. On Windows the Firefox binary may require the Visual C++ runtime; a side-by-side configuration launch failure is an environment failure, not an application result.

`tests/browser/browser-video.spec.ts` verifies actual playable video files and their dimensions, sign-in gating, dropdown dismissal, cancellation, editing-state restoration, MP4 software fallback, and the absence of export API calls. Full codec coverage runs in Chromium; WebKit checks MP4 and the software fallback. Tests create and delete temporary account sessions only in the disposable local test database.

On Windows, the Vercel adapter may require directory-link privileges to finish packaging. Local bundle validation used an untracked build-only junction fallback; it does not change application code or production configuration.


Editor refinements: new transitions default to one second. Adding an object changes only the selected step; newly duplicated steps inherit it, and existing later steps stay unchanged. The draggable 720px dock uses attached inspectors, a horizontally scrolling step row, and playback speeds from 0.25× through 2×. The MP4 toolbar control is enabled for signed-in users when an animation exists.

The + control appends a copy of the last pose at the end. Duplicate remains a separate step action. Motion inspector titles use proper object names and can be edited in place; optional names are stored separately from field labels and survive saving, copying, and Undo/Redo.



Animation shortcuts: Alt+A opens/closes the editor; Alt+S opens animation settings; Alt+Up/Down increases/decreases playback speed without wrapping; Alt+O opens Step Options; Alt+T opens Duration; Alt+M opens Motion. J/K/L provide previous/play-pause/next, Home/End select the first/last step, and 1–9 select matching steps. Alt+Shift+Left/Right, Alt+Shift+N, Alt+Shift+D, and Alt+Shift+Backspace retain navigation/add/duplicate/delete actions. Replaced Alt+Shift+A/G/S/X/O/T/M bindings are removed. Commands ignore text inputs and other dialogs; hints appear in tooltips.


Previewing between selected steps disables placement tools and clears their cursor/selection state. The laser remains available during playback and between steps, without a disabled cursor. New drawings are authored on selected steps and stored separately from their evaluated partial strokes. The displayed game clock derives from authored animation time, respects playback speed, clamps to zero, and flashes after a nonzero starting clock expires. The authored starting clock stays unchanged; MP4 frame rendering uses the same countdown evaluator.


Previous-step positions and movement routes are selectable ghosts. Movement routes use white dashed strokes at quarter opacity until their object, ghost, or route is selected. New custom routes default to smoothing and render without per-sample waypoint circles. The Move Remaining Route and Remove Everywhere actions have been removed; ordinary step-local editing and deletion remain available.

Previous-position artwork stays at quarter opacity during selection and dragging. Route artwork renders below scene elements, with separate interactive handles above them. Timeline step markers adjust durations in 0.05-second increments; interior markers redistribute neighboring durations, and both endpoint markers remain fixed. Draggable markers use grab/grabbing cursors.

Setup asks for confirmation when the active play has animation. Confirming removes that animation and restores the default formation in one undoable action; Cancel or Escape preserves the play.

Motion inspectors omit transition-name text and use the shared two-ended timing bar for start/arrival. Step duration is edited directly or with Up/Down keys, with a fixed s suffix inside the input and no increment buttons.

Reset Animation in the dock footer confirms before replacing the animation with its Start formation; Undo restores it. Scrubbing onto a step boundary selects that step for editing. Between steps, Duration remains visible and disabled, displaying the transition from the preceding step.

Reset Animation stays disabled with only Start; adding any step enables it, even before objects move. Timeline step markers have white fills and dark blue borders, use pointer cursors, and show tooltips centered above their marker rather than beside the cursor.

As steps fill the row, the dock expands horizontally before enabling overflow scrolling, bounded by the viewport and any open side panel. Step-row and side-panel scrollbars share the same thin square styling.

Double-clicking a movement route opens an on-field picker for Linear, Curved, Custom, and easing. Custom starts drawing immediately. A drawn stroke finishes on release; clicked waypoints stay in drawing mode until Done. Redraw is available in the path picker and Motion inspector, with the old route retained as a faded reference during drawing.

Step Options has been consolidated into Duration. Clicking a step opens Duration, which also contains inline naming and duplicate/delete icons. The separate Step Options button and Alt+O shortcut have been removed.

Duration always lists every moving element in the transition, without an All Movers filter. The Motion dock button, attachment, and Alt+M shortcut are removed. Path type, easing, and redraw remain available by double-clicking a movement route.

A selected marker or guide moved from the previous step shows Revert to Original Position beside Delete while editing animation. Revert restores only that step's position, clears its incoming motion override, and supports Undo.

With animation open, plain Left/Right arrows scrub by 0.05 seconds and clamp to the play's bounds. Text entry and focused per-object timing handles retain their own arrow-key behavior.

Non-looping playback selects the final step for editing when it finishes. Ghosts is a footer icon toggle; Loop is a repeat icon beside playback speed. Timeline, elapsed/total time, playback speed, and repeat are vertically centered on the playback row.

All movement routes remain visible during step editing, independently of Ghosts. All Routes, Remove Animation, and the now-empty animation Settings menu/Alt+S shortcut have been removed.

Per-element start/arrival timing now appears above easing in the on-field path popup, not in the Duration attachment. Playback time, speed, and repeat use tighter spacing.

The on-field popup has no title/close header and uses a compact custom easing menu. Double-clicking a previous-position ghost opens the same popup. Marker labels and object names are optional step-pose snapshots; editing one step preserves other steps, and playback switches text at the destination step boundary without fading. Legacy poses inherit existing scene labels until captured. Number shortcuts ignore unfocused stale inline editors, commit them before step navigation, and remain disabled while actually typing.

Playback transport controls are on the footer row, positioned at its exact horizontal and vertical center independently of the left/right actions.

Step Duration is edited inline in the footer with a permanent seconds suffix; Alt+T focuses it. The step attachment has been removed and step clicks only select a step.

V switches to the selection cursor while animation is open, including dock focus and preview, while leaving actual text inputs alone. Route hit-test clearances subtract the exact union of marker boxes so nearby clusters do not swallow football path hit areas; attached-ball endpoints are evaluated before checking whether the ball moved.

Step actions use explicit dark text; Step Duration has 7px horizontal hover padding and expands live while typing. Shift-drag constrains displacement to horizontal/vertical axes in static mode, or the nearest 45-degree direction in animation mode. Changing direction reselects the snap; releasing Shift returns to free placement. Shift-click deselection is deferred until release to preserve Shift-drag on already-selected elements.

Ctrl/Cmd+S is intercepted before animation focus guards, prevents the browser Save Page action, and saves the play builder from dock or input focus. Focused input edits are committed before the save snapshot is captured.

The zero game clock flashes only while playback runs and remains visible when paused or finished. Objects first introduced in a step appear from the start of its incoming transition, rather than waiting for its destination boundary; editing Start still uses only the Start formation.

Shared viewers have an icon-and-label Make Copy action at the black workspace's top-left and vertically stacked play buttons in a reserved left sidebar. Play buttons in both viewer and editor use white backgrounds, larger bold dark text, and dark selected borders; the editor's Add Play uses a centered larger plus icon.

Shared view now uses editor workspace padding and the same New/Make Copy/Share and export toolbar positions. Plays are horizontal below the field in both modes; Add Play uses a text-sized plus. Shared playback uses square Start, Play/Pause, Speed, and Loop buttons at bottom right, with playback/scrub/step/speed shortcuts handled independently of the hidden editor dock.

Arrow scrubbing now advances in 0.01-second increments; holding Shift multiplies that by five in editor and shared playback. Shared fields suppress placement previews, editing tooltips, grab/text cursors, and keyboard edit targets, with capture guards blocking click/double-click/keyboard editing inside the diagram. Playback, navigation, sharing, and export controls remain interactive.

Held-arrow scrubbing runs on animation frames instead of OS key repeat, so pressing/releasing Shift mid-hold adjusts speed without stopping. Shared New/Duplicate/Share now begins at the editor Undo position; Make Copy is labeled Duplicate. Play tabs and Add Play share two-pixel borders and equal heights, with Add Play remaining square.

Extended Grass replaces Show Ads in browser-wide builder preferences. It paints only the surrounding workspace with the current field's stripe pattern, aligned to the field SVG, at a base color 20% darker than its end zone. The preference persists locally, is excluded from saved documents/exports, and does not mark a play dirty. Legacy ads preferences are no longer restored.

Field type is locked while the active play has animation transitions; other type choices show Reset Animation to Change Field Type. Setup resets only the selected step without confirmation or deleting animation. Persistent setup-default flags retain original marker/guide identities and distinguish later additions, which are hidden in the reset step. Other existing step poses are preserved, and copied reset steps inherit its visibility. Legacy untagged documents infer default identities from Start.

Removed elements remain visible as pathless previous-step ghosts while editing. Step Duration focuses and selects its value when its label is clicked; the control keeps a fixed width while the seconds change.

Jump offers Hard Cut, Fade, and Shrink. Fade and Shrink take 0.25 seconds at 1×, scaled inversely by the object speed and capped to the remaining step. Hard Cut is instantaneous. Arrival stays locked; the easing menu becomes the effect menu. Switching back restores prior route geometry and arrival timing from browser-session memory, which is cleared on refresh. Opening Animate selects the normal cursor and clears element selection.

Clear Animation replaces the former Reset Animation wording throughout the controls and confirmation. The step menu offers Create Play from Step: it appends a static play with the selected pose and field settings, retaining the source animation.

The animation dock grows automatically only up to 75% of viewport width. Manual edge resizing can exceed that limit or shrink to the existing minimum. The step strip updates overflow scrolling after every size change.

Every double-click action also accepts a single right-click: toolbar presets, play menus, element editors, team boxes, guide and arrow editors, animation ghosts, movement paths, and step menus. Double-click behavior remains available.

During playback, held left/right arrows temporarily shuttle at -2x/+2x without changing the selected playback speed or pausing. When paused, Shift+Arrow uses the same shuttle speed; plain arrows retain fine scrubbing. Releasing the arrows restores normal playback or remains paused. Timeline endpoint controls disable at their boundary, and Play becomes Restart at the end. The start shortcut tooltip shows Home only.

The animation dock has its own icon-only tutorial beside Clear Animation. Its lessons use the existing Driver tutorial UI, progressing from adding and moving steps through playback, timing, management, routes, custom drawing, easing, Jump, and the difference between temporary laser marks and step-based drawing animations. A temporary Tutorial play starts with the default formation. Completion, End, Escape, and destruction restore the original plays, selected step, history, and preview preferences. Saving, autosave, local draft writing, and temporary play URL updates are blocked during the tutorial.

Tutorial lessons now keep the field and controls interactive, block playback shortcuts outside playback lessons, and use shorter descriptions. Boundary editing ensures three steps; element editing selects the final step; path opening is a manual task; custom drawing and expanding easing menus stay accessible. Shift movement snaps in 45-degree directions: ordinary animation paths use the previous-step origin, while custom routes and static/group moves use their drag origin. Shift adjusts object timing at 0.01-second precision. Selected text retains native Ctrl/Cmd+C copying.

Tutorial follow-up: ghost toggling selects Step 2; animation editing selects the final step. Adding the next step auto-advances the lesson. Marker duration practice places the playhead 0.25 seconds before the second marker. Tutorial step deletion keeps at least three steps. Custom becomes Redraw in-place when selected, replacing the extra redraw button. Clear/Undo/Redo have separate highlighted areas, and the Animation Doc highlight tracks movement and resizing. The final lesson is You’re All Set.

Hold Shift while dragging an interior timeline step marker for 0.01-second duration adjustments; ordinary dragging remains at 0.05 seconds. Neighboring transition durations adjust together and preserve the total.

Animate has a first-use bouncing NEW badge, remembered per browser. Opening Animate clears it permanently for that browser. The animation tutorial button pulses with its normal hover background until the tutorial is first started; that choice also persists across reloads. Shared playback controls remain disabled until browser initialization finishes.

With multiple plays, opening either format menu exposes vertically stacked ALL controls. ALL images and videos download as ZIP archives with one numbered file per play; ALL PDF creates one document with one page per play. A normal PDF button exports only the selected play. Video exports include only animated plays. ALL is shown only when multiple animated plays exist; with one animated play, it downloads directly even if a static play is selected. Single-play builders show no ALL controls. Local development permits video exports without sign-in; production requires sign-in.

Downloads use the play name, with ` Animation` before video file extensions. Export progress and cancellation replace the primary image/video square button; its background fills from left to right as progress advances. Duplicate names in ZIPs receive numbered suffixes.

## Motion, drawing, and team-letter updates

The timing bar displays departure on the left and arrival on the right. Clicking its middle cycles movement speeds from 1x through 2x in 0.25 increments. Speed is the step duration divided by the movement window: full width is 1x and half width is 2x. Resizing either edge updates speed continuously; shifting the window preserves speed. Dragging still shifts the window, and Shift gives 0.01-second handle adjustments. Movement cannot be slower than 1x. Jump retains its separate transition-speed control. Guide motion offers Shift and Jump; guide Jump effects offer Hard Cut and Fade, without Shrink. Guide downs are complete per-step poses and switch after the guide finishes moving.

New freehand drawings created after Start animate over the second half of their incoming step by default. Their original point order and geometry remain in the scene registry; evaluation reveals a distance-sampled portion without modifying the saved stroke. Clicking a drawing with the selection tool opens its color swatches and individual Delete action. Double-click or right-click opens Draw/Instant, timing, speed, and easing controls. Drawings can be dragged individually or as a selected drawing group in both static and animation modes. Per-step offsets preserve earlier and later positions; playback interpolates movement using the drawing timing/easing settings. Previous positions appear as faded drawings while editing, and moved drawings offer Revert beside Delete. Shift-click or drag-select drawings to edit them together. Existing drawings at Start remain static unless an animation is explicitly assigned later. Step drawing visibility and per-step drawing settings are optional v7 data; older documents retain their static annotations.

A removed object's selectable ghost can be reverted to restore its previous-step position. Animate and MP4 retain NEW badges. Only the first page visit bounces Animate and enables the animation tutorial pulse; MP4 never bounces.

Player color popovers have a compact one-letter input. A change updates default team-letter labels, animation poses, toolbar/cursor labels, field-side references, help, and previews for the current play only. Manual names and officials stay unchanged. Letters are saved with the play and remembered as browser defaults for newly created plays; other existing plays retain their own letters.

Timing labels are borderless inline inputs: first focus selects the number, blur or Enter restores the seconds suffix, and Escape cancels. Times stay within the step with a minimum 0.01-second window. Changing a step duration (including dragging its boundary) keeps partial movement/drawing windows in authored seconds, clamping when a shorter step cannot contain them; untouched full-step windows continue to fill the step.

C clears regular drawings on the selected step while Draw is active, including when focus remains in the animation dock; other steps retain their drawings. Laser clearing remains independent. Jump timing labels display actual transition seconds (Hard Cut is 0s), with the Transition Time tooltip; normal movement uses Element Speed Multiplier. Shift-click reverses timing-speed, playback-speed (editor and viewer), and game-quarter cycling.

Existing drawings use Linear/Jump movement controls rather than Draw/Instant; newly introduced strokes retain Draw/Instant reveal controls. Drawing colors are complete per-step values alongside their offsets. Linear blends RGB channels over the movement window; Jump/Instant cuts color at departure. Focus does not add outlines or shadow rings; selection bounds remain visible.

Mixed marquee groups include markers, guides, annotation paths, and drawings in their bounds and translation. Drawing movement routes display beneath drawings, including when ghosts are hidden. Fade/Shrink transition duration is edited in a seconds input beside the effect dropdown; Hard Cut has no duration input and Jump rails have no speed/time label. Toolbar and white square action buttons use an inset square focus border and show their custom tooltip while focused.

Transition duration defaults to 0.25s (or the step duration when shorter), clamps to 0.01s through the step duration, and supports typed seconds, an automatic s suffix, Arrow Up/Down in 0.05s increments. The slider start/end inline inputs use the same 0.05s keyboard increments. Drawing Jump offers Hard Cut/Fade; marker Jump also offers Shrink. Duration is saved independently from movement speed. LOS is layered above LTG in the editor and server SVG previews; focused white square buttons use the animation accent blue.

Animation effect menus and image/video export format menus share the same chevron SVG. Chevrons rotate 180 degrees over 150ms when open, remain vertically centered with the text, and are omitted when the export sliver displays ALL.

Focus borders are painted on player-letter panels so their full-size backgrounds cannot cover the accent border. Export slivers/ALL controls and play tabs share the same focus style. Expanded format menus participate in Tab/Shift+Tab order, with Escape returning focus to their toggle. Tooltip positioning switches between pointer and focus anchors; Tab dismisses stale hover tips without letting stationary-pointer events override the newly focused control.

Timing bars keep their minimum handle width within the rail, including a 0.99s departure in a 1s step. Shift+Up/Down uses 0.01s increments in start/end, effect duration, and step-duration inputs. Tooltip wrapper IDs use a separate attribute from field tooltip text. Tutorial observers pause during transitions; completed waits do not run skip actions again, and clicking tutorial navigation does not dismiss path settings. The final practice lessons require making and clearing a laser mark, creating a drawing, moving it on a new step, and choosing its animation type before completion. Route hit targets stay beneath drawings and do not intercept Laser/Draw tools.

Blue inset focus borders use :focus-visible so pointer clicks do not show them. Ctrl/Cmd disables placement attraction and whole-yard guide rounding and bypasses drag snapping. Shift retains its movement-angle controls. Tool changes release all active/persistent laser strokes, including direct programmatic switches to selection. Duration displays keep at least two decimal places (0.30s/0.50s), retaining three-decimal precision when authored.

Browser video exports pipeline SVG rasterization ahead of encoding instead of waiting for each frame to finish both stages. ZIP video jobs run with at most two encoders on capable devices (one on low-memory/low-core devices), preserving play order and filenames. A frozen, non-interactive SVG preview keeps the visible field still and the active play tab does not change. Frames capture isolated SVG clones through a serialized DOM snapshot queue; rasterization/encoding overlap afterward. Progress aggregates all jobs. Cancellation/failure aborts sibling jobs and settles outstanding captures before restoring scene, settings, step, selection, and draft scheduling. All rendering remains client-side; export time depends on device and format.
