# Play builder animation

Each play can optionally contain a version 7 animation. Existing version 1–6 documents remain readable. The field and its existing tools are unchanged; Animate opens a floating dock aligned with the field. The dock keeps controls within the viewport without resizing the diagram. Detailed controls stay behind Timing and step options.

## Editing and playback

- Add Step copies the selected pose. Movement defaults to straight, steady, and two seconds. A transition is not a pause.
- Complete marker/guide poses are stored for each step. Editing a pose does not change later destinations. New objects become visible from their insertion step; deleting hides them from that step onward. Remove Everywhere deletes the registry entry and references.
- Static object attributes, arrows, freehand strokes, and field settings belong to the whole play. Motion geometry uses endpoint-relative coordinates. Timing is normalized so transition duration changes scale the movement window.
- Animation evaluation is pure and time-based. Playback/scrubbing use a separate preview state; saving and autosave always serialize the authoring document. Select a step to resume editing. Closing the dock selects Start; removing an animation keeps Start.
- The ball may attach only to team players. Release and catch positions are evaluated at their actual transition times, allowing moving receivers. Carry offsets remain editable.
- Limits: 61 steps, 60 seconds, 256 intermediate route points, and the existing 1.5 MB document limit. Social/library images use Start. Raster/PDF exports exclude animation handles and ghosts.

## MP4 infrastructure

The source includes the complete export pipeline, but **exports default to disabled**. Animation editing, saving, sharing, and playback work without export infrastructure.

Before enabling MP4 in a deployment:

1. Apply migrations, including `0009_play_builder_exports.sql`, to that deployment's database.
2. Configure Workflow for the Vercel project. The SvelteKit Vite plugin creates its workflow routes during the build.
3. Provide Sandbox access to the project through Vercel OIDC. For development outside Vercel, use the SDK's documented local OIDC setup.
4. Connect a **private Vercel Blob store** and provide its SDK credentials to the deployment. Never use a public store for job outputs.
5. Optionally set `PLAY_BUILDER_VIDEO_SANDBOX_SNAPSHOT_ID` to a snapshot containing Node 24, `ffmpeg` with `libx264`, and `@resvg/resvg-js@2.6.2` under `/vercel/sandbox/node_modules`. Without it, each job prepares those dependencies in its disposable sandbox.
6. Set `PLAY_BUILDER_VIDEO_EXPORT_ENABLED=true`, deploy, and run a signed-in staging export. Verify job progress, the downloaded MP4, cache reuse, and expiration before enabling in production.

The sandbox renderer is bundled at build time into `.svelte-kit/video-renderer-source.js`. The Workflow build consumes this ordinary module, including embedded fonts and marker assets. The renderer and browser share the same evaluator. Untrusted document strings are validated data; they are never executed as commands.

Exports use 1920×1080, 30 fps, H.264/yuv420p, no audio, and authored timing at 1×. FFmpeg runs detached inside a disposable sandbox; durable Workflow steps poll progress and store the result privately. Sandbox execution is bounded to twelve minutes. Workflow cleans up resources after success/failure and removes output after 24 hours.

Submission snapshots only the active play, without saving or changing the diagram. The database atomically enforces one active export per account and five new jobs per UTC day. Identical active/completed requests are reused per account and do not consume another quota slot. Completed downloads expire after 24 hours. Status and download endpoints check the requesting account. A signed-in viewer can export a shared play; anonymous users can animate, save, and share but must sign in for MP4.

Provisioning services or enabling the switch may incur Vercel processing/storage charges. No services are provisioned by installation or local tests.

## Verification

```sh
pnpm test
pnpm check
pnpm build
pnpm exec playwright install
pnpm test:e2e
```

Browser tests use a separate `caseplay-animation-test.db` and cover authoring, undo/redo, custom paths, possession, timing, saving, reopening in the same browser, shared playback, unauthorized updates/exports, and Make Copy. Chrome and Edge projects use installed browsers; Firefox and WebKit use Playwright engines. On Windows the Firefox binary may require the Visual C++ runtime; a side-by-side configuration launch failure is an environment failure, not an application result.

For the actual production-renderer MP4 test, supply `FFMPEG_PATH` pointing to a local FFmpeg executable when running `pnpm test`. Without it, only that binary integration test is skipped. This test compiles the renderer, creates a short real video, and checks codec, resolution, frame rate, and decoding.

Live Workflow/Sandbox/Blob verification requires configured credentials and an enabled deployment; local video generation does not establish that those remote services are provisioned correctly.

On Windows, the Vercel adapter may require directory-link privileges to finish packaging. Local bundle validation used an untracked build-only junction fallback; it does not change application code or production configuration.


