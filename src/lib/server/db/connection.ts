import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

export type DatabaseConfig = {
	url: string;
	authToken?: string;
};

export type Database = LibSQLDatabase<typeof schema>;

export const createDatabase = (config: DatabaseConfig) => {
	const client = createClient({
		url: config.url,
		authToken: config.authToken
	});

	return {
		client,
		db: drizzle(client, { schema })
	};
};
