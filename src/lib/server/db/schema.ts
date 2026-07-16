import { relations, sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
	'caseplay_users',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull(),
		passwordHash: text('password_hash').notNull(),
		role: text('role').notNull().default('user'),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [
		uniqueIndex('users_email_unique').on(table.email),
		index('users_role_idx').on(table.role),
		check('users_role_check', sql`${table.role} in ('admin', 'user')`)
	]
);

export const sessions = sqliteTable(
	'caseplay_sessions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		sessionHash: text('session_hash').notNull(),
		expiresAt: text('expires_at').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [uniqueIndex('sessions_hash_unique').on(table.sessionHash), index('sessions_user_id_idx').on(table.userId)]
);

export const authors = sqliteTable(
	'authors',
	{
		id: text('id').primaryKey(),
		firstName: text('first_name').notNull(),
		lastName: text('last_name').notNull(),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [index('authors_name_idx').on(table.lastName, table.firstName)]
);

export const rulebooks = sqliteTable(
	'rulebooks',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		slug: text('slug').notNull(),
		nickname: text('nickname'),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [uniqueIndex('rulebooks_slug_unique').on(table.slug)]
);

export const sports = sqliteTable(
	'sports',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [uniqueIndex('sports_slug_unique').on(table.slug)]
);

export const casePlays = sqliteTable(
	'case_plays',
	{
		id: text('id').primaryKey(),
		sourceKey: text('source_key'),
		title: text('title').notNull(),
		prompt: text('prompt').notNull(),
		answer: text('answer').notNull(),
		edition: text('edition'),
		ruleReference: text('rule_reference'),
		pageNumber: integer('page_number'),
		difficulty: integer('difficulty').notNull(),
		filmUrl: text('film_url'),
		authorId: text('author_id').references(() => authors.id, { onDelete: 'set null' }),
		rulebookId: text('rulebook_id').references(() => rulebooks.id, { onDelete: 'set null' }),
		sportId: text('sport_id').references(() => sports.id, { onDelete: 'set null' }),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [
		uniqueIndex('case_plays_source_key_unique').on(table.sourceKey),
		index('case_plays_title_idx').on(table.title),
		index('case_plays_author_id_idx').on(table.authorId),
		index('case_plays_rulebook_id_idx').on(table.rulebookId),
		index('case_plays_sport_id_idx').on(table.sportId),
		check('case_plays_difficulty_check', sql`${table.difficulty} in (1, 2, 3)`)
	]
);

export const playlists = sqliteTable(
	'playlists',
	{
		id: text('id').primaryKey(),
		sourceKey: text('source_key'),
		title: text('title').notNull(),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [uniqueIndex('playlists_source_key_unique').on(table.sourceKey)]
);

export const playBuilderDiagrams = sqliteTable(
	'play_builder_diagrams',
	{
		id: text('id').primaryKey(),
		documentJson: text('document_json').notNull(),
		editTokenHash: text('edit_token_hash').notNull(),
		createdAt: text('created_at').notNull(),
		updatedAt: text('updated_at').notNull()
	},
	(table) => [index('play_builder_diagrams_updated_at_idx').on(table.updatedAt)]
);

export const playlistCasePlays = sqliteTable(
	'playlist_case_plays',
	{
		playlistId: text('playlist_id')
			.notNull()
			.references(() => playlists.id, { onDelete: 'cascade' }),
		casePlayId: text('case_play_id')
			.notNull()
			.references(() => casePlays.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		createdAt: text('created_at').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.playlistId, table.casePlayId] }),
		index('playlist_case_plays_playlist_position_idx').on(table.playlistId, table.position)
	]
);

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const authorsRelations = relations(authors, ({ many }) => ({
	casePlays: many(casePlays)
}));

export const rulebooksRelations = relations(rulebooks, ({ many }) => ({
	casePlays: many(casePlays)
}));

export const sportsRelations = relations(sports, ({ many }) => ({
	casePlays: many(casePlays)
}));

export const casePlaysRelations = relations(casePlays, ({ one, many }) => ({
	author: one(authors, {
		fields: [casePlays.authorId],
		references: [authors.id]
	}),
	rulebook: one(rulebooks, {
		fields: [casePlays.rulebookId],
		references: [rulebooks.id]
	}),
	sport: one(sports, {
		fields: [casePlays.sportId],
		references: [sports.id]
	}),
	playlistEntries: many(playlistCasePlays)
}));

export const playlistsRelations = relations(playlists, ({ many }) => ({
	entries: many(playlistCasePlays)
}));

export const playlistCasePlaysRelations = relations(playlistCasePlays, ({ one }) => ({
	playlist: one(playlists, {
		fields: [playlistCasePlays.playlistId],
		references: [playlists.id]
	}),
	casePlay: one(casePlays, {
		fields: [playlistCasePlays.casePlayId],
		references: [casePlays.id]
	})
}));

export type DatabaseUser = typeof users.$inferSelect;
