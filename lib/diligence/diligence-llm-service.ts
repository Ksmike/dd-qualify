import {
  ApiKeyProvider,
  type DiligenceStageName,
} from "@/lib/generated/prisma/client";
import {
  ModelProviderRegistry,
  type UsageMetadata,
} from "@/lib/diligence/model-provider";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";

export type DiligencePromptInput = {
  stage: DiligenceStageName;
  systemInstruction: string;
  userPrompt: string;
  outputSchema: string;
  primary: {
    provider: ApiKeyProvider;
    model: string;
    apiKey: string;
  };
  fallbacks: Array<{
    provider: ApiKeyProvider;
    model: string;
    apiKey: string;
  }>;
};

export type DiligencePromptOutput<T> = {
  provider: ApiKeyProvider;
  model: string;
  parsed: T;
  usage: UsageMetadata | null;
  rawText: string;
};

export class DiligenceLLMService {
  private readonly providers = new ModelProviderRegistry();

  async invokeStructured<T>(
    input: DiligencePromptInput
  ): Promise<DiligencePromptOutput<T>> {
    const candidateConfigs = [input.primary, ...input.fallbacks];

    const prompt = [
      input.systemInstruction.trim(),
      "",
      `Stage: ${input.stage}`,
      "",
      input.userPrompt.trim(),
      "",
      "Return a single JSON object — no surrounding prose, no markdown fences. The object must conform to:",
      input.outputSchema.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    let lastError: unknown = null;

    for (const candidate of candidateConfigs) {
      try {
        const modelProvider = this.providers.getProvider(candidate.provider);
        const model = modelProvider.createChatModel({
          provider: candidate.provider,
          model: candidate.model,
          apiKey: candidate.apiKey,
          temperature: 0,
          maxRetries: 2,
        });
        const message = await model.invoke(prompt);
        const rawText = contentToString(message.content);
        const parsed = parseJsonObject<T>(rawText);

        return {
          provider: candidate.provider,
          model: candidate.model,
          parsed,
          usage: message.usage_metadata ?? null,
          rawText,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("No providers were able to produce a structured response.");
  }

  async embedText(
    provider: ApiKeyProvider,
    apiKey: string,
    text: string
  ): Promise<number[] | null> {
    if (!text.trim()) {
      return null;
    }

    if (provider === ApiKeyProvider.OPENAI) {
      const embeddings = new OpenAIEmbeddings({
        apiKey,
        model: "text-embedding-3-small",
      });
      return embeddings.embedQuery(text);
    }

    if (provider === ApiKeyProvider.GOOGLE) {
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey,
        model: "gemini-embedding-001",
      });
      return embeddings.embedQuery(text);
    }

    return null;
  }
}

function contentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const texts = content
      .map((value) => {
        if (typeof value === "string") {
          return value;
        }
        if (
          typeof value === "object" &&
          value !== null &&
          "text" in value &&
          typeof (value as { text?: unknown }).text === "string"
        ) {
          return (value as { text: string }).text;
        }
        return "";
      })
      .filter(Boolean);
    return texts.join("\n");
  }
  return String(content ?? "");
}

function parseJsonObject<T>(rawText: string): T {
  const cleaned = stripFences(rawText).trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const candidate =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  return JSON.parse(candidate) as T;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && typeof fenced[1] === "string") {
    return fenced[1];
  }
  return text;
}
