export const readRequiredText = (formData: FormData, key: string) => {
	const value = formData.get(key)?.toString().trim();

	if (!value) {
		throw new Error(`${key} is required.`);
	}

	return value;
};

export const readOptionalText = (formData: FormData, key: string) => {
	const value = formData.get(key)?.toString().trim();
	return value || null;
};

export const readOptionalId = (formData: FormData, key: string) => {
	const value = formData.get(key)?.toString().trim();
	return value ? value : null;
};

export const readOptionalPositiveInteger = (formData: FormData, key: string) => {
	const value = formData.get(key)?.toString().trim();

	if (!value) {
		return null;
	}

	const number = Number(value);
	if (!Number.isInteger(number) || number < 1) {
		throw new Error(`${key} must be a positive whole number.`);
	}

	return number;
};

export const readDifficulty = (formData: FormData) => {
	const difficulty = Number(formData.get('difficulty')?.toString() || 0);

	if (![1, 2, 3].includes(difficulty)) {
		throw new Error('Difficulty must be easy, moderate, or hard.');
	}

	return difficulty as 1 | 2 | 3;
};
