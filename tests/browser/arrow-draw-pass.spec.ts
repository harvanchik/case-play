import { test, expect, type Page } from '@playwright/test';
import { createAnimation, appendAnimationStep } from '../../src/lib/play-builder-animation';
import { encodePlayBuilderDocument, defaultPlayBuilderFieldSettings, type PlayBuilderScene } from '../../src/lib/play-builder-scene';
async function ready(page: Page) {
	const scene: PlayBuilderScene = {
		markers: [
			{ id: 1, kind: 'ball', x: 250, y: 250 },
			{ id: 2, kind: 'team-a', label: 'A-1', x: 450, y: 220 },
			{ id: 3, kind: 'official-b', x: 700, y: 250 },
			{ id: 4, kind: 'event', label: 'Event', x: 650, y: 300 }
		],
		paths: ['run', 'pass', 'kick'].map((kind, i) => ({
			id: 10 + i,
			kind: kind as 'run' | 'pass' | 'kick',
			start: { x: 150, y: 100 + i * 70 },
			end: { x: 350, y: 100 + i * 70 },
			color: 'cyan',
			style: 'dashed'
		})),
		guides: [],
		freeStrokes: [],
		layerOrder: []
	};
	const animation = appendAnimationStep(createAnimation(scene));
	animation.steps[1].poses.find((p) => p.type === 'marker' && p.id === 2)!.x = 600;
	const response = await page.request.post('/api/play-builders', {
		data: {
			document: encodePlayBuilderDocument({
				activePlayIndex: 0,
				plays: [{ name: 'Draw and pass', scene, animation, settings: defaultPlayBuilderFieldSettings() }]
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
test('unchanged Run/Pass/Kick arrows can opt into Draw and reveal during scrubbing', async ({ page }) => {
	await ready(page);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	for (const id of [10, 11, 12]) {
		await page
			.locator(`[data-layer-type="path"][data-layer-id="${id}"] [data-field-element]`)
			.first()
			.dispatchEvent('dblclick', { clientX: 600, clientY: 300 });
		const properties = page.locator('[data-tutorial="line-editor"]');
		await expect(properties).toBeVisible();
		await properties.getByRole('button', { name: 'Draw', exact: true }).click();
		const motion = page.locator('[data-animation-path-picker]');
		await expect(motion.getByRole('button', { name: 'Draw', exact: true })).toHaveAttribute('aria-pressed', 'true');
		await page.keyboard.press('Escape');
	}
	await seek(page, 0.5);
	await expect(page.locator('[data-arrow-draw]')).toHaveCount(3);
	for (const id of [10, 11, 12]) await expect(page.locator(`[data-arrow-draw="${id}"] path`)).not.toHaveCount(0);
	await seek(page, 1);
	await expect(page.locator('[data-arrow-draw]')).toHaveCount(0);
	expect(errors).toEqual([]);
});
test('Click to Pass Ball picks eligible receivers without linking and shows a curved-flight shadow', async ({ page }) => {
	await ready(page);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const ball = page.locator('[data-layer-type="marker"][data-layer-id="1"]'),
		receiver = page.locator('[data-layer-type="marker"][data-layer-id="2"]');
	await ball.dispatchEvent('dblclick', { clientX: 500, clientY: 300 });
	const properties = page.locator('[data-tutorial="marker-editor"]');
	await properties.getByRole('button', { name: 'Click to Pass Ball', exact: true }).click();
	await expect(properties.getByRole('button', { name: 'Click Receiver of the Pass', exact: true })).toBeVisible();
 await expect(page.locator('[data-pass-receiver-picker]')).toBeVisible();await expect(page.locator('[data-pass-receiver]')).toHaveCount(2);await expect(page.locator('[data-pass-receiver="4"]')).toHaveCount(0);

	await page.locator('[data-layer-type="marker"][data-layer-id="4"]').click();
	await expect(properties.getByRole('button', { name: 'Click Receiver of the Pass', exact: true })).toBeVisible();
	await page.locator('[data-pass-receiver="2"]').click();
	await expect(properties).toHaveCount(0);
	const image = page.locator('#animation-marker-art-1 image');
	expect(Number(await image.getAttribute('x')) + 15).toBeCloseTo(612, 4);
	expect(Number(await image.getAttribute('y')) + 15).toBeCloseTo(230, 4);
	await ball.dispatchEvent('dblclick', { clientX: 700, clientY: 300 });
	const motion = page.locator('[data-animation-path-picker]');
	await expect(motion.getByRole('button', { name: 'Curved', exact: true })).toHaveAttribute('aria-pressed', 'true');
	await motion.getByRole('button', { name: 'Element', exact: true }).click();
	await expect(properties.getByRole('button', { name: 'Click to Pass Ball', exact: true })).toBeVisible();
	await properties.getByRole('button', { name: 'Click to Pass Ball', exact: true }).click();
	await page.locator('[data-pass-receiver="3"]').click();
	expect(Number(await image.getAttribute('x')) + 15).toBeCloseTo(712, 4);
	await expect(page.locator('[data-pass-receiver-picker]')).toHaveCount(0);
 await ball.click();await expect(page.locator('[data-animation-selected-overlay] [data-animation-route="1"]')).toHaveCount(1);await expect(page.locator('[data-animation-selected-overlay] [data-animation-ghost="1"]')).toHaveCount(1);
 const ghost=page.locator('[data-animation-selected-overlay] [data-animation-ghost="1"]');
 await expect(ghost).toHaveAttribute('opacity','0.25');
 const bend=page.getByRole('button',{name:'Bend movement path',exact:true});
 await expect(bend).toBeVisible();
 const route=page.locator('[data-animation-selected-overlay] [data-animation-route="1"]');
 const handle={x:Number(await bend.getAttribute('cx')),y:Number(await bend.getAttribute('cy'))};
 const distance=await route.evaluate((node,handle)=>{const path=node.querySelector('[data-animation-route-line]') as SVGPathElement;const length=path.getTotalLength();let nearest=Infinity;for(let i=0;i<=1000;i++){const p=path.getPointAtLength(length*i/1000);nearest=Math.min(nearest,Math.hypot(handle.x-p.x,handle.y-p.y));}return nearest;},handle);
 expect(distance).toBeLessThan(1);
 await seek(page,.1);const early=Number(await page.locator('[data-ball-shadow]').getAttribute('rx'));
 await seek(page, 0.5);
	const shadow = page.locator('[data-ball-shadow]');
	await expect(shadow).toHaveCount(1);const peak=Number(await shadow.getAttribute('rx'));expect(peak).toBeLessThan(early);
	expect(Number(await shadow.getAttribute('cy'))).toBeGreaterThan(Number(await image.getAttribute('y')) + 30);
	await seek(page,.9);expect(Number(await shadow.getAttribute('rx'))).toBeGreaterThan(peak);
 await seek(page, 1);
	await expect(shadow).toHaveCount(0);
	expect(errors).toEqual([]);
});
