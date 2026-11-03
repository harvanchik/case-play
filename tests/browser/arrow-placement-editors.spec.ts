import { test, expect, type Page } from '@playwright/test';
async function ready(page: Page) {
	await page.goto('/diagram/flag-football');
	await page.waitForSelector('.tutorial-launch-bouncing');
	const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
	if (await consent.isVisible()) await consent.click();
}
async function arrowVector(page: Page, kind: string) {
	return page
		.locator(`[data-tutorial-kind="${kind}"]`)
		.last()
		.locator('[data-field-element]')
		.first()
		.evaluate((node) => {
			const data = node.getAttribute('d');
			if (data) {
				const n = data.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
				return { x: n.at(-2)! - n[0], y: n.at(-1)! - n[1] };
			}
			return {
				x: Number(node.getAttribute('x2')) - Number(node.getAttribute('x1')),
				y: Number(node.getAttribute('y2')) - Number(node.getAttribute('y1'))
			};
		});
}
test('Shift arrow placement snaps to axes and diagonals and Ctrl bypasses it', async ({ page }) => {
	await ready(page);
	const b = (await page.locator('svg[role="application"]').boundingBox())!;
	const scale = b.width / 1000;
	for (const [index, kind] of ['run', 'pass', 'kick'].entries()) {
		const row = 0.25 + index * 0.18;
		await page.locator(`[data-tutorial-tool="${kind}"]`).click();
		await page.mouse.move(b.x + b.width * 0.45, b.y + b.height * row);
		await page.mouse.down();
		await page.keyboard.down('Shift');
		await page.mouse.move(b.x + b.width * 0.45 + 120 * scale, b.y + b.height * row + 20 * scale, { steps: 6 });
		// Releasing leaves exactly the snapped preview in the authored arrow.
		await page.mouse.up();
		await page.keyboard.up('Shift');
		const vector = await arrowVector(page, kind);
		expect(vector.x).toBeGreaterThan(100);
		expect(Math.abs(vector.y)).toBeLessThan(0.01);
	}
	await page.locator('[data-tutorial-tool="run"]').click();
	const x = b.x + b.width * 0.4,
		y = b.y + b.height * 0.65;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.keyboard.down('Shift');
	await page.mouse.move(x + 60 * scale, y + 130 * scale, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up('Shift');
	let v = await arrowVector(page, 'run');
	expect(v.x).toBeCloseTo(v.y, 1);
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.keyboard.down('Shift');
	await page.keyboard.down('Control');
	await page.mouse.move(x + 120 * scale, y + 30 * scale, { steps: 6 });
	await page.mouse.up();
	await page.keyboard.up('Control');
	await page.keyboard.up('Shift');
	v = await arrowVector(page, 'run');
	expect(Math.abs(v.y)).toBeGreaterThan(20);
	expect(Math.abs(v.x - v.y)).toBeGreaterThan(50);
});
test('unchanged elements use normal properties; changed arrows offer Morph/Jump and one-way properties', async ({ page }) => {
	await ready(page);
	await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
	await page.locator('[data-tutorial-tool="run"]').click();
	const b = (await page.locator('svg[role="application"]').boundingBox())!;
	await page.mouse.click(b.x + b.width * 0.65, b.y + b.height * 0.45);
	await page.getByRole('button', { name: 'Animate play', exact: true }).click();
	await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
	const arrow = page.locator('[data-tutorial-kind="run"] [data-field-element]').first();
	const open = () =>
		arrow.evaluate((node) =>
			node.dispatchEvent(new MouseEvent('contextmenu', { clientX: 650, clientY: 300, button: 2, bubbles: true, cancelable: true }))
		);
	await open();
	const line = page.locator('[data-tutorial="line-editor"]'),
		motion = page.locator('[data-animation-path-picker]');
	await expect(line).toBeVisible();
	await expect(motion).toHaveCount(0);
	await expect(line.getByRole('group', { name: 'Element editor mode' })).toHaveCount(0);
	await line.getByRole('button', { name: 'Red', exact: true }).click();
	await page.keyboard.press('Escape');
	await open();
	await expect(motion).toBeVisible();
	await expect(motion.getByRole('button', { name: 'Morph', exact: true })).toBeVisible();
	await expect(motion.getByRole('button', { name: 'Curved', exact: true })).toHaveCount(0);
	await expect(motion.getByRole('button', { name: 'Custom', exact: true })).toHaveCount(0);
	await motion.getByRole('button', { name: 'Jump', exact: true }).click();
	await motion.getByRole('button', { name: 'Path easing', exact: true }).click();
	for (const name of ['Hard Cut', 'Fade', 'Shrink']) await expect(motion.getByRole('option', { name, exact: true })).toBeVisible();
	await motion.getByRole('option', { name: 'Fade', exact: true }).click();
	await motion.getByRole('button', { name: 'Morph', exact: true }).click();
	await motion.getByRole('button', { name: 'Path easing', exact: true }).click();
	await expect(motion.getByRole('option', { name: 'Ease In/Out', exact: true })).toBeVisible();
	await motion.getByRole('option', { name: 'Steady', exact: true }).click();
	await motion.getByRole('button', { name: 'Element', exact: true }).click();
	await expect(line).toBeVisible();
	await expect(motion).toHaveCount(0);
	await expect(line.getByRole('button', { name: 'Animation', exact: true })).toHaveCount(0);
	const start = (await line.boundingBox())!;
	await page.mouse.move(start.x + 3, start.y + 3);
	await page.mouse.down();
	await page.mouse.move(start.x + 83, start.y + 53, { steps: 8 });
	await page.mouse.up();
	const moved = (await line.boundingBox())!;
	expect(moved.x).toBeCloseTo(start.x + 80, 0);
	expect(moved.y).toBeCloseTo(start.y + 50, 0);
	await page.mouse.move(moved.x + 3, moved.y + 3);
	await page.mouse.down();
	await page.mouse.move(-100, -100, { steps: 10 });
	await page.mouse.up();
	const clamped = (await line.boundingBox())!;
	expect(clamped.x).toBeGreaterThanOrEqual(0);
	expect(clamped.y).toBeGreaterThanOrEqual(0);
	await page.keyboard.press('Escape');
	await open();
	await expect(motion).toBeVisible();
	const position = (await motion.boundingBox())!;
	await page.mouse.move(position.x + 2, position.y + 2);
	await page.mouse.down();
	await page.mouse.move(position.x + 52, position.y + 32, { steps: 5 });
	await page.mouse.up();
	expect((await motion.boundingBox())!.x).toBeCloseTo(position.x + 50, 0);
	await motion.getByRole('button', { name: 'Element', exact: true }).click();
	expect((await line.boundingBox())!.x).toBeGreaterThan(10);
});
test('players, yard lines and drawings follow changed-only and one-way editor behavior',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Set up default play',exact:true}).click();
 await page.getByRole('button',{name:'Free Draw',exact:true}).click();const b=(await page.locator('svg[role="application"]').boundingBox())!;
 await page.mouse.move(b.x+b.width*.65,b.y+b.height*.6);await page.mouse.down();await page.mouse.move(b.x+b.width*.75,b.y+b.height*.62,{steps:12});await page.mouse.up();await page.keyboard.press('v');
 await page.getByRole('button',{name:'Animate play',exact:true}).click();await page.getByRole('button',{name:'Add animation step',exact:true}).click();
 const marker=page.locator('[data-field-kind="team-a"]').first(),properties=page.locator('[data-tutorial="marker-editor"]'),motion=page.locator('[data-animation-path-picker]');
 await marker.dispatchEvent('dblclick',{clientX:600,clientY:300});await expect(properties).toBeVisible();await expect(properties.getByRole('group',{name:'Element editor mode'})).toHaveCount(0);
 await properties.getByRole('button',{name:'Red player circle',exact:true}).click();await marker.dispatchEvent('dblclick',{clientX:600,clientY:300});await expect(motion).toBeVisible();await motion.getByRole('button',{name:'Element',exact:true}).click();await expect(properties).toBeVisible();await expect(properties.getByRole('button',{name:'Animation',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');
 const guide=page.locator('[data-layer-type="guide"][data-tutorial-kind="line-to-gain"]'),line=page.locator('[data-tutorial="line-editor"]');
 await guide.dispatchEvent('dblclick',{clientX:600,clientY:300});await expect(line).toBeVisible();await line.getByRole('button',{name:'Red',exact:true}).click();await page.keyboard.press('Escape');await guide.dispatchEvent('dblclick',{clientX:600,clientY:300});await expect(motion).toBeVisible();await motion.getByRole('button',{name:'Element',exact:true}).click();await expect(line.getByRole('spinbutton',{name:'Line to Gain yard line',exact:true})).toBeVisible();await expect(line.getByRole('button',{name:'Animation',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');
 const stroke=page.locator('[data-drawing-id]').first(),style=page.locator('[data-drawing-style-picker]'),drawingMotion=page.locator('[data-drawing-animation-picker]');
 await stroke.dispatchEvent('dblclick',{clientX:600,clientY:300});await expect(style).toBeVisible();await expect(drawingMotion).toHaveCount(0);await style.getByRole('button',{name:'Blue',exact:true}).click();await page.keyboard.press('Escape');await stroke.dispatchEvent('dblclick',{clientX:600,clientY:300});await expect(drawingMotion).toBeVisible();await drawingMotion.getByRole('button',{name:'Element',exact:true}).click();await expect(style).toBeVisible();await expect(style.getByRole('button',{name:'Animation',exact:true})).toHaveCount(0);
 const pos=(await style.boundingBox())!;await page.mouse.move(pos.x+2,pos.y+2);await page.mouse.down();await page.mouse.move(pos.x+52,pos.y+32,{steps:5});await page.mouse.up();expect((await style.boundingBox())!.x).toBeCloseTo(pos.x+50,0);
});
