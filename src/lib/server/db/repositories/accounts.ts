import { and, desc, eq, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Database } from '../connection';
import { getDb } from '../index';
import { accountIdentities, accountSessions, accounts, authors, casePlays, oauthTransactions, playBuilderDiagrams } from '../schema';

const resolveDb = (database?: Database) => database ?? getDb();

export type AccountRecord = typeof accounts.$inferSelect;
export type AccountIdentityRecord = typeof accountIdentities.$inferSelect;
export type AccountSessionRecord = typeof accountSessions.$inferSelect;
export type OAuthTransactionRecord = typeof oauthTransactions.$inferSelect;

export const getAccountById = async (id: string, database?: Database) => {
	const result = await resolveDb(database).select().from(accounts).where(eq(accounts.id, id)).limit(1);
	return result[0] ?? null;
};

export const getAccountByEmail = async (email: string, database?: Database) => {
	const result = await resolveDb(database).select().from(accounts).where(eq(accounts.email, email.toLowerCase())).limit(1);
	return result[0] ?? null;
};

export const createAccount = async (
	input: Pick<AccountRecord, 'id' | 'email' | 'firstName' | 'lastName' | 'createdAt' | 'updatedAt'>,
	database?: Database
) => {
	await resolveDb(database)
		.insert(accounts)
		.values({ ...input, email: input.email.toLowerCase() });
	return getAccountById(input.id, database);
};

export const updateAccountProfile = async (id: string, firstName: string, lastName: string, database?: Database) => {
	const updated = await resolveDb(database)
		.update(accounts)
		.set({ firstName, lastName, updatedAt: new Date().toISOString() })
		.where(eq(accounts.id, id))
		.returning();
	return updated[0] ?? null;
};

export const getAccountIdentity = async (provider: string, providerSubject: string, database?: Database) => {
	const result = await resolveDb(database)
		.select()
		.from(accountIdentities)
		.where(and(eq(accountIdentities.provider, provider), eq(accountIdentities.providerSubject, providerSubject)))
		.limit(1);
	return result[0] ?? null;
};

export const listAccountIdentities = async (accountId: string, database?: Database) =>
	resolveDb(database).select().from(accountIdentities).where(eq(accountIdentities.accountId, accountId));

export const createAccountIdentity = async (
	input: Pick<AccountIdentityRecord, 'id' | 'accountId' | 'provider' | 'providerSubject' | 'providerEmail' | 'createdAt' | 'updatedAt'>,
	database?: Database
) => {
	await resolveDb(database)
		.insert(accountIdentities)
		.values({ ...input, providerEmail: input.providerEmail.toLowerCase() });
	return getAccountIdentity(input.provider, input.providerSubject, database);
};

export const updateAccountIdentity = async (id: string, providerEmail: string, database?: Database) => {
	await resolveDb(database)
		.update(accountIdentities)
		.set({ providerEmail: providerEmail.toLowerCase(), updatedAt: new Date().toISOString() })
		.where(eq(accountIdentities.id, id));
};

export const createAccountSession = async (input: AccountSessionRecord, database?: Database) => {
	await resolveDb(database).insert(accountSessions).values(input);
};

export const getAccountBySessionHash = async (sessionHash: string, database?: Database) => {
	const result = await resolveDb(database)
		.select({ session: accountSessions, account: accounts })
		.from(accountSessions)
		.innerJoin(accounts, eq(accountSessions.accountId, accounts.id))
		.where(eq(accountSessions.sessionHash, sessionHash))
		.limit(1);
	return result[0] ?? null;
};

export const deleteAccountSessionByHash = async (sessionHash: string, database?: Database) => {
	await resolveDb(database).delete(accountSessions).where(eq(accountSessions.sessionHash, sessionHash));
};

export const deleteAllAccountSessions = async (accountId: string, database?: Database) => {
	await resolveDb(database).delete(accountSessions).where(eq(accountSessions.accountId, accountId));
};

export const cleanupExpiredAccountSessions = async (database?: Database) => {
	await resolveDb(database).delete(accountSessions).where(lt(accountSessions.expiresAt, new Date().toISOString()));
};

export const createOAuthTransaction = async (
	input: Pick<
		OAuthTransactionRecord,
		'id' | 'provider' | 'accountId' | 'stateHash' | 'codeVerifier' | 'nonce' | 'returnTo' | 'expiresAt' | 'createdAt'
	>,
	database?: Database
) => {
	await resolveDb(database).insert(oauthTransactions).values(input);
};

export const consumeOAuthTransaction = async (stateHash: string, database?: Database) => {
	const db = resolveDb(database);
	const result = await db.select().from(oauthTransactions).where(eq(oauthTransactions.stateHash, stateHash)).limit(1);
	const transaction = result[0] ?? null;
	if (transaction) await db.delete(oauthTransactions).where(eq(oauthTransactions.id, transaction.id));
	return transaction;
};

export const cleanupExpiredOAuthTransactions = async (database?: Database) => {
	await resolveDb(database).delete(oauthTransactions).where(lt(oauthTransactions.expiresAt, new Date().toISOString()));
};

export const listOwnedPlayBuilderDiagrams = async (accountId: string, database?: Database) => {
	return resolveDb(database)
		.select({
			id: playBuilderDiagrams.id,
			documentJson: playBuilderDiagrams.documentJson,
			createdAt: playBuilderDiagrams.createdAt,
			updatedAt: playBuilderDiagrams.updatedAt
		})
		.from(playBuilderDiagrams)
		.where(eq(playBuilderDiagrams.ownerAccountId, accountId))
		.orderBy(desc(playBuilderDiagrams.updatedAt));
};

const DELETED_ACCOUNT_ID = 'deleted-user';
const DELETED_AUTHOR_ID = 'deleted-user';

export const deleteAccount = async (accountId: string, options: { deleteAuthoredContent: boolean }, database?: Database) => {
	const db = resolveDb(database);
	await db.transaction(async (transaction) => {
		if (options.deleteAuthoredContent) {
			await transaction.delete(playBuilderDiagrams).where(eq(playBuilderDiagrams.ownerAccountId, accountId));
			await transaction.delete(casePlays).where(eq(casePlays.ownerAccountId, accountId));
		} else {
			const timestamp = new Date().toISOString();
			await transaction
				.insert(accounts)
				.values({
					id: DELETED_ACCOUNT_ID,
					email: 'deleted-user@caseplay.invalid',
					firstName: 'Deleted',
					lastName: 'User',
					createdAt: timestamp,
					updatedAt: timestamp
				})
				.onConflictDoNothing();
			await transaction
				.insert(authors)
				.values({
					id: DELETED_AUTHOR_ID,
					firstName: 'Deleted',
					lastName: 'User',
					createdAt: timestamp,
					updatedAt: timestamp
				})
				.onConflictDoNothing();
			await transaction
				.update(playBuilderDiagrams)
				.set({ ownerAccountId: DELETED_ACCOUNT_ID, updatedAt: timestamp })
				.where(eq(playBuilderDiagrams.ownerAccountId, accountId));
			await transaction
				.update(casePlays)
				.set({ ownerAccountId: DELETED_ACCOUNT_ID, authorId: DELETED_AUTHOR_ID, updatedAt: timestamp })
				.where(eq(casePlays.ownerAccountId, accountId));
		}
		await transaction.delete(accounts).where(eq(accounts.id, accountId));
	});
};

/** Used when rolling back a newly created OAuth account that cannot yet own content. */
export const deleteAccountAndOwnedData = async (accountId: string, database?: Database) =>
	deleteAccount(accountId, { deleteAuthoredContent: true }, database);

export const newAccountId = () => randomUUID();
