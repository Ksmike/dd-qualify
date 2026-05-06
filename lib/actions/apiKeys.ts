"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiKeyProvider } from "@/lib/generated/prisma/client";
import { ModelProviderRegistry } from "@/lib/diligence/model-provider";
import { defaultModelForProvider } from "@/lib/diligence/model-router";
import { UserApiKeyModel } from "@/lib/models/UserApiKeyModel";

export type ApiKeyStatus = {
  id: string | null;
  provider: ApiKeyProvider;
  isSet: boolean;
  hint: string | null;
  defaultModel: string | null;
  enabled: boolean;
  lastValidatedAt: string | null;
};

const PROVIDERS: ApiKeyProvider[] = ["OPENAI", "ANTHROPIC", "GOOGLE"];

export async function getApiKeyStatuses(): Promise<ApiKeyStatus[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return PROVIDERS.map((provider) => ({
      id: null,
      provider,
      isSet: false,
      hint: null,
      defaultModel: defaultModelForProvider(provider),
      enabled: false,
      lastValidatedAt: null,
    }));
  }

  const keys = await UserApiKeyModel.listForUser(session.user.id);

  return PROVIDERS.map((provider) => {
    const key = keys.find((k) => k.provider === provider);
    return {
      id: key?.id ?? null,
      provider,
      isSet: !!key,
      hint: key?.keyHint ?? null,
      defaultModel: key?.defaultModel ?? defaultModelForProvider(provider),
      enabled: key?.enabled ?? false,
      lastValidatedAt: key?.lastValidatedAt?.toISOString() ?? null,
    };
  });
}

async function pingProviderKey(input: {
  provider: ApiKeyProvider;
  apiKey: string;
  model: string;
}): Promise<{ isValid: boolean; error?: string }> {
  try {
    const providers = new ModelProviderRegistry();
    const modelProvider = providers.getProvider(input.provider);
    const model = modelProvider.createChatModel({
      provider: input.provider,
      model: input.model,
      apiKey: input.apiKey,
      temperature: 0,
      maxRetries: 1,
    });
    await model.invoke(
      "Respond with exactly one word: OK. Do not include punctuation."
    );
    return { isValid: true };
  } catch {
    return { isValid: false, error: "Provider rejected the key or model." };
  }
}

export async function validateApiKey(
  provider: ApiKeyProvider,
  rawKey: string,
  requestedModel?: string
): Promise<{ error?: string; validatedAt?: string; modelUsed?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!PROVIDERS.includes(provider)) return { error: "Invalid provider" };

  const trimmed = rawKey.trim();
  if (!trimmed) return { error: "API key cannot be empty" };

  const model = requestedModel?.trim() || defaultModelForProvider(provider);
  const validation = await pingProviderKey({
    provider,
    apiKey: trimmed,
    model,
  });

  if (!validation.isValid) {
    return { error: validation.error ?? "API key validation failed." };
  }

  return {
    validatedAt: new Date().toISOString(),
    modelUsed: model,
  };
}

type UpsertApiKeyOptions = {
  defaultModel?: string | null;
  enabled?: boolean;
  validateBeforeSave?: boolean;
};

export async function upsertApiKey(
  provider: ApiKeyProvider,
  rawKey: string,
  options?: UpsertApiKeyOptions
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  if (!PROVIDERS.includes(provider)) return { error: "Invalid provider" };

  const trimmed = rawKey.trim();
  if (!trimmed) return { error: "API key cannot be empty" };
  if (trimmed.length < 8) return { error: "API key is too short" };

  const defaultModel =
    options?.defaultModel?.trim() || defaultModelForProvider(provider);
  if (options?.validateBeforeSave) {
    const validation = await pingProviderKey({
      provider,
      apiKey: trimmed,
      model: defaultModel,
    });
    if (!validation.isValid) {
      return { error: validation.error ?? "API key validation failed." };
    }
  }

  const encryptedKey = UserApiKeyModel.encryptApiKey(trimmed);
  const keyHint = trimmed.slice(-4);
  const now = new Date();

  await db.userApiKey.upsert({
    where: { userId_provider: { userId: session.user.id, provider } },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey,
      keyHint,
      defaultModel,
      enabled: options?.enabled ?? true,
      lastValidatedAt: options?.validateBeforeSave ? now : null,
      validationError: null,
    },
    update: {
      encryptedKey,
      keyHint,
      defaultModel,
      enabled: options?.enabled ?? true,
      lastValidatedAt: options?.validateBeforeSave ? now : undefined,
      validationError: null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/project");
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

export async function updateApiKeySettings(
  provider: ApiKeyProvider,
  input: { defaultModel?: string | null; enabled?: boolean }
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!PROVIDERS.includes(provider)) return { error: "Invalid provider" };

  const updateData: {
    defaultModel?: string | null;
    enabled?: boolean;
  } = {};

  if (typeof input.defaultModel !== "undefined") {
    updateData.defaultModel =
      input.defaultModel?.trim() || defaultModelForProvider(provider);
  }
  if (typeof input.enabled === "boolean") {
    updateData.enabled = input.enabled;
  }

  await db.userApiKey.updateMany({
    where: { userId: session.user.id, provider },
    data: updateData,
  });

  revalidatePath("/settings");
  revalidatePath("/project");
  return {};
}

/** Retrieve the decrypted API key for internal server-side AI calls. */
export async function getDecryptedApiKey(
  provider: ApiKeyProvider
): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const record = await UserApiKeyModel.findForUser({
    userId: session.user.id,
    provider,
  });

  if (!record) return null;
  return UserApiKeyModel.decryptApiKey(record.encryptedKey);
}

export async function getDecryptedApiKeyByIdForUser(input: {
  userId: string;
  userApiKeyId: string;
}): Promise<{ provider: ApiKeyProvider; apiKey: string } | null> {
  const record = await UserApiKeyModel.findByIdForUser(input);
  if (!record) {
    return null;
  }

  return {
    provider: record.provider,
    apiKey: UserApiKeyModel.decryptApiKey(record.encryptedKey),
  };
}
