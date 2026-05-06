/**
 * Centralized environment configuration.
 * Handles Vercel/Neon integration prefixed env vars (dd_*) as fallbacks.
 */

function env(key: string): string | undefined {
  return process.env[key] ?? process.env[`dd_${key}`];
}

function envRequired(key: string): string {
  const value = env(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key} (also checked dd_${key})`
    );
  }
  return value;
}

export const config = {
  database: {
    url: envRequired("DATABASE_URL"),
  },
  auth: {
    secret: env("AUTH_SECRET"),
    url: env("AUTH_URL"),
  },
} as const;
