const DEFAULT_TEXT_MAX_LENGTH = 20_000;
const ID_MAX_LENGTH = 128;

export class FormInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FormInputError';
	}
}

const assertMaximumLength = (value: string, key: string, maximumLength: number) => {
	if (value.length > maximumLength) {
		throw new FormInputError(`${key} must be ${maximumLength} characters or fewer.`);
	}
	return value;
};

export const readRequiredText = (formData: FormData, key: string, maximumLength = DEFAULT_TEXT_MAX_LENGTH) => {
	const value = formData.get(key)?.toString().trim();

	if (!value) {
		throw new FormInputError(`${key} is required.`);
	}

	return assertMaximumLength(value, key, maximumLength);
};

export const readOptionalText = (formData: FormData, key: string, maximumLength = DEFAULT_TEXT_MAX_LENGTH) => {
	const value = formData.get(key)?.toString().trim();
	return value ? assertMaximumLength(value, key, maximumLength) : null;
};

export const readOptionalId = (formData: FormData, key: string) => {
	const value = formData.get(key)?.toString().trim();
	return value ? assertMaximumLength(value, key, ID_MAX_LENGTH) : null;
};

export const readOptionalPositiveInteger = (formData: FormData, key: string) => {
	const value = formData.get(key)?.toString().trim();

	if (!value) {
		return null;
	}

	const number = Number(value);
	if (!Number.isInteger(number) || number < 1) {
		throw new FormInputError(`${key} must be a positive whole number.`);
	}

	return number;
};

export const readDifficulty = (formData: FormData) => {
	const difficulty = Number(formData.get('difficulty')?.toString() || 0);

	if (![1, 2, 3].includes(difficulty)) {
		throw new FormInputError('Difficulty must be easy, moderate, or hard.');
	}

	return difficulty as 1 | 2 | 3;
};

export const readOptionalHttpsUrl = (formData: FormData, key: string) => {
	const value = readOptionalText(formData, key, 2_048);
	if (!value) return null;

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new FormInputError(`${key} must be a valid URL.`);
	}

	if (url.protocol !== 'https:') throw new FormInputError(`${key} must use HTTPS.`);
	return url.toString();
};
