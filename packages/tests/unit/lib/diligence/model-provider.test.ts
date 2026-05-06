import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/generated/prisma/client", () => ({
  ApiKeyProvider: { OPENAI: "OPENAI", ANTHROPIC: "ANTHROPIC", GOOGLE: "GOOGLE" },
}));

const mockChatOpenAI = vi.fn();
const mockChatAnthropic = vi.fn();
const mockChatGoogleGenerativeAI = vi.fn();

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: mockChatOpenAI,
}));

vi.mock("@langchain/anthropic", () => ({
  ChatAnthropic: mockChatAnthropic,
}));

vi.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: mockChatGoogleGenerativeAI,
}));

const { ModelProviderRegistry } = await import("@/lib/diligence/model-provider");

describe("ModelProviderRegistry", () => {
  it("creates a registry with all three providers", () => {
    const registry = new ModelProviderRegistry();
    expect(registry.getProvider("OPENAI" as any)).toBeDefined();
    expect(registry.getProvider("ANTHROPIC" as any)).toBeDefined();
    expect(registry.getProvider("GOOGLE" as any)).toBeDefined();
  });

  it("throws for unsupported provider", () => {
    const registry = new ModelProviderRegistry();
    expect(() => registry.getProvider("UNKNOWN" as any)).toThrow(
      "Unsupported provider: UNKNOWN"
    );
  });

  describe("OpenAI provider", () => {
    it("creates a ChatOpenAI model with correct config", () => {
      const registry = new ModelProviderRegistry();
      const provider = registry.getProvider("OPENAI" as any);

      provider.createChatModel({
        provider: "OPENAI" as any,
        model: "gpt-4o",
        apiKey: "sk-test",
        temperature: 0.5,
        maxRetries: 3,
      });

      expect(mockChatOpenAI).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: "gpt-4o",
        temperature: 0.5,
        maxRetries: 3,
      });
    });

    it("uses default temperature 0 and maxRetries 2", () => {
      const registry = new ModelProviderRegistry();
      const provider = registry.getProvider("OPENAI" as any);

      provider.createChatModel({
        provider: "OPENAI" as any,
        model: "gpt-4o",
        apiKey: "sk-test",
      });

      expect(mockChatOpenAI).toHaveBeenCalledWith({
        apiKey: "sk-test",
        model: "gpt-4o",
        temperature: 0,
        maxRetries: 2,
      });
    });
  });

  describe("Anthropic provider", () => {
    it("creates a ChatAnthropic model with correct config", () => {
      const registry = new ModelProviderRegistry();
      const provider = registry.getProvider("ANTHROPIC" as any);

      provider.createChatModel({
        provider: "ANTHROPIC" as any,
        model: "claude-3-5-sonnet",
        apiKey: "sk-ant-test",
        temperature: 0.2,
        maxRetries: 1,
      });

      expect(mockChatAnthropic).toHaveBeenCalledWith({
        apiKey: "sk-ant-test",
        model: "claude-3-5-sonnet",
        temperature: 0.2,
        maxRetries: 1,
      });
    });
  });

  describe("Google provider", () => {
    it("creates a ChatGoogleGenerativeAI model with correct config", () => {
      const registry = new ModelProviderRegistry();
      const provider = registry.getProvider("GOOGLE" as any);

      provider.createChatModel({
        provider: "GOOGLE" as any,
        model: "gemini-2.5-flash",
        apiKey: "AIzaSy-test",
      });

      expect(mockChatGoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: "AIzaSy-test",
        model: "gemini-2.5-flash",
        temperature: 0,
        maxRetries: 2,
      });
    });
  });
});
