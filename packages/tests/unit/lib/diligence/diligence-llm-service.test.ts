import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();
const mockEmbedQuery = vi.fn();

vi.mock("@/lib/generated/prisma/client", () => ({
  ApiKeyProvider: { OPENAI: "OPENAI", ANTHROPIC: "ANTHROPIC", GOOGLE: "GOOGLE" },
  DiligenceStageName: { ENTITY_EXTRACTION: "ENTITY_EXTRACTION" },
}));

vi.mock("@/lib/diligence/model-provider", () => ({
  ModelProviderRegistry: class {
    getProvider() {
      return {
        createChatModel: () => ({ invoke: mockInvoke }),
      };
    }
  },
}));

vi.mock("@langchain/core/output_parsers", () => {
  const mockParser = {
    getFormatInstructions: vi.fn().mockReturnValue("Format instructions here"),
    parse: vi.fn().mockResolvedValue({ summary: "parsed summary", itemsJson: "[]" }),
  };
  return {
    StructuredOutputParser: {
      fromNamesAndDescriptions: vi.fn().mockReturnValue(mockParser),
    },
  };
});

vi.mock("@langchain/openai", () => ({
  OpenAIEmbeddings: class {
    embedQuery = mockEmbedQuery;
  },
}));

vi.mock("@langchain/google-genai", () => ({
  GoogleGenerativeAIEmbeddings: class {
    embedQuery = mockEmbedQuery;
  },
}));

const { DiligenceLLMService } = await import(
  "@/lib/diligence/diligence-llm-service"
);

describe("DiligenceLLMService", () => {
  let service: InstanceType<typeof DiligenceLLMService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiligenceLLMService();
  });

  describe("invokeStructured", () => {
    it("invokes the primary provider and returns parsed output", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: "raw LLM response text",
        usage_metadata: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      });

      const result = await service.invokeStructured({
        stage: "ENTITY_EXTRACTION" as any,
        systemInstruction: "You are a specialist.",
        userPrompt: "Extract entities from documents.",
        fields: { summary: "Summary", itemsJson: "JSON array" },
        primary: { provider: "OPENAI" as any, model: "gpt-4o", apiKey: "sk-test" },
        fallbacks: [],
      });

      expect(result.provider).toBe("OPENAI");
      expect(result.model).toBe("gpt-4o");
      expect(result.parsed).toEqual({ summary: "parsed summary", itemsJson: "[]" });
      expect(result.usage).toEqual({ input_tokens: 100, output_tokens: 50, total_tokens: 150 });
      expect(result.rawText).toBe("raw LLM response text");
    });

    it("falls back to next provider when primary fails", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Rate limited"))
        .mockResolvedValueOnce({
          content: "fallback response",
          usage_metadata: { input_tokens: 80, output_tokens: 40, total_tokens: 120 },
        });

      const result = await service.invokeStructured({
        stage: "ENTITY_EXTRACTION" as any,
        systemInstruction: "You are a specialist.",
        userPrompt: "Extract entities.",
        fields: { summary: "Summary", itemsJson: "JSON array" },
        primary: { provider: "OPENAI" as any, model: "gpt-4o", apiKey: "sk-test" },
        fallbacks: [{ provider: "ANTHROPIC" as any, model: "claude-3", apiKey: "sk-ant" }],
      });

      expect(result.provider).toBe("ANTHROPIC");
      expect(result.model).toBe("claude-3");
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it("throws the last error when all providers fail", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Primary failed"))
        .mockRejectedValueOnce(new Error("Fallback failed"));

      await expect(
        service.invokeStructured({
          stage: "ENTITY_EXTRACTION" as any,
          systemInstruction: "You are a specialist.",
          userPrompt: "Extract entities.",
          fields: { summary: "Summary", itemsJson: "JSON array" },
          primary: { provider: "OPENAI" as any, model: "gpt-4o", apiKey: "sk-test" },
          fallbacks: [{ provider: "ANTHROPIC" as any, model: "claude-3", apiKey: "sk-ant" }],
        })
      ).rejects.toThrow("Fallback failed");
    });

    it("throws generic error when lastError is not an Error instance", async () => {
      mockInvoke.mockRejectedValueOnce("string error");

      await expect(
        service.invokeStructured({
          stage: "ENTITY_EXTRACTION" as any,
          systemInstruction: "Instruction",
          userPrompt: "Prompt",
          fields: { summary: "Summary" },
          primary: { provider: "OPENAI" as any, model: "gpt-4o", apiKey: "sk-test" },
          fallbacks: [],
        })
      ).rejects.toThrow("No providers were able to produce a structured response.");
    });

    it("returns null usage when message has no usage_metadata", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: "response",
      });

      const result = await service.invokeStructured({
        stage: "ENTITY_EXTRACTION" as any,
        systemInstruction: "Instruction",
        userPrompt: "Prompt",
        fields: { summary: "Summary" },
        primary: { provider: "OPENAI" as any, model: "gpt-4o", apiKey: "sk-test" },
        fallbacks: [],
      });

      expect(result.usage).toBeNull();
    });
  });

  describe("embedText", () => {
    it("returns null for empty text", async () => {
      const result = await service.embedText("OPENAI" as any, "sk-test", "   ");
      expect(result).toBeNull();
      expect(mockEmbedQuery).not.toHaveBeenCalled();
    });

    it("embeds text using OpenAI embeddings", async () => {
      mockEmbedQuery.mockResolvedValueOnce([0.1, 0.2, 0.3]);

      const result = await service.embedText("OPENAI" as any, "sk-test", "hello world");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("embeds text using Google embeddings", async () => {
      mockEmbedQuery.mockResolvedValueOnce([0.4, 0.5, 0.6]);

      const result = await service.embedText("GOOGLE" as any, "AIzaSy-test", "hello world");
      expect(result).toEqual([0.4, 0.5, 0.6]);
    });

    it("returns null for unsupported provider (Anthropic)", async () => {
      const result = await service.embedText("ANTHROPIC" as any, "sk-ant", "hello world");
      expect(result).toBeNull();
    });
  });
});
