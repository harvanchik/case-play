import { test, expect, type Page } from '@playwright/test';
import { createAnimation, insertAnimationStep } from '../../src/lib/play-builder-animation';
import { defaultPlayBuilderFieldSettings, encodePlayBuilderDocument, type PlayBuilderScene } from '../../src/lib/play-builder-scene';

const marker = (page: Page, id: number) => page.locator(`[data-layer-type="marker"][data-layer-id="${id}"]`);
async function ready(page: Page) {
	await page.goto('/diagram/flag-football');
	await page.waitForSelector('.tutorial-launch-bouncing', { state: 'attached' });
	const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
	if (await consent.isVisible()) await consent.click();
}
async function dragMarker(page: Page, id: number, dx: number, dy: number) {
	const box = await marker(page, id).boundingBox();
	if (!box) throw new Error('Marker not found');
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 8 });
	await page.mouse.up();
}

test('Shift dragging dynamically switches axes and diagonals in static and animation modes', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 const id = Number(await page.locator('[data-field-kind="official-b"]').getAttribute('data-layer-id'));
 await marker(page, id).click();
 async function begin() {
  const b = (await marker(page, id).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.keyboard.down('Shift'); await page.mouse.down();
  return b;
 }
 async function move(b: { x: number; y: number; width: number; height: number }, dx: number, dy: number) {
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 4 });
  const now = (await marker(page, id).boundingBox())!;
  return { x: now.x - b.x, y: now.y - b.y };
 }
 let b = await begin();
 let offset = await move(b, 100, 20);
 expect(offset.x).toBeCloseTo(100, 0); expect(offset.y).toBeCloseTo(0, 0);
 offset = await move(b, 20, 100);
 expect(offset.x).toBeCloseTo(0, 0); expect(offset.y).toBeCloseTo(100, 0);
 await page.keyboard.up('Shift');
 offset = await move(b, 80, 55);
 expect(offset.x).toBeCloseTo(80, 0); expect(offset.y).toBeCloseTo(55, 0);
 await page.keyboard.down('Shift');
 offset = await move(b, 80, 55);
 expect(offset.x).toBeCloseTo(67.5, 0); expect(offset.y).toBeCloseTo(67.5, 0);
 await page.mouse.up(); await page.keyboard.up('Shift');
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 b = await begin();
 offset = await move(b, 80, 70);
 expect(offset.x).toBeCloseTo(75, 0); expect(offset.y).toBeCloseTo(75, 0);
 offset = await move(b, 100, 10);
 expect(offset.x).toBeCloseTo(100, 0); expect(offset.y).toBeCloseTo(0, 0);
 offset = await move(b, -80, -65);
 expect(offset.x).toBeCloseTo(-72.5, 0); expect(offset.y).toBeCloseTo(-72.5, 0);
 await page.keyboard.up('Shift');
 offset = await move(b, -60, -30);
 expect(offset.x).toBeCloseTo(-60, 0); expect(offset.y).toBeCloseTo(-30, 0);
 await page.mouse.up();
});


test('Extended Grass replaces Show Ads as a browser preference without changing the play', async ({ page }, testInfo) => {
 await ready(page);
 const save = page.getByRole('button', { name: 'Save play', exact: true });
 await expect(save).toBeDisabled();
 await page.getByRole('button', { name: 'Open field settings', exact: true }).click();
 await expect(page.getByRole('switch', { name: /^Show Ads/ })).toHaveCount(0);
 const toggle = page.getByRole('switch', { name: /^Extended Grass/ });
 await expect(toggle).toHaveAttribute('aria-checked', 'false');
 await toggle.click();
 await page.getByRole('button', { name: 'Close settings', exact: true }).click();
 const grass = page.locator('[data-extended-grass]');
 await expect(grass).toBeVisible();
 await expect(grass.locator('> rect').first()).toHaveAttribute('fill', 'rgb(29, 63, 45)');
 await expect(page.locator('.field-canvas [data-extended-grass]')).toHaveCount(0);
 await expect(save).toBeDisabled();
 expect(await page.evaluate(() => JSON.parse(localStorage.getItem('caseplay-play-builder-settings-v1')!).extendedGrass)).toBe(true);
 await page.reload();
 await expect(grass).toBeVisible();
 await expect(save).toBeDisabled();
 await page.screenshot({ path: testInfo.outputPath('extended-grass.png') });
 await page.getByRole('button', { name: 'Open field settings', exact: true }).click();
 await toggle.click();
 await page.getByRole('button', { name: 'Close settings', exact: true }).click();
 await expect(grass).toHaveCount(0);
 await expect(save).toBeDisabled();
});


