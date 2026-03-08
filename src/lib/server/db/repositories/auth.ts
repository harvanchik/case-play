import { count, eq } from 'drizzle-orm';
import { getDb } from '../index';
import { sessions, users, type DatabaseUser } from '../schema';
import type { Database } from '../connection';

export type CreateUserInput = {
	id: string;
	email: string;
	passwordHash: string;
	role: 'admin' | 'user';
	createdAt: string;
	updatedAt: string;
};

const resolveDb = (database?: Database) => database ?? getDb();

export const countAdminUsers = async (database?: Database) => {
	const db = resolveDb(database);
	const result = await db
		.select({ total: count() })
		.from(users)
		.where(eq(users.role, 'admin'));

	return result[0]?.total ?? 0;
};

export const createUser = async (input: CreateUserInput, database?: Database) => {
	const db = resolveDb(database);
	await db.insert(users).values(input);
};

export const getUserByEmail = async (email: string, database?: Database) => {
	const db = resolveDb(database);
	const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
	return result[0] ?? null;
};

export const createSession = async (
	input: {
		id: string;
		userId: string;
		sessionHash: string;
		expiresAt: string;
		createdAt: string;
	},
	database?: Database
) => {
	const db = resolveDb(database);
	await db.insert(sessions).values(input);
};

export const getSessionUserByHash = async (sessionHash: string, database?: Database) => {
	const db = resolveDb(database);
	const result = await db
		.select({
			sessionId: sessions.id,
			sessionHash: sessions.sessionHash,
			expiresAt: sessions.expiresAt,
			user: {
				id: users.id,
				email: users.email,
				role: users.role,
				createdAt: users.createdAt,
				updatedAt: users.updatedAt
			}
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.sessionHash, sessionHash))
		.limit(1);

	return result[0] ?? null;
};

export const deleteSessionByHash = async (sessionHash: string, database?: Database) => {
	const db = resolveDb(database);
	await db.delete(sessions).where(eq(sessions.sessionHash, sessionHash));
};

export type AuthenticatedUser = {
	id: DatabaseUser['id'];
	email: DatabaseUser['email'];
	role: 'admin' | 'user';
	createdAt: DatabaseUser['createdAt'];
	updatedAt: DatabaseUser['updatedAt'];
};
