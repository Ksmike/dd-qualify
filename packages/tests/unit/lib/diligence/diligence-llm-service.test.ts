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

const baseInput = {
  stage: "ENTITY_EXTRACTION" as const,
  systemInstruction: "You are a specialist.",
  userPrompt: "Do the thing.",
  outputSchema: 'items: JSON array. summary: paragraph.',
  primary: {
    provider: "OPENAI" as const,
    model: "gpt-4o",
    apiKey: "sk-test",
  },
  fallbacks: [],
};

describe("DiligenceLLMService", () => {
  let service: InstanceType<typeof DiligenceLLMService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiligenceLLMService();
  });

  describe("invokeStructured", () => {
    it("parses a JSON object from raw model output", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: '{"summary": "ok", "items": [{"a": 1}]}',
        usage_metadata: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
      });

      const result = await service.invokeStructured<{
        summary: string;
        items: unknown[];
      }>(baseInput);

      expect(result.provider).toBe("OPENAI");
      expect(result.parsed.summary).toBe("ok");
      expect(result.parsed.items).toEqual([{ a: 1 }]);
      expect(result.usage).toEqual({
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      });
    });

    it("strips markdown fences before parsing JSON", async () => {
      mockInvoke.mockResolvedValueOnce({
        content: '```json\n{"summary": "fenced", "items": []}\n```',
      });

      const result = await service.invokeStructured<{
        summary: string;
        items: unknown[];
      }>(baseInput);

      expect(result.parsed.summary).toBe("fenced");
    });

    it("falls back to next provider when primary fails", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Rate limited"))
        .mockResolvedValueOnce({
          content: '{"summary": "fb", "items": []}',
          usage_metadata: { input_tokens: 80, output_tokens: 40, total_tokens: 120 },
        });

      const result = await service.invokeStructured<{
        summary: string;
        items: unknown[];
      }>({
        ...baseInput,
        fallbacks: [
          { provider: "ANTHROPIC" as const, model: "claude-3", apiKey: "sk-ant" },
        ],
      });

      expect(result.provider).toBe("ANTHROPIC");
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it("throws the last error when all providers fail", async () => {
      mockInvoke
        .mockRejectedValueOnce(new Error("Primary failed"))
        .mockRejectedValueOnce(new Error("Fallback failed"));

      await expect(
        service.invokeStructured<unknown>({
          ...baseInput,
          fallbacks: [
            {
              provider: "ANTHROPIC" as const,
              model: "claude-3",
              apiKey: "sk-ant",
            },
          ],
        })
      ).rejects.toThrow("Fallback failed");
    });
  });

  describe("embedText", () => {
    it("returns null for empty text", async () => {
      const result = await service.embedText("OPENAI", "sk-test", "   ");
      expect(result).toBeNull();
    });

    it("embeds text using OpenAI embeddings", async () => {
      mockEmbedQuery.mockResolvedValueOnce([0.1, 0.2, 0.3]);
      const result = await service.embedText("OPENAI", "sk-test", "hello");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("returns null for Anthropic", async () => {
      const result = await service.embedText("ANTHROPIC", "sk-ant", "hello");
      expect(result).toBeNull();
    });
  });
});
