import assert from 'node:assert/strict';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { readFile, readdir } from 'node:fs/promises';
import { createDatabase } from '../src/lib/server/db/connection';
import { accounts, playBuilderExports } from '../src/lib/server/db/schema';
import { ExportLimitError, getExportJob, requestExportJob, updateExportJob } from '../src/lib/server/db/repositories/play-builder-exports';

test('export jobs enforce ownership, active-job uniqueness, immutable snapshots, cached reuse, and daily quotas in the database', async () => {
	const { db, client } = createDatabase({ url: ':memory:' });
	try {
		for (const file of (await readdir('drizzle')).filter((file) => file.endsWith('.sql')).sort()) {
			const source = await readFile(`drizzle/${file}`, 'utf8');
			await client.migrate(
				source
					.split('--> statement-breakpoint')
					.map((sql) => sql.trim())
					.filter(Boolean)
			);
		}
		await db.insert(accounts).values([
			{ id: 'one', email: 'one@example.test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
			{ id: 'two', email: 'two@example.test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
			{ id: 'three', email: 'three@example.test', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
		]);
		const first = await requestExportJob('one', '{"snapshot":1}', db);
		assert.equal(first.created, true);
		assert.equal(first.job.snapshotJson, '{"snapshot":1}');
		assert.equal(await getExportJob(first.job.id, 'two', db), null);
		const duplicate = await requestExportJob('one', '{"snapshot":1}', db);
		assert.equal(duplicate.job.id, first.job.id);
		assert.equal(duplicate.created, false);
		await assert.rejects(requestExportJob('one', '{"snapshot":2}', db), ExportLimitError);
		await updateExportJob(
			first.job.id,
			{ status: 'completed', progress: 100, expiresAt: new Date(Date.now() + 86400000).toISOString(), outputPath: 'private.mp4' },
			db
		);
		const cached = await requestExportJob('one', '{"snapshot":1}', db);
		assert.equal(cached.job.id, first.job.id);
		assert.equal(cached.created, false);
		for (let i = 2; i <= 5; i++) {
			const item = await requestExportJob('one', JSON.stringify({ snapshot: i }), db);
			await updateExportJob(item.job.id, { status: 'failed' }, db);
		}
		await assert.rejects(requestExportJob('one', '{"snapshot":6}', db), ExportLimitError);
		const other = await requestExportJob('two', '{"snapshot":1}', db);
		assert.notEqual(other.job.id, first.job.id);
		const raced = await Promise.all([requestExportJob('three', '{"snapshot":1}', db), requestExportJob('three', '{"snapshot":1}', db)]);
		assert.equal(raced[0].job.id, raced[1].job.id);
		assert.equal(raced.filter((item) => item.created).length, 1);
		assert.equal((await db.select().from(playBuilderExports)).length, 7);
		await db.delete(accounts).where(eq(accounts.id, 'three'));
		assert.equal(await getExportJob(raced[0].job.id, undefined, db), null);
	} finally {
		client.close();
	}
});