test('Setup resets only the selected animation step with original identities and locks field type', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 const referee = Number(await page.locator('[data-field-kind="official-r"]').getAttribute('data-layer-id'));
 const initial = (await marker(page, referee).boundingBox())!;
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await dragMarker(page, referee, 120, -40);
 await page.getByRole('button', { name: 'Penalty Flag', exact: true }).click();
 await page.locator('.field-canvas svg').first().click({ position: { x: 700, y: 250 } });
 const flagId = Number(await page.locator('[data-layer-type="marker"][data-field-kind="flag"]').getAttribute('data-layer-id'));
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await expect(page.getByRole('dialog', { name: 'Reset to Default Setup?' })).toHaveCount(0);
 await expect(page.locator('[data-step-id]')).toHaveCount(3);
 await expect(marker(page, flagId)).toHaveCount(0);
 expect((await marker(page, referee).boundingBox())!.x).toBeCloseTo(initial.x, 0);
 await page.getByRole('button', { name: 'Undo', exact: true }).click();
 await expect(marker(page, flagId)).toHaveCount(1);
 expect((await marker(page, referee).boundingBox())!.x).toBeGreaterThan(initial.x + 100);
 await page.getByRole('button', { name: 'Redo', exact: true }).click();
 await expect(marker(page, flagId)).toHaveCount(0);
 await page.getByRole('slider', { name: 'Animation playhead', exact: true }).fill('1.5');
 expect((await marker(page, referee).boundingBox())!.x - initial.x).toBeCloseTo(60, 0);
 await expect(marker(page, flagId)).toHaveCount(0);

 await page.keyboard.press('2');
 await expect(marker(page, flagId)).toHaveCount(1);
 expect((await marker(page, referee).boundingBox())!.x).toBeGreaterThan(initial.x + 100);
 await page.keyboard.press('3');
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await expect(marker(page, flagId)).toHaveCount(0);
 await page.getByRole('button', { name: 'Open field settings', exact: true }).click();
 const types = page.getByRole('radiogroup', { name: 'Field type', exact: true });
 const selected = types.locator('[aria-checked="true"]');
 await expect(selected).toBeEnabled();
 const other = types.locator('[aria-checked="false"]').first();
 await expect(other).toBeDisabled();
 await other.hover({ force: true });
 await expect(page.getByRole('tooltip')).toHaveText('Clear Animation to Change Field Type');
 await page.getByRole('button', { name: 'Close settings', exact: true }).click();
 await page.getByRole('button', { name: 'Clear animation', exact: true }).click();
 await page.getByRole('dialog', { name: 'Clear Animation?', exact: true }).getByRole('button', { name: 'Clear Animation', exact: true }).click();
 await page.getByRole('button', { name: 'Open field settings', exact: true }).click();
 await expect(other).toBeEnabled();
});



test('removed elements retain pathless ghosts and Step Duration focuses without resizing', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await page.getByRole('button', { name: 'Penalty Flag', exact: true }).click();
 await page.locator('.field-canvas svg').first().click({ position: { x: 700, y: 250 } });
 const id = Number(await page.locator('[data-layer-type="marker"][data-field-kind="flag"]').getAttribute('data-layer-id'));
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await expect(marker(page, id)).toHaveCount(0);
 const ghost = page.locator(`[data-animation-ghost="${id}"]`);
 await expect(ghost).toBeVisible();
 await expect(ghost.locator('image')).toHaveAttribute('href', '/images/penalty-flag.webp');
 await expect(page.locator(`[data-animation-route="${id}"]`)).toHaveCount(0);
 const duration = page.locator('.step-duration');
 const input = page.getByRole('spinbutton', { name: 'Step duration seconds', exact: true });
 const width = (await duration.boundingBox())!.width;
 await duration.getByText('Step Duration', { exact: true }).click();
 await expect(input).toBeFocused();
 await page.keyboard.type('12.25');
 await expect(input).toHaveValue('12.25');
 expect((await duration.boundingBox())!.width).toBe(width);
 await input.press('Tab');
 expect((await duration.boundingBox())!.width).toBe(width);
 await page.getByRole('slider', { name: 'Animation playhead', exact: true }).fill('1.5');
 await expect(ghost).toHaveCount(0);
});



test('autosave debounces edits and shows Saving for a second before failure', async ({ page }) => {
 await page.addInitScript(() => localStorage.setItem('caseplay-play-builder-settings-v1', JSON.stringify({ autoSave: true })));
 let requests = 0;
 await page.route('**/api/play-builders', async route => {
  if (route.request().method() !== 'POST') return route.continue();
  requests++;
  await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Save service unavailable' }) });
 });
 await ready(page);
 await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') });
 await page.clock.pauseAt(new Date('2026-11-01T12:00:01Z'));
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await page.clock.runFor(2000);
 expect(requests).toBe(0);
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await page.clock.runFor(2000);
 expect(requests).toBe(0);
 await page.clock.runFor(1000);
 await expect.poll(() => requests).toBe(1);
 const saving = page.getByRole('button', { name: 'Saving play', exact: true });
 await expect(saving).toBeDisabled();
 await expect(saving).toContainText('Saving');
 await page.clock.runFor(900);
 await expect(saving).toBeVisible();
 await page.clock.runFor(200);
 const failed = page.getByRole('button', { name: 'Save failed', exact: true });
 await expect(failed).toContainText('Failed!');
 await expect(failed).toBeEnabled();
 await expect(failed).toHaveCSS('color', 'rgb(255, 255, 255)');
 await failed.click();
 await expect(saving).toBeDisabled();
 await expect.poll(() => requests).toBe(2);
 await page.clock.runFor(1100);
 await expect(failed).toBeVisible();
});



