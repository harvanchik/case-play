import { json } from '@sveltejs/kit';
import { get } from '@vercel/blob';
import { getExportJob } from '$lib/server/db/repositories/play-builder-exports';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals, params }) => {
	const headers = { 'Cache-Control': 'private, no-store' };
	if (!locals.accountUser) return json({ message: 'Sign in to download video exports.' }, { status: 401, headers });
	const job = await getExportJob(params.jobId, locals.accountUser.id);
	if (!job) return json({ message: 'Video export not found.' }, { status: 404, headers });
	if (job.status !== 'completed' || !job.expiresAt || Date.parse(job.expiresAt) <= Date.now() || !job.outputPath)
		return json({ message: 'This download is not available. Export the play again.' }, { status: 410, headers });
	const file = await get(job.outputPath, { access: 'private' });
	if (!file || file.statusCode !== 200) return json({ message: 'Video export not found.' }, { status: 404, headers });
	return new Response(file.stream, {
		headers: {
			...headers,
			'Content-Type': 'video/mp4',
			'Content-Disposition': 'attachment; filename="caseplay-animation.mp4"',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
