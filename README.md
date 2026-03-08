# case-play

`case-play` is a SvelteKit app for browsing and authoring sports officiating case plays with a protected admin area for managing content.

## Stack

- SvelteKit with `@sveltejs/adapter-vercel`
- Turso / libSQL
- Drizzle ORM with checked-in SQL migrations
- Cookie-based admin auth using hashed passwords and hashed session tokens

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
ADMIN_BOOTSTRAP_EMAIL=admin@example.com
ADMIN_BOOTSTRAP_PASSWORD=replace-me-with-a-strong-password
SESSION_COOKIE_SECRET=replace-me-with-a-long-random-string
```

## Local Setup

```bash
pnpm install
pnpm db:migrate
pnpm db:bootstrap-admin
pnpm dev
```

Then:

- Public site: `/`
- Admin login: `/admin/login`
- New case play entry point: `/admin/case-plays/new`

## Database Workflow

- `pnpm db:migrate`: applies checked-in SQL files from [`drizzle/0000_initial.sql`](/Users/jh6/Documents/GitHub/case-play/drizzle/0000_initial.sql)
- `pnpm db:generate`: generates new Drizzle migration artifacts from the schema for future changes
- `pnpm db:bootstrap-admin`: creates the first admin user only when no admin exists

## Importing Recovered Content

The importer accepts partial JSON payloads so recovery can happen incrementally:

```bash
pnpm import:caseplays ./path/to/import.json
```

Expected JSON shape:

```json
{
  "casePlays": [
    {
      "sourceKey": "legacy-001",
      "title": "Touchdown on Final Play",
      "prompt": "Prompt text",
      "answer": "Answer text",
      "edition": "21st",
      "difficulty": 2,
      "filmUrl": "https://example.com/video",
      "author": {
        "firstName": "Jake",
        "lastName": "Harvanchik"
      },
      "rulebook": {
        "title": "NIRSA Flag Football",
        "slug": "nirsa-flag",
        "nickname": "NIRSA Flag"
      },
      "sport": {
        "name": "Flag Football",
        "slug": "flag-football"
      }
    }
  ],
  "playlists": [
    {
      "sourceKey": "playlist-flag-intro",
      "title": "Flag Football Basics",
      "casePlaySourceKeys": ["legacy-001"]
    }
  ]
}
```

The importer upserts:

- authors by exact first/last name
- rulebooks by slug
- sports by slug
- case plays by `sourceKey`
- playlists by `sourceKey`

## Deployment

1. Create a Turso database and auth token.
2. Set the environment variables in Vercel.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:bootstrap-admin`.
5. Deploy the app.
6. Verify `/`, `/playlists`, `/admin/login`, and an authenticated `/admin` session.

## Notes

- `/upload` now redirects to the protected admin flow.
- Public account registration is intentionally out of scope.