test('successful autosave returns to disabled Saved after its minimum Saving display', async ({ page }) => {
 const scene: PlayBuilderScene = { markers: [], guides: [], paths: [], freeStrokes: [], layerOrder: [] };
 const response = await page.request.post('/api/play-builders', { data: { document: encodePlayBuilderDocument({ activePlayIndex: 0, plays: [{ name: 'Autosave', scene, settings: defaultPlayBuilderFieldSettings() }] }) } });
 expect(response.status()).toBe(201);
 const saved = await response.json();
 await page.addInitScript(({ id, token }) => {
  localStorage.setItem('caseplay-play-builder-edit-tokens-v1', JSON.stringify({ [id]: token }));
  localStorage.setItem('caseplay-play-builder-settings-v1', JSON.stringify({ autoSave: true }));
 }, { id: saved.id, token: saved.editToken });
 let requests = 0;
 await page.route(`**/api/play-builders/${saved.id}`, async route => {
  if (route.request().method() !== 'PUT') return route.continue();
  requests++;
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
 });
 await page.goto(`/diagram/flag-football/${saved.id}`);
 const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
 if (await consent.isVisible()) await consent.click();
 await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') });
 await page.clock.pauseAt(new Date('2026-11-01T12:00:01Z'));
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await page.clock.runFor(3000);
 await expect.poll(() => requests).toBe(1);
 const saving = page.getByRole('button', { name: 'Saving play', exact: true });
 await expect(saving).toBeDisabled();
 await page.clock.runFor(900);
 await expect(saving).toBeVisible();
 await page.clock.runFor(200);
 const done = page.getByRole('button', { name: 'Play saved', exact: true });
 await expect(done).toBeDisabled();
 await expect(done).toContainText('Saved');
});




test('Jump locks arrival and easing and remembers previous route and timing', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await page.getByRole('button', { name: 'Penalty Flag', exact: true }).click();
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Penalty Flag', exact: true })).toHaveAttribute('aria-pressed', 'false');
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 const id = Number(await page.locator('[data-field-kind="team-a"]').first().getAttribute('data-layer-id'));
 await dragMarker(page, id, 100, -50);
 const route = page.locator(`[data-animation-route="${id}"]`);
 await route.locator('path[pointer-events="stroke"]').dispatchEvent('dblclick', { clientX: 600, clientY: 300 });
 const picker = page.getByRole('dialog', { name: 'Movement path options' });
 await picker.getByRole('button', { name: 'Curved', exact: true }).click();
 const arrival = picker.getByRole('button', { name: / arrival time$/ });
 await arrival.press('ArrowLeft');
 await arrival.press('ArrowLeft');
 await expect(picker).toContainText('0.00–0.90s');
 await picker.getByRole('button', { name: 'Jump', exact: true }).click();
 await expect(arrival).toBeDisabled();
 await expect(picker.getByRole('button', { name: 'Path easing', exact: true })).toBeDisabled();
 await expect(picker).toContainText('0.00–1.00s');
 await picker.getByRole('button', { name: / start time$/ }).press('ArrowRight');
 await picker.getByRole('button', { name: 'Curved', exact: true }).click();
 await expect(arrival).toBeEnabled();
 await expect(picker).toContainText('0.05–0.90s');
 await expect(page.getByRole('button', { name: 'Bend movement path', exact: true })).toBeVisible();
 await picker.getByRole('button', { name: 'Custom', exact: true }).click();
 const surface = page.getByRole('application', { name: 'Draw movement route', exact: true });
 const bounds = (await surface.boundingBox())!;
 await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .2);
 await page.mouse.down();
 await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .35, { steps: 10 });
 await page.mouse.up();
 await expect(surface).toHaveCount(0);
 const line = page.locator('[data-animation-route-line]');
 const custom = await line.getAttribute('d');
 await route.locator('path[pointer-events="stroke"]').dispatchEvent('dblclick', { clientX: 600, clientY: 300 });
 await picker.getByRole('button', { name: 'Jump', exact: true }).click();
 await expect(line).toHaveAttribute('visibility', 'hidden');
 await picker.getByRole('button', { name: 'Custom', exact: true }).click();
 await expect(surface).toHaveCount(0);
 await expect(line).toHaveAttribute('d', custom!);
 await expect(picker).toContainText('0.05–0.90s');
});



