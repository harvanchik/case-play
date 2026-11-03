import { test, expect, type Page } from '@playwright/test';
import { createAnimation, appendAnimationStep } from '../../src/lib/play-builder-animation';
import { encodePlayBuilderDocument, defaultPlayBuilderFieldSettings, type PlayBuilderScene } from '../../src/lib/play-builder-scene';
async function ready(page: Page, stationary = false) {
	const scene: PlayBuilderScene = {
		markers: [
			{ id: 1, kind: 'ball', x: 400, y: 200 },
			{ id: 2, kind: 'team-a', label: 'A-1', x: 650, y: 250 }
		],
		paths: [{id:4,kind:'kick',start:{x:150,y:300},end:{x:850,y:300},color:'cyan',style:'dashed'}],
		guides: [{ id: 3, kind: 'line-to-gain', x: 300, color: 'yellow', style: 'solid' }],
		freeStrokes: [],
		layerOrder: [
			{ type: 'guide', id: 3 },{type:'path',id:4},
			{ type: 'marker', id: 1 },
			{ type: 'marker', id: 2 }
		]
	};
	const animation = appendAnimationStep(createAnimation(scene));
	const ball = animation.steps[1].poses.find((p) => p.id === 1)!;
	ball.x = stationary ? 400 : 550;
	ball.y = stationary ? 200 : 220;
	ball.label = 'Catch';
	const response = await page.request.post('/api/play-builders', {
		data: {
			document: encodePlayBuilderDocument({
				activePlayIndex: 0,
				plays: [{ name: 'Label routes', scene, animation, settings: defaultPlayBuilderFieldSettings() }]
			})
		}
	});
	expect(response.status()).toBe(201);
	const saved = await response.json();
	await page.addInitScript(({ id, token }) => localStorage.setItem('caseplay-play-builder-edit-tokens-v1', JSON.stringify({ [id]: token })), {
		id: saved.id,
		token: saved.editToken
	});
	await page.goto(`/diagram/flag-football/${saved.id}`);
	await page.waitForSelector('.tutorial-launch-bouncing');
	const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
	if (await consent.isVisible()) await consent.click();
	await page.getByRole('button', { name: 'Animate play', exact: true }).click();
	await page.keyboard.press('2');
}
async function seek(page: Page, time: number) {
	await page.getByRole('slider', { name: 'Animation playhead', exact: true }).evaluate((node, time) => {
		(node as HTMLInputElement).value = String(time);
		node.dispatchEvent(new Event('input', { bubbles: true }));
	}, time);
}
test('labels fade in the authored window and element popovers avoid the object within the field', async ({ page }) => {
	await ready(page);
	await seek(page, 0.125);
	await expect(page.locator('#animation-marker-art-1 text')).toHaveText('Catch');
	expect(Number(await page.locator('#animation-marker-art-1 text').getAttribute('opacity'))).toBeCloseTo(0.5, 1);
	await seek(page, 0.25);
	await expect(page.locator('#animation-marker-art-1 text')).toHaveAttribute('opacity', '1');
	await page.keyboard.press('2');
	const object = page.locator('[data-layer-type="marker"][data-layer-id="1"]');
	const target = (await object.boundingBox())!;
	await object.dispatchEvent('dblclick', { clientX: target.x + target.width / 2, clientY: target.y + target.height / 2 });
	const popup = page.locator('[data-animation-path-picker]');
	await expect(popup).toBeVisible();
	const field = (await page.locator('svg[role="application"]').boundingBox())!;
	const box = (await popup.boundingBox())!;
	expect(box.x + box.width / 2).toBeCloseTo(target.x + target.width / 2, 0);
	expect(box.y).toBeGreaterThan(target.y + target.height);
	expect(box.x).toBeGreaterThanOrEqual(field.x);
	expect(box.y).toBeGreaterThanOrEqual(field.y);
	expect(box.x + box.width).toBeLessThanOrEqual(field.x + field.width + 1);
	expect(box.y + box.height).toBeLessThanOrEqual(field.y + field.height + 1);
	expect(
		box.x >= target.x + target.width || box.x + box.width <= target.x || box.y >= target.y + target.height || box.y + box.height <= target.y
	).toBe(true);
	await popup.getByRole('button', { name: 'Element', exact: true }).click();
	const properties = page.locator('[data-tutorial="marker-editor"]');
	await expect(properties).toBeVisible();
	const prop = (await properties.boundingBox())!;
	expect(
		prop.x >= target.x + target.width || prop.x + prop.width <= target.x || prop.y >= target.y + target.height || prop.y + prop.height <= target.y
	).toBe(true);
});
test('custom route drawing finishes on release, short strokes and cancellation', async ({ page }) => {
	await ready(page);
	const marker = page.locator('[data-layer-type="marker"][data-layer-id="1"]');
	async function custom() {
		await marker.dispatchEvent('dblclick', { clientX: 650, clientY: 300 });
		await page
			.locator('[data-animation-path-picker]')
			.getByRole('button', { name: /^(Custom|Redraw)$/, exact: false })
			.click();
		await expect(page.getByRole('application', { name: 'Draw movement route', exact: true })).toBeVisible();
	}
	const field = (await page.locator('svg[role="application"]').boundingBox())!;
	const x = field.x + field.width * 0.43,
		y = field.y + field.height * 0.38;
	await custom();
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + 50, y - 30, { steps: 8 });
	await page.mouse.move(x + 110, y + 20, { steps: 8 });
	await page.mouse.up();
	await expect(page.getByRole('application', { name: 'Draw movement route', exact: true })).toHaveCount(0);
	await custom();
	await page.mouse.click(x, y);
	await expect(page.getByRole('application', { name: 'Draw movement route', exact: true })).toHaveCount(0);
	await custom();
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.getByRole('application', { name: 'Draw movement route', exact: true }).dispatchEvent('pointercancel', { pointerId: 1 });
	await page.mouse.up();
	await expect(page.getByRole('application', { name: 'Draw movement route', exact: true })).toHaveCount(0);
});

