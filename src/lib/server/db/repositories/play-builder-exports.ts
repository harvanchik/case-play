import { and, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { getDb } from '../index';
import type { Database } from '../connection';
import { playBuilderExports } from '../schema';

export class ExportLimitError extends Error {}
const now = () => new Date().toISOString();
export const publicExportJob = (job: typeof playBuilderExports.$inferSelect) => ({
	id: job.id,
	status: job.status,
	progress: job.progress,
	error: job.error,
	expiresAt: job.expiresAt
});
export const getExportJob = async (id: string, accountId?: string, database?: Database) => {
	const db = database ?? getDb();
	const [job] = await db
		.select()
		.from(playBuilderExports)
		.where(accountId ? and(eq(playBuilderExports.id, id), eq(playBuilderExports.accountId, accountId)) : eq(playBuilderExports.id, id))
		.limit(1);
	return job ?? null;
};
export const expireStalledExports = async (database?: Database) => {
	const db = database ?? getDb();
	await db
		.update(playBuilderExports)
		.set({ status: 'failed', snapshotJson: '', error: 'Video export timed out. Please try again.', updatedAt: now() })
		.where(
			and(
				inArray(playBuilderExports.status, ['queued', 'rendering']),
				lt(playBuilderExports.updatedAt, new Date(Date.now() - 15 * 60_000).toISOString())
			)
		);
};
export const latestExportJob = async (accountId: string, database?: Database) => {
	const db = database ?? getDb();
	await expireStalledExports(db);
	const [job] = await db
		.select()
		.from(playBuilderExports)
		.where(eq(playBuilderExports.accountId, accountId))
		.orderBy(desc(playBuilderExports.createdAt))
		.limit(1);
	return job ?? null;
};
export const requestExportJob = async (accountId: string, snapshotJson: string, database?: Database) => {
	const db = database ?? getDb();
	await expireStalledExports(db);
	const timestamp = now(),
		hash = createHash('sha256')
			.update('video-v1:1080p30:' + snapshotJson)
			.digest('hex');
	const [cached] = await db
		.select()
		.from(playBuilderExports)
		.where(
			and(
				eq(playBuilderExports.accountId, accountId),
				eq(playBuilderExports.snapshotHash, hash),
				eq(playBuilderExports.status, 'completed'),
				gt(playBuilderExports.expiresAt, timestamp)
			)
		)
		.limit(1);
	if (cached) return { job: cached, created: false };
	const [active] = await db
		.select()
		.from(playBuilderExports)
		.where(and(eq(playBuilderExports.accountId, accountId), inArray(playBuilderExports.status, ['queued', 'rendering'])))
		.limit(1);
	if (active) {
		if (active.snapshotHash === hash) return { job: active, created: false };
		throw new ExportLimitError('Your current video is still rendering.');
	}
	const id = randomUUID(),
		day = timestamp.slice(0, 10) + 'T00:00:00.000Z';
	// One atomic statement enforces the daily quota across processes and concurrent requests.
	await db.run(sql`INSERT OR IGNORE INTO play_builder_exports (id, account_id, snapshot_json, snapshot_hash, status, progress, created_at, updated_at)
		SELECT ${id}, ${accountId}, ${snapshotJson}, ${hash}, 'queued', 0, ${timestamp}, ${timestamp}
		WHERE (SELECT COUNT(*) FROM play_builder_exports WHERE account_id = ${accountId} AND created_at >= ${day}) < 5
		AND NOT EXISTS (SELECT 1 FROM play_builder_exports WHERE account_id = ${accountId} AND status IN ('queued', 'rendering'))`);
	const job = await getExportJob(id, accountId, db);
	if (!job) {
		const [concurrent] = await db
			.select()
			.from(playBuilderExports)
			.where(
				and(
					eq(playBuilderExports.accountId, accountId),
					eq(playBuilderExports.snapshotHash, hash),
					inArray(playBuilderExports.status, ['queued', 'rendering'])
				)
			)
			.limit(1);
		if (concurrent) return { job: concurrent, created: false };
		throw new ExportLimitError('Export limit reached. Try after your current export finishes or tomorrow.');
	}
	return { job, created: true };
};
export const updateExportJob = async (
	id: string,
	changes: Partial<
		Pick<typeof playBuilderExports.$inferInsert, 'status' | 'progress' | 'outputPath' | 'sandboxName' | 'error' | 'expiresAt' | 'snapshotJson'>
	>,
	database?: Database
) => {
	const db = database ?? getDb();
	return db
		.update(playBuilderExports)
		.set({ ...changes, updatedAt: now() })
		.where(and(eq(playBuilderExports.id, id), inArray(playBuilderExports.status, ['queued', 'rendering'])))
		.returning();
};
export const markExportExpired = async (id: string) => {
	await getDb()
		.update(playBuilderExports)
		.set({ status: 'expired', outputPath: null, snapshotJson: '', updatedAt: now() })
		.where(and(eq(playBuilderExports.id, id), inArray(playBuilderExports.status, ['completed', 'failed'])));
};
