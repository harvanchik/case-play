type SimilarityCasePlay = {
	id: string;
	title: string;
	prompt: string;
};

const STOP_WORDS = new Set([
	'a',
	'an',
	'and',
	'are',
	'as',
	'at',
	'be',
	'before',
	'by',
	'down',
	'during',
	'for',
	'from',
	'has',
	'have',
	'in',
	'is',
	'it',
	'of',
	'on',
	'or',
	'that',
	'the',
	'then',
	'their',
	'to',
	'was',
	'where',
	'while',
	'who',
	'with',
	'yard',
	'yards'
]);

const normalizeToken = (token: string) => {
	const normalized = token.toLowerCase().replace(/[’']/g, '');

	if (/^[abkr]\d+$/.test(normalized)) return '';
	if (/^intercept(?:ed|ing|ion|ions|s)?$/.test(normalized)) return 'intercept';
	if (/^complet(?:e|ed|es|ing|ion|ions)$/.test(normalized)) return 'complete';
	if (/^rough(?:s|ed|ing)?$/.test(normalized)) return 'rough';
	if (/^deflag(?:s|ged|ging)?$/.test(normalized)) return 'deflag';
	if (/^guard(?:s|ed|ing)?$/.test(normalized)) return 'guard';
	if (/^contact(?:s|ed|ing)?$/.test(normalized)) return 'contact';
	if (/^taunt(?:s|ed|ing)?$/.test(normalized)) return 'taunt';
	if (/^punt(?:s|ed|ing)?$/.test(normalized)) return 'punt';
	if (/^pass(?:es|ed|ing)?$/.test(normalized)) return 'pass';
	if (/^catch(?:es|ing)?$/.test(normalized) || normalized === 'caught') return 'catch';

	return normalized;
};

const tokenize = (text: string) =>
	(text.match(/[a-z0-9]+/gi) ?? []).map(normalizeToken).filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const addTerms = (weights: Map<string, number>, terms: string[], weight: number) => {
	for (const term of terms) weights.set(term, (weights.get(term) ?? 0) + weight);
};

const buildTermWeights = (casePlay: SimilarityCasePlay) => {
	const weights = new Map<string, number>();
	addTerms(weights, tokenize(casePlay.title), 3);
	addTerms(weights, tokenize(casePlay.prompt), 1);
	return weights;
};

export const rankSimilarCasePlays = <T extends SimilarityCasePlay>(current: SimilarityCasePlay, candidates: T[], limit = 5) => {
	const documents = [current, ...candidates.filter((candidate) => candidate.id !== current.id)];
	const termWeights = documents.map(buildTermWeights);
	const documentFrequency = new Map<string, number>();

	for (const weights of termWeights) {
		for (const term of weights.keys()) documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
	}

	const weightedVector = (weights: Map<string, number>) => {
		const vector = new Map<string, number>();
		for (const [term, frequency] of weights) {
			const inverseDocumentFrequency = Math.log((documents.length + 1) / ((documentFrequency.get(term) ?? 0) + 1)) + 1;
			vector.set(term, frequency * inverseDocumentFrequency);
		}
		return vector;
	};

	const currentVector = weightedVector(termWeights[0]);
	const currentMagnitude = Math.sqrt([...currentVector.values()].reduce((sum, value) => sum + value * value, 0));

	return documents
		.slice(1)
		.map((candidate, index) => {
			const candidateVector = weightedVector(termWeights[index + 1]);
			const candidateMagnitude = Math.sqrt([...candidateVector.values()].reduce((sum, value) => sum + value * value, 0));
			let dotProduct = 0;
			for (const [term, value] of currentVector) dotProduct += value * (candidateVector.get(term) ?? 0);

			return {
				candidate,
				score: currentMagnitude && candidateMagnitude ? dotProduct / (currentMagnitude * candidateMagnitude) : 0
			};
		})
		.filter(({ score }) => score > 0)
		.sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title))
		.slice(0, Math.max(0, limit))
		.map(({ candidate }) => candidate as T);
};
