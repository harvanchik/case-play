import { config as loadDotenv } from 'dotenv';

// Vercel injects environment variables directly into process.env. During
// local development, also load the conventional .env.local file before .env
// without overriding values already supplied by the process.
loadDotenv({ path: ['.env.local', '.env'], override: false, quiet: true });

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

export const readServerEnv = (key: string) => process.env[key] || viteEnv?.[key];