test('Create Play from Step makes a static play and preserves the source animation', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 const id = Number(await page.locator('[data-field-kind="team-a"]').first().getAttribute('data-layer-id'));
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Clear animation', exact: true })).toBeDisabled();
 const start = page.getByRole('button', { name: 'Go to animation start', exact: true });
 await start.hover();
 await expect(page.getByRole('tooltip')).toContainText('HOME');
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await dragMarker(page, id, 100, -50);
 const destination = (await marker(page, id).boundingBox())!;
 await page.getByRole('button', { name: 'Animation step 2: Step 2', exact: true }).dblclick();
 await page.getByRole('button', { name: 'Create Play from Step', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Open Play 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
 await expect(page.locator('[data-step-id]')).toHaveCount(0);
 expect((await marker(page, id).boundingBox())!.x).toBeCloseTo(destination.x, 0);
 expect((await marker(page, id).boundingBox())!.y).toBeCloseTo(destination.y, 0);
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await expect(page.locator('[data-step-id]')).toHaveCount(1);
 await page.getByRole('button', { name: 'Open Play 1', exact: true }).click();
 await expect(page.locator('[data-step-id]')).toHaveCount(2);
});



test('dock grows to 75 percent then scrolls and supports narrower and wider manual sizes', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 const dock = page.getByRole('toolbar', { name: 'Play animation controls', exact: true });
 const steps = page.getByRole('group', { name: 'Animation steps', exact: true });
 const add = page.getByRole('button', { name: 'Add animation step', exact: true });
 for (let i = 0; i < 20; i++) await add.click();
 await expect.poll(async () => (await dock.boundingBox())!.width).toBe(1080);
 await expect(steps).toHaveCSS('overflow-x', 'auto');
 const resize = page.getByRole('button', { name: 'Resize animation dock from right', exact: true });
 const box = (await resize.boundingBox())!;
 await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
 await page.mouse.down();
 await page.mouse.move(box.x - 500, box.y + box.height / 2, { steps: 8 });
 await page.mouse.up();
 await expect.poll(async () => (await dock.boundingBox())!.width).toBeLessThan(650);
 await expect(steps).toHaveCSS('overflow-x', 'auto');
 expect(await steps.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
 await steps.evaluate(el => el.scrollLeft = el.scrollWidth);
 await expect(add).toBeInViewport();
 const left = (await page.getByRole('button', { name: 'Resize animation dock from left', exact: true }).boundingBox())!;
 await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
 await page.mouse.down();
 await page.mouse.move(8, left.y + left.height / 2, { steps: 8 });
 await page.mouse.up();
 const right = (await resize.boundingBox())!;
 await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
 await page.mouse.down();
 await page.mouse.move(1425, right.y + right.height / 2, { steps: 8 });
 await page.mouse.up();
 expect((await dock.boundingBox())!.width).toBeGreaterThan(1080);
});



test('overflowing steps wheel horizontally and adding a step reveals the plus button', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 const add = page.getByRole('button', { name: 'Add animation step', exact: true });
 const steps = page.getByRole('group', { name: 'Animation steps', exact: true });
 for (let i = 0; i < 20; i++) await add.click();
 await expect(steps).toHaveCSS('overflow-x', 'auto');
 await expect.poll(() => steps.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThan(2);
 await expect(add).toBeInViewport();
 await steps.hover();
 const pageY = await page.evaluate(() => window.scrollY);
 await page.mouse.wheel(0, -350);
 await expect.poll(() => steps.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeGreaterThan(100);
 expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
 await page.mouse.wheel(0, 350);
 await expect.poll(() => steps.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThan(2);
 await add.click();
 await expect.poll(() => steps.evaluate(el => el.scrollWidth - el.clientWidth - el.scrollLeft)).toBeLessThan(2);
 await expect(add).toBeInViewport();
 await expect(page.getByRole('button', { name: 'Animation step 22: Step 22', exact: true })).toBeInViewport();
});



test('right click opens the same element, toolbar, play, and animation editors as double click', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
 await page.keyboard.press('v');
 const ids = await page.locator('[data-layer-type="marker"]').evaluateAll(els => els.map(el => Number(el.getAttribute('data-layer-id'))));
 for (const id of ids) {
  await marker(page, id).click({ button: 'right', force: true });
  await expect(page.locator('[data-tutorial="marker-editor"]')).toBeVisible();
  await page.keyboard.press('Escape');
 }
 const guide = page.locator('[data-layer-type="guide"]').first();
 await guide.dispatchEvent('contextmenu', { button: 2 });
 await expect(page.locator('[data-tutorial="line-editor"]')).toBeVisible();
 await page.keyboard.press('Escape');
 await page.locator('[data-field-type="team-box-text"]').first().dispatchEvent('contextmenu', { button: 2 });
 await expect(page.getByRole('textbox', { name: 'Team box title', exact: true })).toBeVisible();
 await page.keyboard.press('Escape');
 await page.getByRole('button', { name: 'Open Play 1', exact: true }).click({ button: 'right' });
 await expect(page.getByRole('button', { name: 'Duplicate play', exact: true })).toBeVisible();
 await page.keyboard.press('Escape');
 await page.getByRole('button', { name: 'Laser Pointer', exact: true }).click({ button: 'right' });
 await expect(page.getByRole('dialog', { name: 'laser default format', exact: true })).toBeVisible();
 await page.keyboard.press('Escape');
 await page.keyboard.press('v');
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await dragMarker(page, ids[0], 100, -40);
 await page.locator(`[data-animation-ghost="${ids[0]}"]`).dispatchEvent('contextmenu', { button: 2, clientX: 600, clientY: 300 });
 await expect(page.getByRole('dialog', { name: 'Movement path options', exact: true })).toBeVisible();
 await page.keyboard.press('Escape');
 await page.locator(`[data-animation-route="${ids[0]}"] path[pointer-events="stroke"]`).dispatchEvent('contextmenu', { button: 2, clientX: 600, clientY: 300 });
 await expect(page.getByRole('dialog', { name: 'Movement path options', exact: true })).toBeVisible();
});



test('seven timeline controls are ordered, evenly spaced, and navigate and scrub', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
 const controls = page.getByRole('group', { name: 'Timeline playback controls', exact: true });
 const names = ['Go to animation start', 'Previous animation step', 'Rewind animation', 'Restart animation', 'Fast forward animation', 'Next animation step', 'Go to animation end'];
 expect(await controls.locator('button').evaluateAll(els => els.map(el => el.getAttribute('aria-label')))).toEqual(names);
 const boxes = await controls.locator('button').evaluateAll(els => els.map(el => { const b=el.getBoundingClientRect(); return {x:b.x, y:b.y, width:b.width, height:b.height}; }));
 for (let i=1; i<boxes.length; i++) {
  expect(boxes[i].x - boxes[i-1].x).toBeCloseTo(boxes[1].x - boxes[0].x, 2);
  expect(boxes[i].y).toBe(boxes[0].y);
 }
 const slider = page.getByRole('slider', { name: 'Animation playhead', exact: true });
 await controls.getByRole('button', { name: names[0], exact: true }).click();
 await expect(slider).toHaveValue('0');
 await controls.getByRole('button', { name: names[5], exact: true }).click();
 await expect(slider).toHaveValue('1');
 await controls.getByRole('button', { name: names[2], exact: true }).click();
 await expect(slider).toHaveValue('0.75');
 await controls.getByRole('button', { name: names[4], exact: true }).click();
 await expect(slider).toHaveValue('1');
 await controls.getByRole('button', { name: names[6], exact: true }).click();
 await expect(slider).toHaveValue('2');
 await controls.getByRole('button', { name: names[1], exact: true }).click();
 await expect(slider).toHaveValue('1');
 await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') });
 await page.clock.pauseAt(new Date('2026-11-01T12:00:01Z'));
 const rewind = (await controls.getByRole('button', { name: names[2], exact: true }).boundingBox())!;
 await page.mouse.move(rewind.x + rewind.width/2, rewind.y + rewind.height/2);
 await page.mouse.down();
 await page.clock.runFor(400);
 expect(Number(await slider.inputValue())).toBeLessThan(.65);
 await page.mouse.up();
 const stopped = await slider.inputValue();
 await page.clock.runFor(300);
 await expect(slider).toHaveValue(stopped);
});



test('arrows shuttle at 2x without pausing and endpoints expose Restart', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Animate play', exact: true }).click();
 for(let i=0;i<10;i++) await page.getByRole('button', {name:'Add animation step',exact:true}).click();
 const start=page.getByRole('button',{name:'Go to animation start',exact:true});
 const end=page.getByRole('button',{name:'Go to animation end',exact:true});
 const slider=page.getByRole('slider',{name:'Animation playhead',exact:true});
 await start.click();
 await expect(start).toBeDisabled();
 await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});
 await page.clock.pauseAt(new Date('2026-11-01T12:00:01Z'));
 await page.getByRole('button',{name:'Cycle playback speed',exact:true}).click();
 await page.getByRole('button',{name:'Play animation',exact:true}).click();
 await page.clock.runFor(1000);
 expect(Number(await slider.inputValue())).toBeCloseTo(1.25,1);
 const before=Number(await slider.inputValue());
 await page.keyboard.down('ArrowRight');
 await page.clock.runFor(1000);
 expect(Number(await slider.inputValue())-before).toBeCloseTo(2,1);
 await expect(page.getByRole('button',{name:'Pause animation',exact:true})).toBeVisible();
 await page.keyboard.up('ArrowRight');
 const released=Number(await slider.inputValue());
 await page.clock.runFor(1000);
 expect(Number(await slider.inputValue())-released).toBeCloseTo(1.25,1);
 await page.keyboard.down('ArrowLeft');
 const rewind=Number(await slider.inputValue());
 await page.clock.runFor(1000);
 expect(rewind-Number(await slider.inputValue())).toBeCloseTo(2,1);
 await page.keyboard.up('ArrowLeft');
 await page.getByRole('button',{name:'Pause animation',exact:true}).click();
 await page.keyboard.down('Shift');
 await page.keyboard.down('ArrowRight');
 const paused=Number(await slider.inputValue());
 await page.clock.runFor(500);
 expect(Number(await slider.inputValue())-paused).toBeCloseTo(1,1);
 await page.keyboard.up('ArrowRight');
 await page.keyboard.up('Shift');
 const stopped=await slider.inputValue();
 await page.clock.runFor(500);
 await expect(slider).toHaveValue(stopped);
 await end.click();
 await expect(end).toBeDisabled();
 const restart=page.getByRole('button',{name:'Restart animation',exact:true});
 await expect(restart).toBeVisible();
 await restart.hover();
 await expect(page.getByRole('tooltip')).toContainText('Restart');
 await restart.click();
 await expect(page.getByRole('button',{name:'Pause animation',exact:true})).toBeVisible();
 await expect(slider).toHaveValue('0');
});



