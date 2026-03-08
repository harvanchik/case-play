import 'dotenv/config';
import { createDatabase, type Database } from './connection';

let cachedDatabase: Database | undefined;
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const readEnv = (key: string) => process.env[key] || viteEnv?.[key];

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
