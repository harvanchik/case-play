import { json } from '@sveltejs/kit';
import { expireStalledExports, getExportJob, publicExportJob } from '$lib/server/db/repositories/play-builder-exports';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals, params }) => {
	const headers = { 'Cache-Control': 'no-store' };
	if (!locals.accountUser) return json({ message: 'Sign in to view video exports.' }, { status: 401, headers });
	await expireStalledExports();
	const job = await getExportJob(params.jobId, locals.accountUser.id);
	if (!job) return json({ message: 'Video export not found.' }, { status: 404, headers });
	return json({ job: publicExportJob(job) }, { headers });
};