test('stationary elements disable Linear/Curved, keep Custom/Jump, and anchor independently of cursor', async ({ page }) => {
	await ready(page, true);
	const marker = page.locator('[data-layer-type="marker"][data-layer-id="1"]'),
		popup = page.locator('[data-animation-path-picker]');
	const open = (x: number, y: number) => marker.dispatchEvent('dblclick', { clientX: x, clientY: y });
	await open(100, 100);
	await expect(popup).toBeVisible();
	const first = (await popup.boundingBox())!;
	for (const name of ['Linear', 'Curved']) await expect(popup.getByRole('button', { name, exact: true })).toBeDisabled();
	await expect(popup.locator('.path-types button[aria-pressed="true"]')).toHaveCount(0);
	for (const name of ['Custom', 'Jump']) await expect(popup.getByRole('button', { name, exact: true })).toBeEnabled();
	await page.keyboard.press('Escape');
	await open(1200, 700);
	const second = (await popup.boundingBox())!;
	expect(second.x).toBeCloseTo(first.x, 0);
	expect(second.y).toBeCloseTo(first.y, 0);
	await popup.getByRole('button', { name: 'Custom', exact: true }).click();
	const field = (await page.locator('svg[role="application"]').boundingBox())!;
	await page.mouse.move(field.x + field.width * 0.4, field.y + field.height * 0.4);
	await page.mouse.down();
	await page.mouse.move(field.x + field.width * 0.5, field.y + field.height * 0.3, { steps: 12 });
	await page.mouse.up();
	await expect(page.getByRole('application', { name: 'Draw movement route', exact: true })).toHaveCount(0);
	await expect(page.locator('[data-animation-route="1"]')).toHaveCount(1);
	await seek(page, 0.5);
	const image = page.locator('#animation-marker-art-1 image');
	expect(Number(await image.getAttribute('x'))).toBeGreaterThan(400);
});