test('held transport scrubs smoothly without the single-click skip and buttons have no focus ring', async ({ page }) => {
 await ready(page);
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 for(let i=0;i<4;i++) await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 await page.getByRole('button',{name:'Animation step 3: Step 3',exact:true}).click();
 const slider=page.getByRole('slider',{name:'Animation playhead',exact:true});
 await page.clock.install({time:new Date('2026-11-01T12:00:00Z')});
 await page.clock.pauseAt(new Date('2026-11-01T12:00:01Z'));
 const rewind=page.getByRole('button',{name:'Rewind animation',exact:true});
 const box=(await rewind.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await expect(slider).toHaveValue('2');
 await page.clock.runFor(100);
 await expect(slider).toHaveValue('2');
 await page.clock.runFor(300);
 expect(Number(await slider.inputValue())).toBeCloseTo(1.6,1);
 await page.mouse.up();
 const released=await slider.inputValue();
 await page.clock.runFor(200);
 await expect(slider).toHaveValue(released);
 await rewind.click();
 expect(Number(await slider.inputValue())).toBeCloseTo(Number(released)-.25,2);
 const play=page.getByRole('button',{name:'Play animation',exact:true});
 await play.focus();
 await expect(play).toHaveCSS('outline-style','none');
 await expect(play).toHaveCSS('box-shadow','none');
});



test('animation tutorial uses a temporary default play, teaches adding and moving, and restores on completion and exit', async ({ page }, testInfo) => {
 await ready(page);
 await page.getByRole('button',{name:'Set up default play',exact:true}).click();
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const id=Number(await page.locator('[data-field-kind="team-a"]').first().getAttribute('data-layer-id'));
 await dragMarker(page,id,70,-30);
 const before=(await marker(page,id).boundingBox())!;
 let saves=0;
 page.on('request',r=>{if(r.url().includes('/api/play-builders')&&['POST','PUT'].includes(r.method())) saves++;});
 const launch=page.getByRole('button',{name:'Start animation tutorial',exact:true});
 await launch.click();
 const title=page.locator('.driver-popover-title');
 await expect(title).toHaveText('Add Your First Step');
 await expect(page.getByRole('button',{name:'Open Tutorial',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-step-id]')).toHaveCount(1);
 await expect(page.locator('[data-field-kind="official-r"]')).toBeVisible();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 await expect(title).toHaveText('Move Any Element');
 const tutorialId=Number(await page.locator('[data-field-kind="official-r"]').first().getAttribute('data-layer-id'));
 await dragMarker(page,tutorialId,90,-30);
 await expect(title).toHaveText('Origins and Routes');
 for(let i=0;i<25&&await title.count();i++) {
  if(await title.textContent()==='Choose a Movement Path') {
   await page.locator('[data-animation-route] path[pointer-events="stroke"]').first().dispatchEvent('dblclick',{clientX:700,clientY:350});
   await expect(title).toHaveText('Movement Paths');
   await expect(page.locator('[data-animation-path-picker]')).toBeVisible();
   await expect(page.locator('[data-animation-path-picker]')).toHaveClass(/driver-active-element/);
   await page.waitForTimeout(350);
   await page.screenshot({path:testInfo.outputPath('animation-tutorial-path.png')});
  }
  if(await title.textContent()==='Snap Movement and Revert') {
   await page.keyboard.press('k');
   await expect(page.getByRole('button',{name:'Pause animation',exact:true})).toHaveCount(0);
   await expect(page.locator(`[data-animation-route="${tutorialId}"]`)).toHaveCount(1);
   await marker(page,tutorialId).click();
   await page.getByRole('button',{name:'Revert to original position',exact:true}).click();
   await expect(page.locator(`[data-animation-route="${tutorialId}"]`)).toHaveCount(0);
   await dragMarker(page,tutorialId,90,-30);
  }
  if(await title.textContent()==='Drag a Step to Adjust Duration') {
   await expect(page.locator('[data-step-id]')).toHaveCount(3);
   const time=Number(await page.getByRole('slider',{name:'Animation playhead',exact:true}).inputValue());
   const markerTime=Number((await page.locator('[data-animation-step-marker]').nth(1).getAttribute('aria-label'))!.match(/at ([\d.]+) seconds/)![1]);
   expect(markerTime-time).toBeCloseTo(.25,2);
  }
  if(await title.textContent()==='Show or Hide Ghosts') await expect(page.locator('.steps button.active')).toContainText('Step 2');
  if(await title.textContent()==='Build the Next Movement') {
   await page.getByRole('button',{name:'Add animation step',exact:true}).click();
   await expect(title).toHaveText('Set the Step Duration');
  }
  if(await title.textContent()==='Add, Remove, and Rename') await expect(page.locator('.steps button.active')).toContainText('Step 3');
  if(await title.textContent()==='Manage Steps') {
   await page.locator('[data-step-id]').last().click({button:'right'});
   const actions=page.getByRole('group',{name:'Step actions',exact:true});
   await expect(actions.getByRole('button',{name:'Delete',exact:true})).toBeDisabled();
   await page.getByRole('button',{name:'Add animation step',exact:true}).click();
   await page.locator('[data-step-id]').last().click({button:'right'});
   await expect(actions.getByRole('button',{name:'Delete',exact:true})).toBeEnabled();
   await actions.getByRole('button',{name:'Delete',exact:true}).click();
   await expect(page.locator('[data-step-id]')).toHaveCount(3);
  }
  if(await title.textContent()==='Draw a Custom Route') {
   await page.getByRole('dialog',{name:'Movement path options',exact:true}).getByRole('button',{name:'Custom',exact:true}).click();
   const surface=page.getByRole('application',{name:'Draw movement route',exact:true});
   const bounds=(await surface.boundingBox())!;
   await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.7);
   await page.mouse.down();
   await page.mouse.move(bounds.x+bounds.width*.85,bounds.y+bounds.height*.6,{steps:10});
   await page.mouse.up();
   await expect(surface).toHaveCount(0);
  }
  if(await title.textContent()==='Departure and Arrival') {
   const picker=page.locator('[data-animation-path-picker]');
   await expect(picker.getByRole('button',{name:'Redraw',exact:true})).toHaveCount(1);
   await expect(picker.getByRole('button',{name:'Custom',exact:true})).toHaveCount(0);
   const handle=picker.getByRole('button',{name:/ start time$/});
   await handle.press('Shift+ArrowRight');
   await expect(picker).toContainText('0.01–');
  }
  if(await title.textContent()==='Easing and Jump Cuts') {
   const picker=page.locator('[data-animation-path-picker]');
   await picker.getByRole('button',{name:'Path easing',exact:true}).click();
   const menu=picker.getByRole('listbox',{name:'Path easing',exact:true});
   await expect(menu).toBeVisible();
   const outer=(await picker.boundingBox())!, inner=(await menu.boundingBox())!;
   expect(inner.y+inner.height).toBeLessThanOrEqual(outer.y+outer.height);
   await picker.getByRole('option',{name:'Ease In',exact:true}).click();
  }
  if(await title.textContent()==='Clear, Undo, and Redo') {
   await expect(page.locator('[data-animation-tutorial-highlights="3"]')).toHaveCount(1);
   await page.getByRole('button',{name:'Undo',exact:true}).click();
   await expect(page.getByRole('button',{name:'Redo',exact:true})).toBeEnabled();
   await page.getByRole('button',{name:'Redo',exact:true}).click();
  }
  if(await title.textContent()==='Set the Step Duration') {
   const input=page.getByRole('spinbutton',{name:'Step duration seconds',exact:true});
   await input.fill('2');await input.press('Tab');await expect(input).toHaveValue('2');
  }
  if(await title.textContent()==='Move and Resize the Animation Doc') {
   const panel=page.getByRole('toolbar',{name:'Play animation controls',exact:true});
   await expect(panel.locator('.dock-resize svg').first()).toHaveCSS('opacity','1');
   const overlay=page.locator('.driver-overlay path');
   const beforePath=await overlay.getAttribute('d');
   const resize=(await page.getByRole('button',{name:'Resize animation dock from right',exact:true}).boundingBox())!;
   await page.mouse.move(resize.x+resize.width/2,resize.y+resize.height/2);
   await page.mouse.down();
   await page.mouse.move(resize.x-70,resize.y+resize.height/2,{steps:8});
   await page.mouse.up();
   await expect(overlay).not.toHaveAttribute('d',beforePath!);
  }
  const previousTitle=await title.textContent();
  await page.locator('.driver-popover-next-btn').click();
  await expect.poll(async()=>await title.count()?await title.textContent():null).not.toBe(previousTitle);
 }
 await expect(title).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Open Tutorial',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Open Play 1',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-step-id]')).toHaveCount(2);
 expect((await marker(page,id).boundingBox())!.x).toBeCloseTo(before.x,0);
 expect((await marker(page,id).boundingBox())!.y).toBeCloseTo(before.y,0);
 expect(saves).toBe(0);
 expect(await page.evaluate(()=>Object.entries(localStorage).filter(([key])=>key.includes('draft')).some(([,value])=>value.includes('Tutorial')))).toBe(false);
 await launch.click();
 await expect(title).toBeVisible();
 await page.getByRole('button',{name:'End tutorial',exact:true}).click();
 await expect(page.getByRole('button',{name:'Open Tutorial',exact:true})).toHaveCount(0);
 await expect(page.locator('[data-step-id]')).toHaveCount(2);
 expect((await marker(page,id).boundingBox())!.x).toBeCloseTo(before.x,0);
});



test('animation Shift movement snaps from previous-step origin and selected text keeps native copy', async ({ page }) => {
 await ready(page);
 await page.getByRole('button',{name:'Set up default play',exact:true}).click();
 const id=Number(await page.locator('[data-field-kind="team-a"]').first().getAttribute('data-layer-id'));
 const position=()=>marker(page,id).locator('circle').first().evaluate(el=>({x:Number(el.getAttribute('cx')),y:Number(el.getAttribute('cy'))}));
 const origin=await position();
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 await dragMarker(page,id,80,20);
 await page.keyboard.down('Shift');
 await dragMarker(page,id,30,70);
 await page.keyboard.up('Shift');
 const snapped=await position();
 expect(snapped.x-origin.x).toBeCloseTo(snapped.y-origin.y,1);
 await page.evaluate(()=>{const text=document.createElement('p');text.textContent='Selected text';text.style.userSelect='text';text.tabIndex=0;document.body.appendChild(text);text.focus();const range=document.createRange();range.selectNodeContents(text);const selection=window.getSelection()!;selection.removeAllRanges();selection.addRange(range);});
 const prevented=await page.evaluate(()=>!document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'c',code:'KeyC',ctrlKey:true,bubbles:true,cancelable:true})));
 expect(prevented).toBe(false);
 await page.evaluate(()=>window.getSelection()?.removeAllRanges());
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:700,clientY:300});
 await page.getByRole('dialog',{name:'Movement path options',exact:true}).getByRole('button',{name:'Custom',exact:true}).click();
 const surface=page.getByRole('application',{name:'Draw movement route',exact:true});
 const bounds=(await surface.boundingBox())!;
 await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.3);
 await page.mouse.down();
 await page.mouse.move(bounds.x+bounds.width*.8,bounds.y+bounds.height*.4,{steps:8});
 await page.mouse.up();
 const customStart=await position();
 await page.keyboard.down('Shift');
 await dragMarker(page,id,40,70);
 await page.keyboard.up('Shift');
 const customEnd=await position();
 expect(customEnd.x-customStart.x).toBeCloseTo(customEnd.y-customStart.y,1);
});



