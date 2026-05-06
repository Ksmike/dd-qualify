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

function normalizeDatabaseUrl(connectionString: string): string {
  const url = new URL(connectionString);
  const sslmode = url.searchParams.get("sslmode");

  if (
    !sslmode ||
    sslmode === "prefer" ||
    sslmode === "require" ||
    sslmode === "verify-ca"
  ) {
    // Keep strict certificate verification semantics across driver upgrades.
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

export const config = {
  database: {
    url: normalizeDatabaseUrl(envRequired("DATABASE_URL")),
  },
  auth: {
    secret: env("AUTH_SECRET"),
    url: env("AUTH_URL"),
  },
  encryptionKey: env("ENCRYPTION_KEY"),
} as const;
