import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';

test('export menus close outside and signed-out video downloads are disabled', async ({ page }) => {
	await page.goto('/diagram/flag-football');
	await page.waitForSelector('.tutorial-launch-bouncing', { state: 'attached' });
	const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
	if (await consent.isVisible()) await consent.click();
	await page.getByRole('button', { name: 'More video formats', exact: true }).click();
	for (const format of ['MP4', 'MOV', 'WebM', 'GIF'])
		await expect(page.getByRole('button', { name: `Export ${format.toUpperCase()} video`, exact: true })).toBeDisabled();
	await page.locator('h1').first().click();
	await expect(page.getByRole('group', { name: 'Video formats', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'More image formats', exact: true }).click();
	for (const format of ['JPG', 'WEBP', 'PDF']) await expect(page.getByRole('button', { name: `Export ${format} image`, exact: true })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('group', { name: 'Image formats', exact: true })).toHaveCount(0);
});

test('signed-in builder downloads its active animation and restores the editing step', async ({ page, context, baseURL }) => {
	// Only the disposable local browser-test database is used for this session fixture.
	const database = createClient({ url: 'file:caseplay-animation-test.db' });
	const secret = process.env.ACCOUNT_SESSION_SECRET || 'local-browser-test-session-secret-not-for-production';
	const id = randomUUID(),
		token = randomBytes(32).toString('base64url'),
		now = new Date().toISOString();
	await database.execute({
		sql: 'INSERT INTO caseplay_accounts(id,email,created_at,updated_at) VALUES(?,?,?,?)',
		args: [id, `${id}@example.test`, now, now]
	});
	try {
		await database.execute({
			sql: 'INSERT INTO caseplay_account_sessions(id,account_id,session_hash,expires_at,created_at) VALUES(?,?,?,?,?)',
			args: [randomUUID(), id, createHash('sha256').update(token).digest('hex'), new Date(Date.now() + 3600000).toISOString(), now]
		});
		await context.addCookies([
			{ name: 'caseplay_account_session', value: `${token}.${createHmac('sha256', secret).update(token).digest('hex')}`, url: baseURL! }
		]);
		await page.goto('/diagram/flag-football');
		await page.waitForSelector('.tutorial-launch-bouncing', { state: 'attached' });
		const consent = page.getByRole('button', { name: /^Essential Cookies Only/ });
		if (await consent.isVisible()) await consent.click();
		await page.getByRole('button', { name: 'Set up default play', exact: true }).click();
		await page.getByRole('button', { name: 'Animate play', exact: true }).click();
		await page.getByRole('button', { name: 'Add animation step', exact: true }).click();
		const seconds = page.getByRole('spinbutton', { name: 'Step duration seconds', exact: true });
		await seconds.fill('0.1');
		await seconds.press('Enter');
		const before = await page.locator('.field-canvas').innerHTML();
		let jobs = 0;
		page.on('request', (r) => {
			if (r.url().includes('/api/play-builder-exports')) jobs++;
		});
		const download = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Export MP4 video', exact: true }).click();
		const file = await download;
		expect(file.suggestedFilename()).toMatch(/\.mp4$/);
		await expect(page.getByRole('button', { name: 'Cancel export' })).toHaveCount(0);
		await expect(seconds).toHaveValue('0.1');
		expect(await page.locator('.field-canvas').innerHTML()).toBe(before);
		expect(jobs).toBe(0);
		await seconds.fill('5');
		await seconds.press('Enter');
		const canceled = page.waitForEvent('download', { timeout: 1000 }).then(
			() => true,
			() => false
		);
		await page.getByRole('button', { name: 'Export MP4 video', exact: true }).click();
		await page.getByRole('button', { name: 'Cancel export' }).click();
		await expect(page.getByRole('button', { name: 'Cancel export' })).toHaveCount(0);
		expect(await canceled).toBe(false);
		expect(await page.locator('.field-canvas').innerHTML()).toBe(before);
	} finally {
		await database.execute({ sql: 'DELETE FROM caseplay_account_sessions WHERE account_id=?', args: [id] });
		await database.execute({ sql: 'DELETE FROM caseplay_accounts WHERE id=?', args: [id] });
		database.close();
	}
});
test('browser encodes real MP4 MOV WebM and GIF files without export API calls', async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', 'All-codec coverage requires Chromium; other engines have separate MP4 and fallback checks.');
	await page.goto('/diagram/flag-football');
	let calls = 0;
	page.on('request', (r) => {
		if (r.url().includes('/api/play-builder-exports')) calls++;
	});
	for (const format of ['mp4', 'mov', 'webm', 'gif']) {
		const download = page.waitForEvent('download');
		await page.evaluate(async (format) => {
			const moduleUrl = '/src/lib/play-builder-browser-video.ts';
			const { downloadBrowserVideo } = await import(moduleUrl);
			await downloadBrowserVideo(
				format,
				0.1,
				async () => {
					const c = document.createElement('canvas');
					c.width = 320;
					c.height = 180;
					const x = c.getContext('2d')!;
					x.fillStyle = 'red';
					x.fillRect(0, 0, 320, 180);
					return c;
				},
				new AbortController().signal,
				() => {},
				'test'
			);
		}, format);
		const file = await download;
		expect(file.suggestedFilename()).toBe(`test Animation.${format}`);
		const bytes = await readFile((await file.path())!);
		expect(bytes.length).toBeGreaterThan(100);
		if (format === 'mp4' || format === 'mov') expect(bytes.toString('ascii', 4, 8)).toBe('ftyp');
		if (format === 'webm') expect(bytes.subarray(0, 4).toString('hex')).toBe('1a45dfa3');
		if (format === 'gif') expect(bytes.toString('ascii', 0, 3)).toBe('GIF');
		const dimensions = await page.evaluate(
			async ({ data, format }) => {
				const blob = new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], {
					type: format === 'gif' ? 'image/gif' : format === 'mov' ? 'video/quicktime' : `video/${format}`
				});
				const url = URL.createObjectURL(blob);
				try {
					if (format === 'gif') {
						const image = new Image();
						image.src = url;
						await image.decode();
						return [image.width, image.height];
					}
					const video = document.createElement('video');
					video.src = url;
					await new Promise<void>((resolve, reject) => {
						video.onloadedmetadata = () => resolve();
						video.onerror = () => reject(new Error('Export is not playable'));
					});
					return [video.videoWidth, video.videoHeight];
				} finally {
					URL.revokeObjectURL(url);
				}
			},
			{ data: bytes.toString('base64'), format }
		);
		expect(dimensions).toEqual(format === 'gif' ? [960, 540] : [1920, 1080]);
	}
	expect(calls).toBe(0);
});

test('MP4 fallback works without WebCodecs and unsupported MOV reports clearly', async ({ page }) => {
	await page.goto('/diagram/flag-football');
	const download = page.waitForEvent('download');
	const result = await page.evaluate(async () => {
		delete (window as unknown as { VideoEncoder?: unknown }).VideoEncoder;
		const moduleUrl = '/src/lib/play-builder-browser-video.ts';
		const { downloadBrowserVideo } = await import(moduleUrl);
		const draw = async () => {
			const canvas = document.createElement('canvas');
			canvas.width = 320;
			canvas.height = 180;
			return canvas;
		};
		let message = '';
		try {
			await downloadBrowserVideo('mov', 0.1, draw, new AbortController().signal, () => {}, 'unsupported');
		} catch (error) {
			message = (error as Error).message;
		}
		await downloadBrowserVideo('mp4', 0.1, draw, new AbortController().signal, () => {}, 'fallback');
		return message;
	});
	expect(result).toContain('unavailable in this browser');
	expect((await download).suggestedFilename()).toBe('fallback Animation.mp4');
});