test('Shift dragging departure and arrival uses hundredth-second increments', async ({ page }) => {
 await ready(page);
 await page.getByRole('button',{name:'Set up default play',exact:true}).click();
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const id=Number(await page.locator('[data-field-kind="team-a"]').first().getAttribute('data-layer-id'));
 await dragMarker(page,id,100,-30);
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:700,clientY:300});
 const picker=page.locator('[data-animation-path-picker]');
 const rail=(await picker.locator('[data-timing-rail]').boundingBox())!;
 const drag=async(name:RegExp,delta:number)=>{
  const box=(await picker.getByRole('button',{name}).boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+rail.width*delta,box.y+box.height/2,{steps:8});
  await page.mouse.up();
  await page.keyboard.up('Shift');
 };
 await drag(/ start time$/,.13);
 await expect(picker).toContainText(/0\.1[234]–1\.00s/);
 await drag(/ arrival time$/,-.17);
 await expect(picker).toContainText(/0\.1[234]–0\.8[234]s/);
});



test('Shift dragging an interior step marker adjusts durations in hundredths', async ({ page }) => {
 await ready(page);
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 for(let i=0;i<2;i++) await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const marker=page.locator('[data-animation-step-marker]').nth(1);
 const box=(await marker.boundingBox())!;
 const rail=(await page.locator('.playback-timeline').boundingBox())!;
 await page.keyboard.down('Shift');
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+(rail.width-12)*.13/2,box.y+box.height/2,{steps:8});
 await page.mouse.up();
 await page.keyboard.up('Shift');
 const label=await marker.getAttribute('aria-label');
 const time=Number(label!.match(/at ([\d.]+) seconds/)![1]);
 expect(time).toBeGreaterThanOrEqual(1.12);
 expect(time).toBeLessThanOrEqual(1.14);
 expect(Math.round(time*100)%5).not.toBe(0);
 await expect(page.locator('[data-animation-step-marker]').last()).toHaveAttribute('aria-label','Select Step 3 at 2 seconds');
});


