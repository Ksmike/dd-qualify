import * as XLSX from "xlsx";

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
    | "xlsx"
    | "metadata_only";
  warnings: string[];
};

const PDF_EXTENSIONS = new Set([".pdf"]);
const DOCX_EXTENSIONS = new Set([".docx"]);
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
