import { decodePlayBuilderDocument, encodePlayBuilderDocument, type SerializedPlayBuilderDocument } from '$lib/play-builder-scene';

export const serializeValidatedPlayBuilderDocument = (value: unknown) => {
	const json = JSON.stringify(value);
	if (new TextEncoder().encode(json).byteLength > 1_500_000) throw new Error('Play builder collection exceeds the storage limit.');
	decodePlayBuilderDocument(value);
	return json;
};

export const parseStoredPlayBuilderDocument = (json: string): SerializedPlayBuilderDocument => {
	const value: unknown = JSON.parse(json);
	return encodePlayBuilderDocument(decodePlayBuilderDocument(value));
};