test('cross-field popovers stay beside the line and follow the cursor vertically', async ({ page }) => {
	await ready(page);
	const guide = page.locator('[data-layer-type="guide"][data-layer-id="3"]'),
		editor = page.locator('[data-tutorial="line-editor"]');
	const bounds = (await guide.boundingBox())!,
		field = (await page.locator('[data-popover-field-bounds]').boundingBox())!;
	await guide.dispatchEvent('dblclick', { clientX: bounds.x, clientY: field.y + field.height * 0.25 });
	await expect(editor).toBeVisible();
	const first = (await editor.boundingBox())!;
	expect(first.x).toBeGreaterThan(bounds.x + bounds.width);
	await page.keyboard.press('Escape');
	await guide.dispatchEvent('dblclick', { clientX: bounds.x, clientY: field.y + field.height * 0.65 });
	await expect(editor).toBeVisible();
	const second = (await editor.boundingBox())!;
	expect(second.x).toBeCloseTo(first.x, 0);
	expect(second.y).toBeGreaterThan(first.y + field.height * 0.3);
	expect(second.y + second.height).toBeLessThanOrEqual(field.y + field.height + 1);
});

test('arched arrow popovers use the empty space beneath the ink inside the bounding box',async({page})=>{
 await ready(page);await page.keyboard.press('Escape');
 const arrow=page.locator('[data-layer-type="path"][data-layer-id="4"]');await arrow.locator('[data-field-element]').first().dispatchEvent('dblclick',{clientX:700,clientY:300});
 const popup=page.locator('[data-tutorial="line-editor"]');await expect(popup).toBeVisible();const box=(await popup.boundingBox())!,bounds=(await arrow.boundingBox())!;
 expect(box.x+box.width/2).toBeCloseTo(bounds.x+bounds.width/2,0);expect(box.y).toBeLessThan(bounds.y+bounds.height-35);
 const intersects=await arrow.evaluate((element,box)=>{
  for(const shape of element.querySelectorAll<SVGGeometryElement>('path,line')){
   const style=getComputedStyle(shape);if(Number(style.opacity)<.3||style.stroke==='rgba(0, 0, 0, 0)'||parseFloat(style.strokeWidth)<.1)continue;
   const matrix=shape.getScreenCTM()!;const length=shape.getTotalLength();for(let i=0;i<=20;i++){const p=shape.getPointAtLength(length*i/20);const s=new DOMPoint(p.x,p.y).matrixTransform(matrix);if(s.x>=box.x&&s.x<=box.x+box.width&&s.y>=box.y&&s.y<=box.y+box.height)return true;}
  }return false;
 },box);expect(intersects).toBe(false);
});

test('stationary and deleted-type tooltips explain availability and ghosts anchor their editors',async({page})=>{
 await ready(page,true);const marker=page.locator('[data-layer-type="marker"][data-layer-id="1"]'),popup=page.locator('[data-animation-path-picker]');
 await marker.dispatchEvent('dblclick',{clientX:100,clientY:100});
 for(const name of ['Linear','Curved']){await popup.getByRole('button',{name,exact:true}).hover();await expect(page.getByRole('tooltip',{name:'Move Element to Enable',exact:true})).toBeVisible();}
 await page.keyboard.press('Escape');await marker.click();await page.getByRole('button',{name:'Delete element',exact:true}).click();await expect(marker).toHaveCount(0);
 const ghost=page.locator('[data-animation-ghost="1"][data-animation-ghost-type="marker"]');await expect(ghost).toBeVisible();const original=(await ghost.boundingBox())!;
 await ghost.dispatchEvent('contextmenu',{clientX:1200,clientY:700,button:2});await expect(popup).toBeVisible();const bounds=(await popup.boundingBox())!;expect(bounds.x+bounds.width/2).toBeCloseTo(original.x+original.width/2,0);expect(bounds.y).toBeGreaterThan(original.y+original.height);
 await expect(popup.getByRole('button',{name:'Jump',exact:true})).toHaveAttribute('aria-pressed','true');
 for(const name of ['Linear','Curved','Custom']){const button=popup.getByRole('button',{name,exact:true});await expect(button).toBeDisabled();await button.hover();await expect(page.getByRole('tooltip',{name:'Not Available for Deleted Element',exact:true})).toBeVisible();}
 await popup.getByRole('button',{name:'Path easing',exact:true}).click();await popup.getByRole('option',{name:'Fade',exact:true}).click();await page.keyboard.press('Escape');await seek(page,.1);await expect(page.locator('#animation-marker-art-1')).toBeVisible();await seek(page,.5);await expect(page.locator('#animation-marker-art-1')).toHaveCount(0);
});
