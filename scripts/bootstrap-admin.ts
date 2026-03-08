import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../src/lib/server/db/connection';
import { hashPassword } from '../src/lib/server/auth/password';
import { countAdminUsers, createUser } from '../src/lib/server/db/repositories/auth';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

if (!databaseUrl) {
	throw new Error('Missing TURSO_DATABASE_URL.');
}

if (!adminEmail || !adminPassword) {
	throw new Error('Missing ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD.');
}

const { db, client } = createDatabase({
	url: databaseUrl,
	authToken: process.env.TURSO_AUTH_TOKEN
});

const existingAdmins = await countAdminUsers(db);

if (existingAdmins > 0) {
	console.log('An admin user already exists. Skipping bootstrap.');
	await client.close();
	process.exit(0);
}

const now = new Date().toISOString();

await createUser(
	{
		id: randomUUID(),
		email: adminEmail,
		passwordHash: await hashPassword(adminPassword),
		role: 'admin',
		createdAt: now,
		updatedAt: now
	},
	db
);

console.log(`Created bootstrap admin ${adminEmail}`);
await client.close();
