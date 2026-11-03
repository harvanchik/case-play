import { test, expect, type Page } from '@playwright/test';
async function ready(page: Page, duration = '4') {
	await page.goto('/diagram/flag-football');
	await page.waitForSelector('.tutorial-launch-bouncing');
	const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
	if (await consent.isVisible()) await consent.click();
	await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
	await page.getByRole('button', { name: 'Animate play', exact: true }).click();
	await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
	const seconds = page.getByRole('spinbutton', { name: 'Step duration seconds', exact: true });
	await seconds.fill(duration);
	await seconds.press('Enter');
	await seconds.press('Tab');
}
async function draw(page: Page, y: number) {
	const b = (await page.locator('svg[role="application"]').boundingBox())!;
	await page.mouse.move(b.x + b.width * 0.4, b.y + b.height * y);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * (y + 0.025), { steps: 12 });
	await page.mouse.up();
}
async function seek(page: Page, time: number) {
	await page.getByRole('slider', { name: 'Animation playhead', exact: true }).evaluate((node, time) => {
		const input = node as HTMLInputElement;
		input.value = String(time);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	}, time);
}
test('drawings reveal in their step, can be bulk edited, and survive save and reload', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await ready(page);
	const drawButton = page.getByRole('button', { name: 'Free Draw', exact: true });
	await drawButton.click();
	await draw(page, 0.4);
	await draw(page, 0.6);
	await drawButton.click();
	await expect(drawButton).toHaveAttribute('aria-pressed', 'false');
	const strokes = page.locator('[data-drawing-id]');
	await expect(strokes).toHaveCount(2);
	await strokes.first().dispatchEvent('dblclick', { clientX: 650, clientY: 300, button: 0 });
	const picker = page.locator('[data-drawing-animation-picker]');
	await expect(picker).toBeVisible();
	await expect(picker.locator('.timing-start')).toHaveValue('2.00s');
	await expect(picker.locator('.timing-end')).toHaveValue('4.00s');
	await expect(picker).toContainText('2.0\u00d7');
	await picker.getByRole('button', { name: 'Shift Drawing movement', exact: true }).click();
	await picker.getByRole('button', { name: 'Shift Drawing movement', exact: true }).click();
	await expect(picker).toContainText('1.25\u00d7');
	await expect(picker.locator('.timing-end')).toHaveValue('3.20s');
	await picker.getByRole('button', { name: 'Drawing arrival time', exact: true }).press('ArrowLeft');
	await expect(picker).toContainText('1.27\u00d7');
	await expect(picker.locator('.timing-end')).toHaveValue('3.15s');
	await picker.getByRole('button', { name: 'Drawing arrival time', exact: true }).press('ArrowRight');
	await picker.getByRole('button', { name: 'Shift Drawing movement', exact: true }).press('ArrowRight');
	await expect(picker).toContainText('1.25\u00d7');
	await expect(picker.locator('.timing-start')).toHaveValue('0.05s');
	await expect(picker.locator('.timing-end')).toHaveValue('3.25s');
	await picker.getByRole('button', { name: 'Shift Drawing movement', exact: true }).press('ArrowLeft');
	await picker.getByRole('button', { name: 'Drawing easing', exact: true }).click();
	await picker.getByRole('option', { name: 'Ease In', exact: true }).click();
	await picker.getByRole('button', { name: 'Instant', exact: true }).click();
	await strokes.last().dispatchEvent('dblclick', { clientX: 650, clientY: 400, button: 0, shiftKey: true });
	await expect(picker).toHaveAttribute('aria-label', 'Drawing animation options for selected drawings');
	await picker.getByRole('button', { name: 'Draw', exact: true }).click();
	await page.keyboard.press('Escape');
	const field = (await page.locator('svg[role="application"]').boundingBox())!;
	await page.mouse.move(field.x + field.width * 0.37, field.y + field.height * 0.35);
	await page.mouse.down();
	await page.mouse.move(field.x + field.width * 0.63, field.y + field.height * 0.68, { steps: 12 });
	await page.mouse.up();
	await strokes.first().dispatchEvent('dblclick', { clientX: 650, clientY: 300 });
	await expect(picker).toHaveAttribute('aria-label', 'Drawing animation options for selected drawings');
	await picker.getByRole('button', { name: 'Instant', exact: true }).click();
	await picker.getByRole('button', { name: 'Draw', exact: true }).click();
	await page.keyboard.press('Escape');

	await page.keyboard.press('Home');
	await expect(strokes).toHaveCount(0);
	await seek(page, 0.5);
	await expect(strokes).toHaveCount(2);
	await seek(page, 3);
	await expect(strokes).toHaveCount(2);
	await page.keyboard.press('End');
	await expect(strokes).toHaveCount(2);
	const response = page.waitForResponse((r) => r.url().endsWith('/api/play-builders') && r.request().method() === 'POST');
	await page.getByRole('button', { name: 'Save play', exact: true }).click();
	const saved = await response;
	expect(saved.status()).toBe(201);
	const value = await saved.json();
	await page.waitForURL((url) => url.pathname.endsWith(value.id));
	await page.reload();
	await page.waitForLoadState('networkidle');
	await page.getByRole('button', { name: 'Animate play', exact: true }).click();
	await page.keyboard.press('End');
	await expect(strokes).toHaveCount(2);
	await strokes.first().dispatchEvent('dblclick', { clientX: 650, clientY: 300, button: 0 });
	await expect(picker).toContainText('1.25×');
	await expect(picker.getByRole('button', { name: 'Drawing easing', exact: true })).toContainText('Ease In');
	expect(errors).toEqual([]);
});
test('laser works during playback and between steps without the disabled cursor', async ({ page }) => {
	await ready(page, '6');
	await page.getByRole('button', { name: 'Laser Pointer', exact: true }).click();
	await page.keyboard.press('k');
	await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toBeVisible();
	await draw(page, 0.4);
	await expect(page.locator('[data-laser-drawing]')).not.toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toBeVisible();
	await page.keyboard.press('k');
	await seek(page, 3);
	const svg = page.locator('svg[role="application"]');
	await expect(svg).toHaveClass(/laser-cursor/);
	expect(await svg.evaluate((node) => getComputedStyle(node).cursor)).toBe('none');
	await expect(page.getByText('Select a Step to Move Elements', { exact: true })).not.toBeVisible();
	await draw(page, 0.6);
	await expect(page.locator('[data-laser-drawing]')).toHaveCount(2);
	await page.keyboard.press('Home');
	await expect(page.locator('[data-laser-drawing]')).toHaveCount(2);
	await page.getByRole('button', { name: 'Show ghosts', exact: true }).focus();
	await page.keyboard.press('c');
	await expect(page.locator('[data-laser-drawing]')).toHaveCount(0);
});
test('selecting a removed ghost offers Revert and restores its previous-step position', async ({ page }) => {
	await ready(page);
	const marker = page.locator('[data-field-kind="team-a"]').first();
	const id = await marker.getAttribute('data-layer-id');
	const b = (await marker.boundingBox())!;
	await marker.click();
	await page.getByRole('button', { name: 'Delete element', exact: true }).click();
	await expect(marker).toHaveCount(0);
	const ghost = page.locator(`[data-animation-ghost="${id}"]`);
	await ghost.dispatchEvent('pointerdown', { button: 0 });
	const revert = page.getByRole('button', { name: 'Revert to original position', exact: true });
	await expect(revert).toBeVisible();
	await revert.click();
	await expect(marker).toHaveCount(1);
	expect((await marker.boundingBox())!.x).toBeCloseTo(b.x, 0);
});
test('guide Shift/Jump controls, effects, speed cycling, and per-step downs work together', async ({ page }) => {
	await ready(page, '4');
	const guide = page.locator('[data-layer-type="guide"][data-tutorial-kind="line-to-gain"]');
	const id = await guide.getAttribute('data-layer-id');
	const line = guide.locator('line').first();
	const b = (await line.boundingBox())!;
	await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.55);
	await page.mouse.down();
	await page.mouse.move(b.x + b.width / 2 + 100, b.y + b.height * 0.55, { steps: 10 });
	await page.mouse.up();
	await expect(page.locator(`[data-animation-route="${id}"]`)).toHaveCount(1);
	await page.keyboard.press('v');
	await page.locator('[data-down-marker]').last().click();
	await page.getByRole('group', { name: 'Select down', exact: true }).getByRole('button', { name: '2nd', exact: true }).click();
	await page.keyboard.press('Home');
	await expect(page.locator('[data-down-marker]').last()).toContainText('1st');
	await page.keyboard.press('End');
	await expect(page.locator('[data-down-marker]').last()).toContainText('2nd');
	await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick', { clientX: 600, clientY: 300 });
	const picker = page.locator('[data-animation-path-picker]');
	await expect(picker.getByRole('button', { name: 'Shift', exact: true })).toBeVisible();
	await expect(picker.getByRole('button', { name: 'Curved', exact: true })).toHaveCount(0);
	await picker.getByRole('button', { name: 'Shift guide movement', exact: true }).click();
	await expect(picker).toContainText('1.25×');
	await picker.getByRole('button', { name: 'Jump', exact: true }).click();
	await picker.getByRole('button', { name: 'Path easing', exact: true }).click();
	await expect(picker.getByRole('option', { name: 'Hard Cut', exact: true })).toBeVisible();
	await expect(picker.getByRole('option', { name: 'Fade', exact: true })).toBeVisible();
	await expect(picker.getByRole('option', { name: 'Shrink', exact: true })).toHaveCount(0);
	await picker.getByRole('option', { name: 'Fade', exact: true }).click();
	await page.keyboard.press('Escape');
	await seek(page, 0.05);
	await expect(page.locator('[data-down-marker]').last()).toContainText('1st');
	await expect(guide).toHaveAttribute('opacity', /0\./);
	await seek(page, 0.3);
	await expect(page.locator('[data-down-marker]').last()).toContainText('2nd');
});


