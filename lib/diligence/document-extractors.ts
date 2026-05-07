import * as XLSX from "xlsx";
import JSZip from "jszip";

export type ExtractedPage = {
  page: number | null;
  text: string;
};

export type DocumentExtractionResult = {
  pages: ExtractedPage[];
  extractionMode:
    | "plain_text"
    | "csv"
    | "pdf"
    | "docx"
    | "pptx"
    | "xlsx"
    | "metadata_only";
  warnings: string[];
};

const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
const PPTX_EXTENSIONS = new Set([".pptx", ".ppt"]);
const XLSX_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);
const PLAIN_TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown", ".rtf"]);

export function getLowercaseExtension(pathname: string): string {
  const lastDotIndex = pathname.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === pathname.length - 1) {
    return "";
  }
  return pathname.slice(lastDotIndex).toLowerCase();
}

export async function extractDocument(input: {
  filename: string;
  bytes: Uint8Array;
}): Promise<DocumentExtractionResult> {
  const ext = getLowercaseExtension(input.filename);

  if (PLAIN_TEXT_EXTENSIONS.has(ext)) {
    return extractPlainText(input.bytes);
  }
  if (PDF_EXTENSIONS.has(ext)) {
    return extractPdf(input.bytes);
  }
  if (DOCX_EXTENSIONS.has(ext)) {
    return extractDocx(input.bytes);
  }
  if (PPTX_EXTENSIONS.has(ext)) {
    return extractPptx(input.bytes);
  }
  if (XLSX_EXTENSIONS.has(ext)) {
    return extractSpreadsheet(input.bytes, ext === ".csv");
  }

  return {
    pages: [
      {
        page: null,
        text: `Document: ${input.filename}\nNote: Unsupported format for text extraction (${ext || "no extension"}). Diligence will treat this document as metadata-only.`,
      },
    ],
    extractionMode: "metadata_only",
    warnings: [`Unsupported extension: ${ext || "(none)"}`],
  };
}

function extractPlainText(bytes: Uint8Array): DocumentExtractionResult {
  const text = new TextDecoder("utf-8").decode(bytes);
  return {
    pages: [{ page: null, text }],
    extractionMode: "plain_text",
    warnings: [],
  };
}

async function extractPdf(bytes: Uint8Array): Promise<DocumentExtractionResult> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const proxy = await getDocumentProxy(bytes);
  const result = await extractText(proxy, { mergePages: false });

  const rawPages = Array.isArray(result.text) ? result.text : [result.text];
  const pages: ExtractedPage[] = rawPages.map((text, index) => ({
    page: index + 1,
    text: typeof text === "string" ? text : String(text ?? ""),
  }));

  const warnings: string[] = [];
  if (pages.every((p) => p.text.trim().length === 0)) {
    warnings.push(
      "PDF appears to contain no extractable text — likely a scanned image. OCR is not yet enabled."
    );
  }

  return { pages, extractionMode: "pdf", warnings };
}

async function extractDocx(bytes: Uint8Array): Promise<DocumentExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });

  return {
    pages: [{ page: null, text: result.value }],
    extractionMode: "docx",
    warnings: result.messages
      .filter((message) => message.type === "warning" || message.type === "error")
      .map((message) => message.message),
  };
}

function extractSpreadsheet(
  bytes: Uint8Array,
  isCsv: boolean
): DocumentExtractionResult {
  const workbook = XLSX.read(bytes, { type: "array" });
  const pages: ExtractedPage[] = workbook.SheetNames.map((sheetName, index) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { page: index + 1, text: "" };
    }
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return {
      page: index + 1,
      text: `Sheet: ${sheetName}\n${csv}`,
    };
  });

  return {
    pages,
    extractionMode: isCsv ? "csv" : "xlsx",
    warnings: [],
  };
}

async function extractPptx(bytes: Uint8Array): Promise<DocumentExtractionResult> {
  const zip = await JSZip.loadAsync(bytes);

  // PPTX slides are stored as ppt/slides/slide1.xml, slide2.xml, etc.
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slide(\d+)/i)?.[1] ?? "0", 10);
      return numA - numB;
    });

  const warnings: string[] = [];

  if (slideEntries.length === 0) {
    warnings.push(
      "No slide XML files found in the PPTX archive. The file may be corrupted or in an unsupported format."
    );
    return {
      pages: [{ page: null, text: "" }],
      extractionMode: "pptx",
      warnings,
    };
  }

  const pages: ExtractedPage[] = [];

  for (let i = 0; i < slideEntries.length; i++) {
    const entry = slideEntries[i];
    const xml = await zip.files[entry].async("text");
    const text = extractTextFromSlideXml(xml);
    pages.push({ page: i + 1, text });
  }

  if (pages.every((p) => p.text.trim().length === 0)) {
    warnings.push(
      "PPTX slides contain no extractable text — they may consist only of images or shapes."
    );
  }

  return { pages, extractionMode: "pptx", warnings };
}

/**
 * Extracts all text content from a PPTX slide XML string.
 * Text in OOXML slides lives inside <a:t> elements.
 * Paragraphs are delimited by <a:p> elements.
 */
function extractTextFromSlideXml(xml: string): string {
  const paragraphs: string[] = [];

  // Split by paragraph boundaries (<a:p> elements)
  const pParts = xml.split(/<a:p[\s>]/);

  for (const part of pParts) {
    // Extract all <a:t>...</a:t> text runs within this paragraph
    const textRuns: string[] = [];
    const tagRegex = /<a:t>([\s\S]*?)<\/a:t>/g;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(part)) !== null) {
      const decoded = decodeXmlEntities(match[1]);
      if (decoded) {
        textRuns.push(decoded);
      }
    }
    if (textRuns.length > 0) {
      paragraphs.push(textRuns.join(""));
    }
  }

  return paragraphs.join("\n");
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}
