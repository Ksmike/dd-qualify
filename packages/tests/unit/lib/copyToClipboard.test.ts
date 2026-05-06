import { describe, expect, it, vi, beforeEach } from "vitest";
import { copyToClipboard } from "@/lib/utils/copyToClipboard";

describe("copyToClipboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses navigator clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const copied = await copyToClipboard("abc-123");

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith("abc-123");
  });

  it("falls back to document.execCommand when clipboard API is unavailable", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    const copied = await copyToClipboard("fallback-text");

    expect(copied).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});
