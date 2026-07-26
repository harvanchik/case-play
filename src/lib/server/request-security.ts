import { createHash } from 'node:crypto';

type RateLimitBucket = {
	count: number;
	resetAt: number;
};

export type RateLimitResult = {
	allowed: boolean;
	limit: number;
	remaining: number;
	retryAfterSeconds: number;
	resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;
let rateLimitChecks = 0;

const pruneExpiredBuckets = (now: number) => {
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}

	if (buckets.size <= MAX_BUCKETS) return;
	const targetSize = Math.floor(MAX_BUCKETS * 0.9);
	for (const key of buckets.keys()) {
		buckets.delete(key);
		if (buckets.size <= targetSize) break;
	}
};

/**
 * A zero-cost, per-instance guard against bursts. Production edge rate limits
 * should remain enabled as the durable outer layer because serverless instances
 * do not share memory.
 */
export const consumeRateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
	const now = Date.now();
	rateLimitChecks += 1;
	if (rateLimitChecks % 250 === 0 || buckets.size >= MAX_BUCKETS) pruneExpiredBuckets(now);

	const current = buckets.get(key);
	const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
	bucket.count += 1;
	buckets.set(key, bucket);

	return {
		allowed: bucket.count <= limit,
		limit,
		remaining: Math.max(0, limit - bucket.count),
		retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
		resetAt: bucket.resetAt
	};
};

export const clearRateLimit = (key: string) => {
	buckets.delete(key);
};

export const rateLimitKey = (scope: string, clientAddress: string, discriminator = '') => {
	const identity = createHash('sha256').update(`${clientAddress}\0${discriminator}`).digest('base64url');
	return `${scope}:${identity}`;
};

export const rateLimitHeaders = (result: RateLimitResult) => ({
	'RateLimit-Limit': String(result.limit),
	'RateLimit-Remaining': String(result.remaining),
	'RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
	...(result.allowed ? {} : { 'Retry-After': String(result.retryAfterSeconds) })
});

export const isAllowedMutationOrigin = (request: Request, url: URL) => {
	const fetchSite = request.headers.get('sec-fetch-site');
	if (fetchSite === 'cross-site') return false;
	const origin = request.headers.get('origin');
	return !origin || origin === url.origin;
};

export const acceptsJsonRequest = (request: Request) => {
	const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
	return contentType === 'application/json';
};

export const exceedsContentLength = (request: Request, maximumBytes: number) => {
	const contentLength = Number(request.headers.get('content-length'));
	return Number.isFinite(contentLength) && contentLength > maximumBytes;
};

export class RequestInputError extends Error {
	constructor(
		public readonly status: 400 | 413 | 415,
		message: string
	) {
		super(message);
		this.name = 'RequestInputError';
	}
}

export const readJsonRequest = async <T>(request: Request, maximumBytes: number): Promise<T> => {
	if (!acceptsJsonRequest(request)) throw new RequestInputError(415, 'Content-Type must be application/json.');
	if (exceedsContentLength(request, maximumBytes)) throw new RequestInputError(413, 'Request body is too large.');
	if (!request.body) throw new RequestInputError(400, 'Invalid JSON request.');

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let receivedBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			receivedBytes += value.byteLength;
			if (receivedBytes > maximumBytes) {
				await reader.cancel();
				throw new RequestInputError(413, 'Request body is too large.');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const body = new Uint8Array(receivedBytes);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as T;
	} catch {
		throw new RequestInputError(400, 'Invalid JSON request.');
	}
};
