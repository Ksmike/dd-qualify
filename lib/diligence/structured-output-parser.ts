import { StructuredOutputParser } from "@langchain/core/output_parsers";

type OutputFieldSchema = Record<string, string>;

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

export class StructuredOutputParserService {
  createFormatInstructions(fields: OutputFieldSchema): string {
    const parser = StructuredOutputParser.fromNamesAndDescriptions(fields);
    return parser.getFormatInstructions();
  }

  async parse<T extends Record<string, unknown>>(
    content: unknown,
    fields: OutputFieldSchema
  ): Promise<T> {
    const parser = StructuredOutputParser.fromNamesAndDescriptions(fields);
    const text = contentToString(content);
    return (await parser.parse(text)) as T;
  }

  contentToString(content: unknown): string {
    return contentToString(content);
  }
}
