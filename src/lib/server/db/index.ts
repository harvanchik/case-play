import { createDatabase, type Database } from './connection';
import { readServerEnv } from '$lib/server/env';

let cachedDatabase: Database | undefined;
const readEnv = readServerEnv;

const getDatabaseConfig = () => {
	const url = readEnv('TURSO_DATABASE_URL');

	if (!url) {
		throw new Error('Missing TURSO_DATABASE_URL.');
	}

	return {
		url,
		authToken: readEnv('TURSO_AUTH_TOKEN')
	};
};

export const getDb = (): Database => {
	if (cachedDatabase) {
		return cachedDatabase;
	}

	cachedDatabase = createDatabase(getDatabaseConfig()).db;
	return cachedDatabase;
};
