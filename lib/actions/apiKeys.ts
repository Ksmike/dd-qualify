"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export type ApiKeyProvider = "OPENAI" | "ANTHROPIC" | "GOOGLE";

export type ApiKeyStatus = {
  provider: ApiKeyProvider;
  isSet: boolean;
  hint: string | null;
};

const PROVIDERS: ApiKeyProvider[] = ["OPENAI", "ANTHROPIC", "GOOGLE"];

export async function getApiKeyStatuses(): Promise<ApiKeyStatus[]> {
  const session = await auth();
  if (!session?.user?.id) return PROVIDERS.map((p) => ({ provider: p, isSet: false, hint: null }));

  const keys = await db.userApiKey.findMany({
    where: { userId: session.user.id },
    select: { provider: true, keyHint: true },
  });

  return PROVIDERS.map((provider) => {
    const key = keys.find((k) => k.provider === provider);
    return { provider, isSet: !!key, hint: key?.keyHint ?? null };
  });
}

export async function upsertApiKey(
  provider: ApiKeyProvider,
  rawKey: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!PROVIDERS.includes(provider)) return { error: "Invalid provider" };

  const trimmed = rawKey.trim();
  if (!trimmed) return { error: "API key cannot be empty" };
  if (trimmed.length < 8) return { error: "API key is too short" };

  const encryptedKey = encrypt(trimmed);
  const keyHint = trimmed.slice(-4);

  await db.userApiKey.upsert({
    where: { userId_provider: { userId: session.user.id, provider } },
    create: { userId: session.user.id, provider, encryptedKey, keyHint },
    update: { encryptedKey, keyHint },
  });

  revalidatePath("/settings");
  return {};
}

export async function deleteApiKey(
  provider: ApiKeyProvider
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!PROVIDERS.includes(provider)) return { error: "Invalid provider" };

  await db.userApiKey.deleteMany({
    where: { userId: session.user.id, provider },
  });

  revalidatePath("/settings");
  return {};
}

/** Retrieve the decrypted API key for internal server-side AI calls. */
export async function getDecryptedApiKey(
  provider: ApiKeyProvider
): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const record = await db.userApiKey.findUnique({
    where: { userId_provider: { userId: session.user.id, provider } },
    select: { encryptedKey: true },
  });

  if (!record) return null;
  return decrypt(record.encryptedKey);
}