Editor refinements: new transitions default to one second. Adding an object changes only the selected step; newly duplicated steps inherit it, and existing later steps stay unchanged. The draggable 960px dock uses attached inspectors, a horizontally scrolling step row, and playback speeds from 0.25× through 2×. The MP4 toolbar control is temporarily disabled with a Coming Soon tooltip while backend provisioning and cloud verification remain pending.

The + control appends a copy of the last pose at the end. Duplicate remains a separate step action. Motion inspector titles use proper object names and can be edited in place; optional names are stored separately from field labels and survive saving, copying, and Undo/Redo.



Animation shortcuts: Alt+A opens/closes the editor; Alt+S opens animation settings; Alt+Up/Down increases/decreases playback speed without wrapping; Alt+O opens Step Options; Alt+T opens Duration; Alt+M opens Motion. J/K/L provide previous/play-pause/next, Home/End select the first/last step, and 1–9 select matching steps. Alt+Shift+Left/Right, Alt+Shift+N, Alt+Shift+D, and Alt+Shift+Backspace retain navigation/add/duplicate/delete actions. Replaced Alt+Shift+A/G/S/X/O/T/M bindings are removed. Commands ignore text inputs and other dialogs; hints appear in tooltips.


Previewing between selected steps disables placement tools and clears their cursor/selection state. Drawing and laser remain available; new freehand annotations persist as static scene annotations without capturing interpolated object poses. The displayed game clock derives from authored animation time, respects playback speed, clamps to zero, and flashes after a nonzero starting clock expires. The authored starting clock stays unchanged; MP4 frame rendering uses the same countdown evaluator.


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

Jump motion teleports at the start handle time. Arrival stays at the end of the step and easing is disabled. Switching back restores prior route geometry and arrival timing from browser-session memory, which is cleared on refresh. Opening Animate selects the normal cursor and clears element selection.

Clear Animation replaces the former Reset Animation wording throughout the controls and confirmation. The step menu offers Create Play from Step: it appends a static play with the selected pose and field settings, retaining the source animation.

The animation dock grows automatically only up to 75% of viewport width. Manual edge resizing can exceed that limit or shrink to the existing minimum. The step strip updates overflow scrolling after every size change.

Every double-click action also accepts a single right-click: toolbar presets, play menus, element editors, team boxes, guide and arrow editors, animation ghosts, movement paths, and step menus. Double-click behavior remains available.

During playback, held left/right arrows temporarily shuttle at -2x/+2x without changing the selected playback speed or pausing. When paused, Shift+Arrow uses the same shuttle speed; plain arrows retain fine scrubbing. Releasing the arrows restores normal playback or remains paused. Timeline endpoint controls disable at their boundary, and Play becomes Restart at the end. The start shortcut tooltip shows Home only.

The animation dock has its own icon-only tutorial beside Clear Animation. Its 23 lessons use the existing Driver tutorial UI, progressing from adding and moving steps through playback, timing, management, routes, custom drawing, easing, Jump, and sharing. A temporary Tutorial play starts with the default formation. Completion, End, Escape, and destruction restore the original plays, selected step, history, and preview preferences. Saving, autosave, local draft writing, and temporary play URL updates are blocked during the tutorial.

Tutorial lessons now keep the field and controls interactive, block playback shortcuts outside playback lessons, and use shorter descriptions. Boundary editing ensures three steps; element editing selects the final step; path opening is a manual task; custom drawing and expanding easing menus stay accessible. Shift movement snaps in 45-degree directions: ordinary animation paths use the previous-step origin, while custom routes and static/group moves use their drag origin. Shift adjusts object timing at 0.01-second precision. Selected text retains native Ctrl/Cmd+C copying.

Tutorial follow-up: ghost toggling selects Step 2; animation editing selects the final step. Adding the next step auto-advances the lesson. Marker duration practice places the playhead 0.25 seconds before the second marker. Tutorial step deletion keeps at least three steps. Custom becomes Redraw in-place when selected, replacing the extra redraw button. Clear/Undo/Redo have separate highlighted areas, and the Animation Doc highlight tracks movement and resizing. The final lesson is You’re All Set.

Hold Shift while dragging an interior timeline step marker for 0.01-second duration adjustments; ordinary dragging remains at 0.05 seconds. Neighboring transition durations adjust together and preserve the total.

Animate has a first-use bouncing NEW badge, remembered per browser. Opening Animate clears it permanently for that browser. The animation tutorial button pulses with its normal hover background until the tutorial is first started; that choice also persists across reloads. Shared playback controls remain disabled until browser initialization finishes.