test('element animation editors replace each other and close on outside clicks', async ({ page }) => {
 await ready(page);
 const guide = page.locator('[data-layer-type="guide"][data-tutorial-kind="line-to-gain"]');
 const id = await guide.getAttribute('data-layer-id');
 const box = (await guide.locator('line').first().boundingBox())!;
 await page.mouse.move(box.x + box.width / 2, box.y + box.height * .55);
 await page.mouse.down();
 await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height * .55, { steps: 10 });
 await page.mouse.up();
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 await draw(page, .4);
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 const route = page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`);
 const pathPicker = page.locator('[data-animation-path-picker]');
 const drawingPicker = page.locator('[data-drawing-animation-picker]');
 await route.dispatchEvent('dblclick', { clientX: 600, clientY: 300 });
 await expect(pathPicker).toBeVisible();
 await page.locator('[data-drawing-id]').first().dispatchEvent('dblclick', { clientX: 700, clientY: 400, button: 0 });
 await expect(drawingPicker).toBeVisible();
 await expect(pathPicker).toHaveCount(0);
 await route.dispatchEvent('dblclick', { clientX: 600, clientY: 300 });
 await expect(pathPicker).toBeVisible();
 await expect(drawingPicker).toHaveCount(0);
 // Element handlers stop bubbling; capture must still dismiss the picker.
 await guide.dispatchEvent('pointerdown', { clientX: 800, clientY: 350, button: 0, pointerId: 1 });
 await expect(pathPicker).toHaveCount(0);
 await page.mouse.up();
 await page.locator('[data-drawing-id]').first().dispatchEvent('dblclick', { clientX: 700, clientY: 400, button: 0 });
 await expect(drawingPicker).toBeVisible();
 await page.getByRole('button', { name: 'Show ghosts', exact: true }).click();
 await expect(drawingPicker).toHaveCount(0);
});


test('narrow timing bars keep speed labels visible on either available side', async ({ page }) => {
 await ready(page);
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 await draw(page, .4);
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 await page.locator('[data-drawing-id]').first().dispatchEvent('dblclick', { clientX: 650, clientY: 300, button: 0 });
 const picker = page.locator('[data-drawing-animation-picker]');
 const end = picker.getByRole('button', { name: 'Drawing arrival time', exact: true });
 for(let i=0;i<38;i++) await end.press('ArrowLeft');
 const speed = picker.locator('[data-speed-label]');
 await expect(speed).toHaveAttribute('data-outside', 'true');
 const bar = picker.locator('.bar');
 let labelBox = (await speed.boundingBox())!;
 let barBox = (await bar.boundingBox())!;
 expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(barBox.x);
 const middle = picker.getByRole('button', { name: 'Shift Drawing movement', exact: true });
 for(let i=0;i<40;i++) await middle.press('ArrowLeft');
 labelBox = (await speed.boundingBox())!;
 barBox = (await bar.boundingBox())!;
 expect(labelBox.x).toBeGreaterThanOrEqual(barBox.x + barBox.width);
 const railBox = (await picker.locator('[data-timing-rail]').boundingBox())!;
 expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(railBox.x + railBox.width);
});


test('inline movement times clamp to the step and retain authored seconds after resizing', async ({ page }) => {
 await ready(page, '1');
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 await draw(page, .4);
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 await page.locator('[data-drawing-id]').first().dispatchEvent('dblclick', { clientX: 650, clientY: 300, button: 0 });
 const picker = page.locator('[data-drawing-animation-picker]');
 const start = picker.locator('.timing-start'), end = picker.locator('.timing-end');
 await start.click();
 expect(await start.evaluate((input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!)).toBe(4);
 await start.fill('0.1'); await start.press('Enter');
 await expect(start).toHaveValue('0.10s');
 await end.fill('0.6'); await end.press('Enter');
 await expect(end).toHaveValue('0.60s');
 await page.getByRole('spinbutton', { name: 'Step duration seconds', exact: true }).fill('2');
 await page.getByRole('spinbutton', { name: 'Step duration seconds', exact: true }).press('Tab');
 await page.locator('[data-drawing-id]').first().dispatchEvent('dblclick', { clientX: 650, clientY: 300, button: 0 });
 await expect(start).toHaveValue('0.10s'); await expect(end).toHaveValue('0.60s');
 await end.fill('99s'); await end.press('Enter'); await expect(end).toHaveValue('2.00s');
 await start.fill('99'); await start.press('Enter'); await expect(start).toHaveValue('1.99s');
 await end.fill('0'); await end.press('Enter'); await expect(end).toHaveValue('2.00s');
 await start.fill('0'); await start.press('Enter');
 await end.fill('0'); await end.press('Enter'); await expect(end).toHaveValue('0.01s');
});


test('drawings have separate color and animation editors, drag by step, and support Revert and Delete', async ({ page }) => {
 await ready(page, '1');
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 await draw(page,.4);
 await page.getByRole('button', { name: 'Free Draw', exact: true }).click();
 const hit=page.locator('[data-drawing-hit]').first();
 await hit.click();
 await expect(page.locator('[data-drawing-style-picker]')).toBeVisible();
 await expect(page.locator('[data-drawing-animation-picker]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Delete drawing',exact:true})).toBeVisible();
 await page.locator('[data-drawing-style-picker]').getByRole('button',{name:'Blue',exact:true}).click();
 const drawing=page.locator('[data-free-drawing]').first();
 const blue=await drawing.getAttribute('stroke');
 expect(blue).not.toBeNull();
 await hit.dblclick();
 await expect(page.locator('[data-drawing-animation-picker]')).toBeVisible();
 await expect(page.locator('[data-drawing-style-picker]')).toHaveCount(0);
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const originalX=await drawing.evaluate((node: SVGPathElement)=>node.getPointAtLength(0).x);
 const original=(await hit.boundingBox())!;
 await page.mouse.move(original.x+original.width/2,original.y+original.height/2);
 await page.mouse.down();await page.mouse.move(original.x+original.width/2+100,original.y+original.height/2+40,{steps:10});await page.mouse.up();
 const moved=(await hit.boundingBox())!;
 expect(moved.x-original.x).toBeCloseTo(100,0);
 await expect(page.locator('[data-drawing-ghost]')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Revert drawing to original position',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Revert drawing to original position',exact:true}).click();
 expect((await hit.boundingBox())!.x).toBeCloseTo(original.x,0);
 await expect(page.getByRole('button',{name:'Revert drawing to original position',exact:true})).toHaveCount(0);
 await page.mouse.move(original.x+original.width/2,original.y+original.height/2);
 await page.mouse.down();await page.mouse.move(original.x+original.width/2+100,original.y+original.height/2+40,{steps:10});await page.mouse.up();
 const movedX=await drawing.evaluate((node: SVGPathElement)=>node.getPointAtLength(0).x);
 await seek(page,1.5);
 expect(await drawing.evaluate((node: SVGPathElement)=>node.getPointAtLength(0).x)).toBeCloseTo((originalX+movedX)/2,2);
 await page.keyboard.press('2');
 expect((await hit.boundingBox())!.x).toBeCloseTo(original.x,0);
 await page.keyboard.press('3');
 expect((await hit.boundingBox())!.x).toBeCloseTo(moved.x,0);
 const saveResponse=page.waitForResponse(response=>response.url().endsWith('/api/play-builders')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Save play',exact:true}).click();
 const saved=await saveResponse;expect(saved.status()).toBe(201);const savedPlay=await saved.json();
 await page.waitForURL(url=>url.pathname.endsWith(savedPlay.id));await page.reload();await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'Animate play',exact:true}).click();await page.keyboard.press('2');
 expect(await drawing.evaluate((node:SVGPathElement)=>node.getPointAtLength(0).x)).toBeCloseTo(originalX,0);
 await page.keyboard.press('3');
 expect(await drawing.evaluate((node:SVGPathElement)=>node.getPointAtLength(0).x)).toBeCloseTo(movedX,0);
 await hit.click({button:'right'});
 await expect(page.locator('[data-drawing-animation-picker]')).toBeVisible();
 await page.getByRole('button',{name:'Delete drawing',exact:true}).click();
 await expect(hit).toHaveCount(0);
 await page.keyboard.press('2');await expect(hit).toHaveCount(1);
});

test('static drawings can be recolored, moved, and individually deleted',async({page})=>{
 await ready(page);
 await page.getByRole('button',{name:'Close animation editor',exact:true}).click();
 await page.getByRole('button',{name:'Free Draw',exact:true}).click();await draw(page,.4);
 await page.getByRole('button',{name:'Free Draw',exact:true}).click();
 const hit=page.locator('[data-drawing-hit]').first();await hit.click();
 await expect(page.locator('[data-drawing-style-picker]')).toBeVisible();
 await page.locator('[data-drawing-style-picker]').getByRole('button',{name:'Blue',exact:true}).click();
 const before=(await hit.boundingBox())!;
 await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
 await page.mouse.move(before.x+before.width/2+80,before.y+before.height/2,{steps:10});await page.mouse.up();
 expect((await hit.boundingBox())!.x-before.x).toBeCloseTo(80,0);
 await page.getByRole('button',{name:'Delete drawing',exact:true}).click();await expect(hit).toHaveCount(0);
});


test('C clears only the current step after doc focus, including newly drawn strokes',async({page})=>{
 await ready(page,'1');
 const drawButton=page.getByRole('button',{name:'Free Draw',exact:true});
 await drawButton.click();await draw(page,.4);
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 await page.keyboard.press('2');
 if(await drawButton.getAttribute('aria-pressed')!=='true')await drawButton.click();
 await page.getByRole('button',{name:'Show ghosts',exact:true}).click();await page.keyboard.press('c');
 await expect(page.locator('[data-drawing-id]')).toHaveCount(0);
 await draw(page,.5);await expect(page.locator('[data-drawing-id]')).toHaveCount(1);
 await page.keyboard.press('c');await expect(page.locator('[data-drawing-id]')).toHaveCount(0);
 await page.keyboard.press('3');await expect(page.locator('[data-drawing-id]')).toHaveCount(1);
});

test('timing and playback controls reverse with Shift and Jump shows seconds and tooltip',async({page})=>{
 await ready(page,'1');
 const playback=page.getByRole('button',{name:'Cycle playback speed',exact:true});
 await playback.click();const faster=await playback.textContent();expect(faster).not.toContain('1.0');
 await playback.click({modifiers:['Shift']});await expect(playback).toContainText('1.0');
 const guide=page.locator('[data-layer-type="guide"][data-tutorial-kind="line-to-gain"]');
 const id=await guide.getAttribute('data-layer-id');const b=(await guide.locator('line').first().boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height*.55);await page.mouse.down();await page.mouse.move(b.x+b.width/2+80,b.y+b.height*.55,{steps:10});await page.mouse.up();
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:600,clientY:300});
 const picker=page.locator('[data-animation-path-picker]');const middle=picker.locator('.middle');
 await middle.click();await expect(picker.locator('[data-speed-label]')).toHaveText('1.25\u00d7');
 await middle.click({modifiers:['Shift']});await expect(picker.locator('[data-speed-label]')).toHaveText('1.0\u00d7');
 await picker.getByRole('button',{name:'Jump',exact:true}).click();
 const speed=picker.locator('[data-speed-label]');await expect(speed).toHaveCount(0);
 const time=picker.getByRole('textbox',{name:'Transition time seconds',exact:true});await expect(time).toHaveValue('0.25s');
 await time.hover();await expect(page.getByRole('tooltip')).toHaveText('Transition Time');
 await time.fill('0.2');await time.press('Enter');await expect(time).toHaveValue('0.20s');
 await page.keyboard.press('Escape');await page.keyboard.press('v');
 await page.getByRole('button',{name:'Quarter 1st, click for next quarter',exact:true}).dispatchEvent('click');
 await page.getByRole('button',{name:'Quarter 2nd, click for next quarter',exact:true}).dispatchEvent('click',{shiftKey:true});
 await expect(page.getByRole('button',{name:'Quarter 1st, click for next quarter',exact:true})).toHaveCount(1);
});


test('existing drawings offer Linear/Jump and colors stay step-local without focus rings',async({page})=>{
 await ready(page,'1');await page.getByRole('button',{name:'Free Draw',exact:true}).click();await draw(page,.4);await page.getByRole('button',{name:'Free Draw',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const hit=page.locator('[data-drawing-hit]').first();await hit.click();
 await page.locator('[data-drawing-style-picker]').getByRole('button',{name:'Blue',exact:true}).click();
 await hit.dblclick();const picker=page.locator('[data-drawing-animation-picker]');
 await expect(picker.getByRole('button',{name:'Draw',exact:true})).toHaveCount(0);
 await expect(picker.getByRole('button',{name:'Linear',exact:true})).toBeVisible();
 await picker.getByRole('button',{name:'Linear',exact:true}).focus();
 expect(await picker.getByRole('button',{name:'Linear',exact:true}).evaluate(node=>getComputedStyle(node).outlineStyle)).toBe('none');
 await page.keyboard.press('Escape');await page.keyboard.press('2');
 const drawing=page.locator('[data-free-drawing]').first();expect(await drawing.getAttribute('stroke')).toBe('#ff1744');
 await seek(page,1.5);expect(await drawing.getAttribute('stroke')).toBe('rgb(148, 72, 162)');
 await page.keyboard.press('3');await hit.dblclick();await picker.getByRole('button',{name:'Jump',exact:true}).click();
 await page.keyboard.press('Escape');await seek(page,1.1);expect(await drawing.getAttribute('stroke')).toBe('rgb(41, 121, 255)');
});


test('mixed marquee groups move drawings and markers together and create drawing routes',async({page})=>{
 await ready(page,'1');
 await page.getByRole('button',{name:'Free Draw',exact:true}).click();await draw(page,.4);await page.getByRole('button',{name:'Free Draw',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const svg=page.locator('svg[role="application"]');const box=(await svg.boundingBox())!;
 const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();
 const stroke=page.locator('[data-free-drawing]').first();
 const originalMarker=(await marker.boundingBox())!;
 const originalDrawing=await stroke.evaluate((node:SVGPathElement)=>node.getPointAtLength(0).x);
 await page.mouse.move(box.x+box.width*.05,box.y+box.height*.1);await page.mouse.down();
 await page.mouse.move(box.x+box.width*.9,box.y+box.height*.9,{steps:10});await page.mouse.up();
 const hit=page.locator('[data-drawing-hit]').first();const hitBox=(await hit.boundingBox())!;
 await page.mouse.move(hitBox.x+hitBox.width/2,hitBox.y+hitBox.height/2);await page.mouse.down();
 await page.mouse.move(hitBox.x+hitBox.width/2+30,hitBox.y+hitBox.height/2+10,{steps:10});await page.mouse.up();
 const markerDelta=(await marker.boundingBox())!.x-originalMarker.x;
 expect(markerDelta).toBeGreaterThan(5);
 const drawingDelta=await stroke.evaluate((node:SVGPathElement)=>node.getPointAtLength(0).x)-originalDrawing;
 expect(drawingDelta*box.width/1000).toBeCloseTo(markerDelta,0);
 await expect(page.locator('[data-drawing-motion-route]')).toHaveCount(1);
 await expect(page.locator('[data-animation-route]')).not.toHaveCount(0);
});

test('square buttons show inset focus borders and focused tooltips',async({page})=>{
 await ready(page,'1');
 const button=page.getByRole('button',{name:'Save play',exact:true});await button.focus();
 expect(await button.evaluate(node=>getComputedStyle(node).boxShadow)).toContain('inset');
 await page.mouse.move(5,5);await expect(page.getByRole('tooltip')).toContainText('Save');
 const tool=page.getByRole('button',{name:'Team A',exact:true});await tool.focus();
 expect(await tool.evaluate(node=>getComputedStyle(node).boxShadow)).toContain('inset');
 expect(await tool.evaluate(node=>getComputedStyle(node).borderRadius)).toBe('0px');
 await expect(page.getByRole('tooltip')).toContainText('Team A');
});


test('Jump uses effect duration inputs, drawing Fade works, and LOS stays above LTG',async({page})=>{
 await ready(page,'1');
 const order=await page.locator('[data-guide-layers]').evaluate(node=>Array.from(node.querySelectorAll('[data-layer-type="guide"]')).map(item=>item.getAttribute('data-tutorial-kind')));
 expect(order.indexOf('line-of-scrimmage')).toBeGreaterThan(order.indexOf('line-to-gain'));
 const save=page.getByRole('button',{name:'Save play',exact:true});await save.focus();expect(await save.evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');
 await page.getByRole('button',{name:'Free Draw',exact:true}).click();await draw(page,.4);await page.getByRole('button',{name:'Free Draw',exact:true}).click();
 await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 await page.locator('[data-drawing-hit]').first().dblclick();
 const picker=page.locator('[data-drawing-animation-picker]');await picker.getByRole('button',{name:'Jump',exact:true}).click();
 await expect(picker.locator('[data-speed-label]')).toHaveCount(0);
 await expect(picker.getByRole('textbox',{name:'Transition time seconds',exact:true})).toHaveCount(0);
 await picker.getByRole('button',{name:'Drawing easing',exact:true}).click();
 await expect(picker.getByRole('option',{name:'Steady',exact:true})).toHaveCount(0);
 await expect(picker.getByRole('option',{name:'Shrink',exact:true})).toHaveCount(0);
 await picker.getByRole('option',{name:'Fade',exact:true}).click();
 const time=picker.getByRole('textbox',{name:'Transition time seconds',exact:true});await expect(time).toHaveValue('0.25s');
 const inputBox=(await time.boundingBox())!,dropdownBox=(await picker.getByRole('button',{name:'Drawing easing',exact:true}).boundingBox())!;
 expect(inputBox.height).toBeCloseTo(dropdownBox.height,0);
 await time.fill('99');await time.press('Enter');await expect(time).toHaveValue('1.00s');
 await time.fill('0');await time.press('Enter');await expect(time).toHaveValue('0.01s');
 await time.fill('0.25');await time.press('ArrowUp');await time.press('Enter');await expect(time).toHaveValue('0.30s');
 await time.hover();await expect(page.getByRole('tooltip')).toHaveText('Transition Time');
 await page.keyboard.press('Escape');await seek(page,1.075);const opacity=Number(await page.locator('[data-drawing-id]').getAttribute('opacity'));expect(opacity).toBeGreaterThan(0);expect(opacity).toBeLessThan(1);
});


test('marker Fade and Shrink expose duration while Hard Cut does not',async({page})=>{
 await ready(page,'1');const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();const id=await marker.getAttribute('data-layer-id');const box=(await marker.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2+40,{steps:10});await page.mouse.up();
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:650,clientY:300});
 const picker=page.locator('[data-animation-path-picker]');await picker.getByRole('button',{name:'Jump',exact:true}).click();
 const input=picker.getByRole('textbox',{name:'Transition time seconds',exact:true});await expect(input).toHaveValue('0.25s');
 const inputBox=(await input.boundingBox())!,buttonBox=(await picker.getByRole('button',{name:'Path easing',exact:true}).boundingBox())!;expect(inputBox.height).toBeCloseTo(buttonBox.height,0);
 await picker.getByRole('button',{name:'Path easing',exact:true}).click();await picker.getByRole('option',{name:'Shrink',exact:true}).click();await input.fill('0.6');await input.press('Enter');await expect(input).toHaveValue('0.60s');
 await picker.getByRole('button',{name:'Path easing',exact:true}).click();await picker.getByRole('option',{name:'Hard Cut',exact:true}).click();await expect(input).toHaveCount(0);
 await expect(picker.locator('[data-speed-label]')).toHaveCount(0);
});


test('duration arrows use .05 seconds and dropdown chevrons rotate consistently',async({page})=>{
 await ready(page,'1');
 const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();const id=await marker.getAttribute('data-layer-id');const b=(await marker.boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+80,b.y+b.height/2+40,{steps:10});await page.mouse.up();
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:650,clientY:300});
 const picker=page.locator('[data-animation-path-picker]');const start=picker.locator('.timing-start'),end=picker.locator('.timing-end');
 await start.click();await start.press('ArrowUp');await start.press('Enter');await expect(start).toHaveValue('0.05s');
 await start.click();await start.press('ArrowDown');await start.press('Enter');await expect(start).toHaveValue('0.00s');
 await end.click();await end.press('ArrowDown');await end.press('Enter');await expect(end).toHaveValue('0.95s');
 await end.click();await end.press('ArrowUp');await end.press('Enter');await expect(end).toHaveValue('1.00s');
 await picker.getByRole('button',{name:'Jump',exact:true}).click();
 const effect=picker.getByRole('button',{name:'Path easing',exact:true});await effect.click();await expect(effect.locator('[data-dropdown-chevron]')).toHaveClass(/open/);
 await effect.click();await expect(effect.locator('[data-dropdown-chevron]')).not.toHaveClass(/open/);
 const time=picker.getByRole('textbox',{name:'Transition time seconds',exact:true});await time.click();await time.press('ArrowUp');await time.press('Enter');await expect(time).toHaveValue('0.30s');
 await time.click();await time.press('ArrowDown');await time.press('Enter');await expect(time).toHaveValue('0.25s');
 await time.click();await time.press('Shift+ArrowUp');await time.press('Enter');await expect(time).toHaveValue('0.26s');
 await page.keyboard.press('Escape');
 const more=page.getByRole('button',{name:'More image formats',exact:true});await more.click();await expect(more.locator('[data-dropdown-chevron]')).toHaveClass(/open/);
 await more.click();await expect(more.locator('[data-dropdown-chevron]')).not.toHaveClass(/open/);
 await page.getByRole('button',{name:'Add another play',exact:true}).click();
 await more.click();const all=page.getByRole('button',{name:'Export All Plays as PNG',exact:true}).first();await expect(all).toBeVisible();await expect(all.locator('[data-dropdown-chevron]')).toHaveCount(0);
});


test('player letters, export menus and play tabs show blue focus without stale hover tooltips',async({page})=>{
 await ready(page);
 const a=page.getByRole('button',{name:'Team A',exact:true});await a.hover();await expect(page.getByRole('tooltip')).toContainText('Team A');
 await a.focus();await page.keyboard.press('Tab');
 const b=page.getByRole('button',{name:'Team B',exact:true});await expect(b).toBeFocused();
 await expect(page.getByRole('tooltip')).toHaveCount(1);await expect(page.getByRole('tooltip')).toContainText('Team B');
 expect(await b.locator('[data-player-tool-letter]').evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');
 for(const name of ['Team A','Team K','Team R']){const tool=page.getByRole('button',{name,exact:true});await tool.focus();expect(await tool.locator('[data-player-tool-letter]').evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');}
 const tab=page.getByRole('button',{name:'Open Play 1',exact:true});await tab.focus();expect(await tab.evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');
 for(const type of ['image','video']){
  const toggle=page.getByRole('button',{name:`More ${type} formats`,exact:true});await toggle.click();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  expect(await toggle.evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');
  const names=type==='image'?['Export JPG image','Export WEBP image','Export PDF image']:['Export MOV video','Export WEBM video','Export GIF video'];
  for(const name of names){await page.keyboard.press('Tab');const option=page.getByRole('button',{name,exact:true});await expect(option).toBeFocused();expect(await option.evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');await expect(page.getByRole('tooltip')).toHaveCount(1);}
  await page.keyboard.press('Escape');await expect(toggle).toBeFocused();
 }
});


test('near-end timing bars stay inside the rail and Shift arrows adjust hundredths',async({page})=>{
 await ready(page,'1');const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();const id=await marker.getAttribute('data-layer-id');const b=(await marker.boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+80,b.y+b.height/2+40,{steps:10});await page.mouse.up();
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:650,clientY:300});
 const picker=page.locator('[data-animation-path-picker]');await picker.getByRole('button',{name:'Jump',exact:true}).click();
 const start=picker.locator('.timing-start');await start.fill('.99');await start.press('Enter');
 const rail=(await picker.locator('[data-timing-rail]').boundingBox())!,bar=(await picker.locator('.bar').boundingBox())!;
 expect(bar.x).toBeGreaterThanOrEqual(rail.x);expect(bar.x+bar.width).toBeLessThanOrEqual(rail.x+rail.width);
 await start.click();await start.press('Shift+ArrowDown');await start.press('Enter');await expect(start).toHaveValue('0.98s');
 const time=picker.getByRole('textbox',{name:'Transition time seconds',exact:true});await time.click();await time.press('Shift+ArrowUp');await time.press('Enter');await expect(time).toHaveValue('0.26s');
 await page.keyboard.press('Escape');await page.mouse.move(700,500);
 await expect(page.locator('svg[role="application"]')).not.toHaveAttribute('data-hover-tooltip');
 await expect(page.getByRole('tooltip').filter({hasText:/^\d+$/})).toHaveCount(0);
});


test('focus borders are keyboard-only, Ctrl placement is free, lasers clear on every tool exit, and seconds keep trailing zeros',async({page})=>{
 await ready(page,'1');
 const a=page.getByRole('button',{name:'Team A',exact:true});await a.click();
 expect(await a.locator('[data-player-tool-letter]').evaluate(node=>getComputedStyle(node).boxShadow)).not.toContain('rgb(30, 144, 255)');
 await page.keyboard.press('Tab');const b=page.getByRole('button',{name:'Team B',exact:true});await expect(b).toBeFocused();expect(await b.locator('[data-player-tool-letter]').evaluate(node=>getComputedStyle(node).boxShadow)).toContain('rgb(30, 144, 255)');
 const laser=page.getByRole('button',{name:'Laser Pointer',exact:true});await laser.click();await draw(page,.4);await expect(page.locator('[data-laser-drawing]')).toHaveCount(1);
 await page.keyboard.press('v');await expect(page.locator('[data-laser-drawing]')).toHaveCount(0,{timeout:5000});
 await laser.click();await draw(page,.4);await page.getByRole('button',{name:'Animate play',exact:true}).click();await page.getByRole('button',{name:'Animate play',exact:true}).click();await expect(page.locator('[data-laser-drawing]')).toHaveCount(0,{timeout:5000});await page.getByRole('button',{name:'Animate play',exact:true}).click();
 const svg=page.locator('svg[role="application"]');const box=(await svg.boundingBox())!;
 await page.getByRole('button',{name:'Line of Scrimmage',exact:true}).click();
 const x=317.37,y=270;
 await page.keyboard.down('Control');await page.mouse.move(box.x+x/1000*box.width,box.y+y/484*box.height);await page.mouse.down();await page.mouse.up();await page.keyboard.up('Control');
 const los=page.locator('[data-layer-type="guide"][data-tutorial-kind="line-of-scrimmage"] line').first();expect(Math.abs(Number(await los.getAttribute('x1'))-x)).toBeLessThan(1.1);
 await page.getByRole('button',{name:'Animate play',exact:true}).click();await page.keyboard.press('End');
 const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();const id=await marker.getAttribute('data-layer-id');const bounds=(await marker.boundingBox())!;
 await page.keyboard.press('v');await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+80,bounds.y+bounds.height/2+40,{steps:10});await page.mouse.up();
 await page.locator(`[data-animation-route="${id}"] path[pointer-events="stroke"]`).dispatchEvent('dblclick',{clientX:650,clientY:300});const picker=page.locator('[data-animation-path-picker]');await picker.getByRole('button',{name:'Jump',exact:true}).click();const time=picker.getByRole('textbox',{name:'Transition time seconds',exact:true});await time.fill('.3');await time.press('Enter');await expect(time).toHaveValue('0.30s');await time.fill('.5');await time.press('Enter');await expect(time).toHaveValue('0.50s');
});


test('Revert and Delete tooltips open below-left and Revert inverts on hover',async({page})=>{
 await ready(page,'1');const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();const b=(await marker.boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+80,b.y+b.height/2+40,{steps:10});await page.mouse.up();
 for(const name of ['Revert to original position','Delete element']){
  const button=page.getByRole('button',{name,exact:true});await button.hover();const box=(await button.boundingBox())!,tip=(await page.getByRole('tooltip').boundingBox())!;
  expect(tip.x+tip.width).toBeLessThan(box.x+box.width/2);expect(tip.y).toBeGreaterThan(box.y+box.height/2);
  if(name.startsWith('Revert'))await expect.poll(()=>button.evaluate(node=>{const s=getComputedStyle(node);return [s.backgroundColor,s.color,s.borderTopColor];})).toEqual(['rgb(255, 255, 255)','rgb(0, 0, 0)','rgb(0, 0, 0)']);
 }
});


test('Ctrl and Cmd bypass placement and drag snapping while Shift keeps angle constraints',async({page})=>{
 await ready(page,'1');const svg=page.locator('svg[role="application"]');const field=(await svg.boundingBox())!;
 for(const [modifier,x] of [['Control',615.37],['Meta',655.13]] as const){
  await page.getByRole('button',{name:'Line of Scrimmage',exact:true}).click();
  await page.keyboard.down(modifier);await page.mouse.move(field.x+x/1000*field.width,field.y+350/484*field.height);await page.mouse.down();await page.mouse.up();await page.keyboard.up(modifier);
  const line=page.locator('[data-layer-type="guide"][data-tutorial-kind="line-of-scrimmage"] line').first();expect(Math.abs(Number(await line.getAttribute('x1'))-x)).toBeLessThan(1.1);
  await page.keyboard.press('v');const box=(await line.boundingBox())!,before=Number(await line.getAttribute('x1'));
  await page.keyboard.down(modifier);await page.mouse.move(box.x+box.width/2,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width/2+27.3,box.y+box.height*.55,{steps:8});await page.mouse.up();await page.keyboard.up(modifier);
  expect(Math.abs(Number(await line.getAttribute('x1'))-before-27.3/field.width*1000)).toBeLessThan(1.1);
 }
 const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();let b=(await marker.boundingBox())!;
 await page.keyboard.down('Shift');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+80,b.y+b.height/2+20,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');
 expect((await marker.boundingBox())!.y).toBeCloseTo(b.y,0);
 b=(await marker.boundingBox())!;
 await page.keyboard.down('Control');await page.keyboard.down('Shift');await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+80,b.y+b.height/2+20,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await page.keyboard.up('Control');
 expect((await marker.boundingBox())!.y-b.y).toBeCloseTo(20,0);
});
