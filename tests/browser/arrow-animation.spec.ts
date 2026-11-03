import { test, expect } from '@playwright/test';
import { createAnimation, appendAnimationStep } from '../../src/lib/play-builder-animation';
import { encodePlayBuilderDocument, defaultPlayBuilderFieldSettings, type PlayBuilderScene } from '../../src/lib/play-builder-scene';
test('arrows expose motion controls and saved per-step colors blend while scrubbing', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	const scene: PlayBuilderScene = {
		markers: [
			{ id: 1, kind: 'team-a', label: 'A-1', x: 450, y: 220, color: 'red' },
			{ id: 2, kind: 'deflag', x: 550, y: 220, color: 'yellow' },
			{ id: 3, kind: 'bean-bag', x: 650, y: 220, color: 'blue' }
		],
		guides: [],
		paths: ['run', 'pass', 'kick'].map((kind, index) => ({
			id: 10 + index,
			kind: kind as 'run' | 'pass' | 'kick',
			start: { x: 200, y: 120 + index * 85 },
			end: { x: 350, y: 120 + index * 85 },
			color: 'yellow',
			style: 'solid'
		})),
		freeStrokes: [],
		layerOrder: []
	};
	const animation = appendAnimationStep(createAnimation(scene));
	for (const pose of animation.steps[1].poses) {
		if (pose.type === 'path') {
			pose.x += 100;
			pose.y += 30;
			pose.end!.x += 100;
			pose.end!.y += 30;
		} else pose.color = 'green';
	}
	const response = await page.request.post('/api/play-builders', {
		data: {
			document: encodePlayBuilderDocument({
				activePlayIndex: 0,
				plays: [{ name: 'Arrow test', scene, animation, settings: defaultPlayBuilderFieldSettings() }]
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
	for (const kind of ['run', 'pass', 'kick']) {
		const arrow = page.locator(`[data-tutorial-kind="${kind}"] [data-field-element]`).first();
		await arrow.dispatchEvent('dblclick', { clientX: 650, clientY: 350, button: 0 });
		const picker = page.locator('[data-animation-path-picker]');
		await expect(picker).toBeVisible();
		await picker.getByRole('button', { name: 'Jump', exact: true }).click();
		await picker.getByRole('button', { name: 'Path easing', exact: true }).click();
		await picker.getByRole('option', { name: 'Fade', exact: true }).click();
		await expect(picker.getByRole('textbox', { name: 'Transition time seconds', exact: true })).toBeVisible();
		await page.keyboard.press('Escape');
	}
	const slider = page.getByRole('slider', { name: 'Animation playhead', exact: true });
	await slider.evaluate((node) => {
		(node as HTMLInputElement).value = '.5';
		node.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await expect(page.locator('#animation-marker-art-1 circle')).toHaveAttribute('fill', 'rgb(157, 145, 98)');
	for (const id of [2, 3]) await expect(page.locator(`#animation-marker-art-${id} image`)).toHaveCount(2);
	await slider.evaluate((node) => {
		(node as HTMLInputElement).value = '0';
		node.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await expect(page.locator('#animation-marker-art-1 circle')).toHaveAttribute('fill', '#ef4444');
	await page.keyboard.press('2');
	const run = page.locator('[data-tutorial-kind="run"] [data-field-element]').first();
	const original = (await run.boundingBox())!;
	await page.mouse.move(original.x + original.width * 0.4, original.y + original.height * 0.4);
	await page.keyboard.down('Control');
	await page.mouse.down();
	await page.mouse.move(original.x + original.width * 0.4 + 55, original.y + original.height * 0.4 + 20, { steps: 8 });
	await page.mouse.up();
	await page.keyboard.up('Control');
	await expect(page.getByRole('button', { name: 'Revert to original position', exact: true })).toBeVisible();
	expect((await run.boundingBox())!.x).toBeGreaterThan(original.x + 40);
	await page.getByRole('button', { name: 'Revert to original position', exact: true }).click();
	const restored = (await run.boundingBox())!;
	expect(restored.x).toBeLessThan(original.x - 80);
	const saving = page.waitForResponse(
		(response) => response.url().endsWith(`/api/play-builders/${saved.id}`) && response.request().method() === 'PUT'
	);
	await page.getByRole('button', { name: 'Save play', exact: true }).click();
	expect((await saving).ok()).toBe(true);
	await expect(page.getByRole('button', { name: 'Play saved', exact: true })).toBeDisabled();
	await page.reload();
	await page.getByRole('button', { name: 'Animate play', exact: true }).click();
	await page.getByRole('slider', { name: 'Animation playhead', exact: true }).evaluate((node) => {
		(node as HTMLInputElement).value = '.5';
		node.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await expect(page.locator('#animation-marker-art-1 circle')).toHaveAttribute('fill', 'rgb(157, 145, 98)');
	expect(errors).toEqual([]);
});
