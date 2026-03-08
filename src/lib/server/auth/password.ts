import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const KEY_LENGTH = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

const scrypt = (password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number }) =>
	new Promise<Buffer>((resolve, reject) => {
		scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(derivedKey as Buffer);
		});
	});

export const hashPassword = async (password: string) => {
	const salt = randomBytes(16).toString('hex');
	const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P
	});

	return ['scrypt', SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, derivedKey.toString('hex')].join(':');
};

export const verifyPassword = async (password: string, storedHash: string) => {
	const [algorithm, rawN, rawR, rawP, salt, expectedHash] = storedHash.split(':');

	if (algorithm !== 'scrypt' || !rawN || !rawR || !rawP || !salt || !expectedHash) {
		return false;
	}

	const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
		N: Number(rawN),
		r: Number(rawR),
		p: Number(rawP)
	});
	const expectedBuffer = Buffer.from(expectedHash, 'hex');

	return derivedKey.length === expectedBuffer.length && timingSafeEqual(derivedKey, expectedBuffer);
};
