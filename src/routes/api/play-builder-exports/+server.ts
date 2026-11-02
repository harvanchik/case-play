import { json } from '@sveltejs/kit';
import { decodePlayBuilderDocument, encodePlayBuilderDocument } from '$lib/play-builder-scene';
import { animationDuration } from '$lib/play-builder-animation';
import { isValidAccountCsrf } from '$lib/server/auth/account-session';
import { readServerEnv } from '$lib/server/env';
import {
	ExportLimitError,
	latestExportJob,
	publicExportJob,
	requestExportJob,
	updateExportJob
} from '$lib/server/db/repositories/play-builder-exports';
import { isAllowedMutationOrigin, readJsonRequest, RequestInputError } from '$lib/server/request-security';
import type { RequestHandler } from './$types';

const headers = { 'Cache-Control': 'no-store' };
const enabled = () => readServerEnv('PLAY_BUILDER_VIDEO_EXPORT_ENABLED') === 'true';
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.accountUser) return json({ message: 'Sign in to export MP4 videos.' }, { status: 401, headers });
	if (!enabled()) return json({ enabled: false, job: null }, { headers });
	const job = await latestExportJob(locals.accountUser.id);
	return json({ enabled: true, job: job ? publicExportJob(job) : null }, { headers });
};
export const POST: RequestHandler = async ({ locals, request, url, cookies }) => {
	if (!locals.accountUser) return json({ message: 'Sign in to export MP4 videos.' }, { status: 401, headers });
	if (!isAllowedMutationOrigin(request, url) || !isValidAccountCsrf(cookies.get('caseplay_account_session'), request.headers.get('x-caseplay-csrf')))
		return json({ message: 'Request could not be verified.' }, { status: 403, headers });
	if (!enabled()) return json({ message: 'Video export is not available yet.' }, { status: 503, headers });
	try {
		const body = await readJsonRequest<{ document?: unknown }>(request, 1_600_000);
		const document = decodePlayBuilderDocument(body.document);
		const active = document.plays[document.activePlayIndex];
		if (!active.animation || animationDuration(active.animation) <= 0)
			return json({ message: 'Add at least two animation steps before exporting.' }, { status: 400, headers });
		const snapshot = JSON.stringify(encodePlayBuilderDocument({ activePlayIndex: 0, plays: [active] }));
		if (Buffer.byteLength(snapshot, 'utf8') > 1_500_000)
			return json({ message: 'Animation exceeds the storage limit. Reduce custom route points or steps.' }, { status: 413, headers });
		const result = await requestExportJob(locals.accountUser.id, snapshot);
		if (result.created) {
			try {
				const [{ start }, { renderPlayBuilderVideo }] = await Promise.all([
					import('workflow/api'),
					import('$lib/server/play-builder-video-workflow')
				]);
				await start(renderPlayBuilderVideo, [result.job.id]);
			} catch (error) {
				await updateExportJob(result.job.id, { status: 'failed', snapshotJson: '', error: 'Unable to start video export. Please try again.' });
				throw error;
			}
		}
		return json({ job: publicExportJob(result.job) }, { status: result.job.status === 'completed' ? 200 : 202, headers });
	} catch (error) {
		if (error instanceof RequestInputError) return json({ message: error.message }, { status: error.status, headers });
		if (error instanceof ExportLimitError) return json({ message: error.message }, { status: 429, headers });
		if (error instanceof Error && /Invalid|Unsupported|Animation|Play |play |field|document/i.test(error.message))
			return json({ message: error.message }, { status: 400, headers });
		console.error('Video export request failed.', error);
		return json({ message: 'Unable to start video export. Please try again.' }, { status: 500, headers });
	}
};
