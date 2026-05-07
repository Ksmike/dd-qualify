"use client";

import { useState, useTransition } from "react";
import { SiOpenai, SiAnthropic, SiGoogle } from "react-icons/si";
import { FiEdit2, FiTrash2, FiX, FiLoader, FiAlertCircle } from "react-icons/fi";
import {
  upsertApiKey,
  deleteApiKey,
  validateApiKey,
  updateApiKeySettings,
} from "@/lib/actions/apiKeys";
import type { ApiKeyStatus } from "@/lib/actions/apiKeys";
import type { ApiKeyProvider } from "@/lib/generated/prisma/client";
import type { IconType } from "react-icons";

type ProviderMeta = {
  name: string;
  description: string;
  placeholder: string;
  Icon: IconType;
  iconColor: string;
  iconBg: string;
};

const PROVIDER_META: Record<ApiKeyProvider, ProviderMeta> = {
  OPENAI: {
    name: "OpenAI",
    description: "GPT-4o, o3, and reasoning models",
    placeholder: "sk-...",
    Icon: SiOpenai,
    iconColor: "text-[#10a37f]",
    iconBg: "bg-[#10a37f]/10",
  },
  ANTHROPIC: {
    name: "Anthropic",
    description: "Claude Sonnet, Opus, and Haiku",
    placeholder: "sk-ant-api03-...",
    Icon: SiAnthropic,
    iconColor: "text-[#d4956a]",
    iconBg: "bg-[#d4956a]/10",
  },
  GOOGLE: {
    name: "Google AI",
    description: "Gemini 2.5 Pro and Flash",
    placeholder: "AIzaSy...",
    Icon: SiGoogle,
    iconColor: "text-[#4285f4]",
    iconBg: "bg-[#4285f4]/10",
  },
};

type Mode = "idle" | "editing";

export function ApiKeyCard({
  initial,
  onUpdate,
}: {
  initial: ApiKeyStatus;
  onUpdate: (updated: ApiKeyStatus) => void;
}) {
  const { provider } = initial;
  const meta = PROVIDER_META[provider];
  const { Icon, iconColor, iconBg } = meta;

  const [status, setStatus] = useState(initial);
  const [mode, setMode] = useState<Mode>("idle");
  const [inputValue, setInputValue] = useState("");
  const [defaultModel, setDefaultModel] = useState(initial.defaultModel ?? "");
  const [enabled, setEnabled] = useState(initial.enabled);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setError("");
    startTransition(async () => {
      const result = await upsertApiKey(provider, trimmed, {
        defaultModel,
        enabled,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const updated: ApiKeyStatus = {
        id: status.id,
        provider,
        isSet: true,
        hint: trimmed.slice(-4),
        defaultModel,
        enabled,
        lastValidatedAt: status.lastValidatedAt,
      };
      setStatus(updated);
      onUpdate(updated);
      setInputValue("");
      setMode("idle");
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      await deleteApiKey(provider);
      const updated: ApiKeyStatus = {
        id: null,
        provider,
        isSet: false,
        hint: null,
        defaultModel,
        enabled: false,
        lastValidatedAt: null,
      };
      setStatus(updated);
      onUpdate(updated);
      setMode("idle");
      setInputValue("");
    });
  }

  async function handleTestKey() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setError("");
    setIsValidating(true);
    try {
      const result = await validateApiKey(provider, trimmed, defaultModel);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus((currentStatus) => ({
        ...currentStatus,
        lastValidatedAt: result.validatedAt ?? currentStatus.lastValidatedAt,
      }));
    } finally {
      setIsValidating(false);
    }
  }

  function handleSaveSettings() {
    startTransition(async () => {
      const result = await updateApiKeySettings(provider, {
        enabled,
        defaultModel,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      const updated: ApiKeyStatus = {
        ...status,
        enabled,
        defaultModel,
      };
      setStatus(updated);
      onUpdate(updated);
    });
  }

  function handleCancel() {
    setMode("idle");
    setInputValue("");
    setError("");
  }

  const showInput = !status.isSet || mode === "editing";

  return (
    <div className="rounded-xl border border-divider bg-content1 transition-shadow hover:shadow-sm">
      {/* Header row */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3 sm:flex-1">
          {/* Provider icon */}
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>

          {/* Provider info */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{meta.name}</p>
            <p className="text-xs leading-snug text-foreground/50">{meta.description}</p>
          </div>
        </div>

        {/* Status badge + action buttons */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
          {status.isSet ? (
            <>
              <span className="flex items-center gap-1.5 rounded-full bg-[#10a37f]/10 px-2.5 py-0.5 text-xs font-medium text-[#10a37f]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10a37f]" />
                Connected
              </span>
              {mode === "idle" && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMode("editing")}
                    disabled={isPending}
                    title="Update key"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 transition-colors hover:bg-content2 hover:text-foreground disabled:opacity-40"
                  >
                    <FiEdit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={isPending}
                    title="Revoke key"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                  >
                    {isPending ? (
                      <FiLoader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FiTrash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-content2 px-2.5 py-0.5 text-xs font-medium text-foreground/50">
              <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
              Not configured
            </span>
          )}
        </div>
      </div>

      {/* Key hint row */}
      {status.isSet && status.hint && mode === "idle" && (
        <div className="border-t border-divider px-5 py-2.5">
          <p className="font-mono text-xs text-foreground/40 tracking-wider">
            ••••••••••••••••{status.hint}
          </p>
        </div>
      )}

      {/* Input row */}
      {showInput && (
        <div className="border-t border-divider p-4 pt-4 sm:p-5 sm:pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <input
              type="password"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={mode === "editing" ? "Paste new key to update" : meta.placeholder}
              autoComplete="off"
              className="w-full min-w-0 flex-1 rounded-md border border-divider bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                onClick={handleSave}
                disabled={isPending || !inputValue.trim()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                {isPending && <FiLoader className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? "Saving…" : status.isSet ? "Update" : "Save"}
              </button>
              <button
                onClick={() => void handleTestKey()}
                disabled={isValidating || !inputValue.trim()}
                className="flex-1 rounded-md border border-divider px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-content2 disabled:opacity-40 sm:flex-none"
              >
                {isValidating ? "Testing…" : "Test key"}
              </button>
              {mode === "editing" && (
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  title="Cancel"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-divider text-foreground/50 transition-colors hover:bg-content2 hover:text-foreground disabled:opacity-50"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
              <FiAlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      {status.isSet && mode === "idle" && (
        <div className="space-y-3 border-t border-divider p-4 pt-4 sm:p-5 sm:pt-4">
          <label className="block">
            <span className="text-xs text-foreground/60">Default model</span>
            <input
              value={defaultModel}
              onChange={(event) => setDefaultModel(event.target.value)}
              className="mt-1 w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-foreground/70">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Provider enabled for diligence jobs
          </label>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isPending}
            className="w-full rounded-md border border-divider px-3 py-2 text-xs font-medium text-foreground hover:bg-content2 disabled:opacity-50 sm:w-auto sm:py-1.5"
          >
            Save provider settings
          </button>
        </div>
      )}
    </div>
  );
}