test('anonymous animation save survives reload and shared duplication preserves editing', async ({ page, browser }) => {
 await ready(page);
 await page.getByRole('button',{name:'Set up default play',exact:true}).click();
 const id=Number(await page.locator('[data-field-kind="official-r"]').getAttribute('data-layer-id'));
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 await dragMarker(page,id,80,-30);
 const duration=page.getByRole('spinbutton',{name:'Step duration seconds',exact:true});await duration.fill('5');await duration.press('Tab');
 const destination=(await marker(page,id).boundingBox())!;
 const savedResponse=page.waitForResponse(r=>r.url().endsWith('/api/play-builders')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Save play',exact:true}).click();
 const response=await savedResponse;
 expect(response.status()).toBe(201);
 const saved=await response.json();
 await page.waitForURL(`**/diagram/flag-football/${saved.id}`);
 await page.reload();
 await expect(page.getByRole('button',{name:'Animate play',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Animate play',exact:true}).click();
 await page.getByRole('button',{name:'Animation step 2: Step 2',exact:true}).click();
 expect((await marker(page,id).boundingBox())!.x).toBeCloseTo(destination.x,0);
 const viewer=await browser.newContext({viewport:{width:1440,height:1100}});
 const shared=await viewer.newPage();
 await shared.goto(`/diagram/flag-football/${saved.id}`);
 const consent=shared.getByRole('button',{name:/^Essential Cookies Only/});if(await consent.isVisible())await consent.click();
 await expect(shared.getByRole('button',{name:'Animate play',exact:true})).toHaveCount(0);
 await expect(shared.getByRole('button',{name:'Play animation',exact:true})).toBeEnabled();
 await shared.getByRole('button',{name:'Play animation',exact:true}).click();
 await expect(shared.getByRole('button',{name:'Pause animation',exact:true})).toBeVisible();
 await shared.keyboard.press('k');
 await shared.getByRole('button',{name:'Duplicate this play builder',exact:true}).click();
 await shared.waitForURL(url=>url.pathname.startsWith('/diagram/flag-football/')&&!url.pathname.endsWith(saved.id));
 await shared.getByRole('button',{name:'Animate play',exact:true}).click();
 await expect(shared.locator('[data-step-id]')).toHaveCount(2);
 await viewer.close();
});


test('Animate NEW bounce and animation tutorial pulse stop after first use in this browser', async ({ page }) => {
 await page.addInitScript(()=>localStorage.setItem('caseplay-play-builder-settings-v1',JSON.stringify({drafts:false})));
 await ready(page);
 const launch=page.getByRole('button',{name:'Animate play',exact:true});
 const group=page.locator('[aria-label="Animation controls"]');
 await expect(group).toHaveClass(/tutorial-launch-bouncing/);
 await expect(launch.locator('[data-animation-new]')).toHaveText('NEW');
 await launch.click();
 await expect(group).not.toHaveClass(/tutorial-launch-bouncing/);
 await expect(launch.locator('[data-animation-new]')).toHaveCount(0);
 const tutorial=page.getByRole('button',{name:'Start animation tutorial',exact:true});
 await expect(tutorial).toHaveClass(/pulse-tutorial/);
 await page.reload();
 await expect(group).not.toHaveClass(/tutorial-launch-bouncing/);
 await expect(launch.locator('[data-animation-new]')).toHaveCount(0);
 await launch.click();
 await expect(tutorial).toHaveClass(/pulse-tutorial/);
 await tutorial.click();
 await page.getByRole('button',{name:'End tutorial',exact:true}).click();
 await expect(tutorial).not.toHaveClass(/pulse-tutorial/);
 await page.reload();
 await launch.click();
 await expect(tutorial).not.toHaveClass(/pulse-tutorial/);
});
