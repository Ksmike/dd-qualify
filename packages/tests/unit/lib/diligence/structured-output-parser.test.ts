import { describe, it, expect, vi } from "vitest";

vi.mock("@langchain/core/output_parsers", () => {
  const mockParser = {
    getFormatInstructions: vi.fn().mockReturnValue("Format: JSON with keys"),
    parse: vi.fn().mockResolvedValue({ summary: "test", items: "[]" }),
  };
  return {
    StructuredOutputParser: {
      fromNamesAndDescriptions: vi.fn().mockReturnValue(mockParser),
    },
  };
});

const { StructuredOutputParserService } = await import(
  "@/lib/diligence/structured-output-parser"
);

describe("StructuredOutputParserService", () => {
  const service = new StructuredOutputParserService();

  describe("contentToString", () => {
    it("returns the string directly when content is a string", () => {
      expect(service.contentToString("hello world")).toBe("hello world");
    });

    it("joins array of strings with newlines", () => {
      expect(service.contentToString(["line1", "line2"])).toBe("line1\nline2");
    });

    it("extracts text from array of objects with text property", () => {
      const content = [
        { text: "first" },
        { text: "second" },
      ];
      expect(service.contentToString(content)).toBe("first\nsecond");
    });

    it("handles mixed arrays of strings and text objects", () => {
      const content = ["plain", { text: "object" }, "another"];
      expect(service.contentToString(content)).toBe("plain\nobject\nanother");
    });

    it("filters out non-string, non-text-object items from arrays", () => {
      const content = ["valid", { notText: "ignored" }, 42, null];
      expect(service.contentToString(content)).toBe("valid");
    });

    it("returns empty string for null/undefined", () => {
      expect(service.contentToString(null)).toBe("");
      expect(service.contentToString(undefined)).toBe("");
    });

    it("converts numbers to string", () => {
      expect(service.contentToString(123)).toBe("123");
    });

    it("returns empty string for empty array", () => {
      expect(service.contentToString([])).toBe("");
    });
  });

  describe("createFormatInstructions", () => {
    it("returns format instructions from the parser", () => {
      const fields = { summary: "A summary", items: "A list of items" };
      const result = service.createFormatInstructions(fields);
      expect(result).toBe("Format: JSON with keys");
    });
  });

  describe("parse", () => {
    it("parses string content using the structured parser", async () => {
      const fields = { summary: "A summary", itemsJson: "JSON array" };
      const result = await service.parse("some LLM output", fields);
      expect(result).toEqual({ summary: "test", items: "[]" });
    });

    it("parses array content by converting to string first", async () => {
      const fields = { summary: "A summary" };
      const content = [{ text: "parsed content" }];
      const result = await service.parse(content, fields);
      expect(result).toEqual({ summary: "test", items: "[]" });
    });
  });
});
