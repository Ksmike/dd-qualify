import {
  ApiKeyProvider,
  type DiligenceStageName,
} from "@/lib/generated/prisma/client";
import {
  ModelProviderRegistry,
  type UsageMetadata,
} from "@/lib/diligence/model-provider";
import { StructuredOutputParserService } from "@/lib/diligence/structured-output-parser";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";

type OutputFieldSchema = Record<string, string>;

export type DiligencePromptInput = {
  stage: DiligenceStageName;
  systemInstruction: string;
  userPrompt: string;
  fields: OutputFieldSchema;
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

export type DiligencePromptOutput<T extends Record<string, unknown>> = {
  provider: ApiKeyProvider;
  model: string;
  parsed: T;
  usage: UsageMetadata | null;
  rawText: string;
};

export class DiligenceLLMService {
  private readonly providers = new ModelProviderRegistry();
  private readonly parser = new StructuredOutputParserService();

  async invokeStructured<T extends Record<string, unknown>>(
    input: DiligencePromptInput
  ): Promise<DiligencePromptOutput<T>> {
    const candidateConfigs = [input.primary, ...input.fallbacks];
    const formatInstructions = this.parser.createFormatInstructions(input.fields);

    const prompt = [
      input.systemInstruction.trim(),
      "",
      `Stage: ${input.stage}`,
      input.userPrompt.trim(),
      "",
      formatInstructions,
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
        const parsed = await this.parser.parse<T>(message.content, input.fields);
        const rawText = this.parser.contentToString(message.content);

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
