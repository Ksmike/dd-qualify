import { createHash } from "crypto";
import type { ExtractedPage } from "@/lib/diligence/document-extractors";

export type ChunkInput = {
  documentPathname: string;
  documentFilename: string;
  pages: ExtractedPage[];
};

export type ChunkRecord = {
  documentPathname: string;
  documentFilename: string;
  page: number | null;
  chunkIndex: number;
  text: string;
  hash: string;
  tokenEstimate: number;
};

const TARGET_CHUNK_CHARS = 1800; // ~450 tokens at 4 chars/tok — leaves headroom for many docs
const MIN_PARAGRAPH_CHARS = 60;
const PARAGRAPH_SPLIT_RE = /\n\s*\n+/;

export function chunkDocument(input: ChunkInput): ChunkRecord[] {
  const records: ChunkRecord[] = [];
  let chunkIndex = 0;

  for (const page of input.pages) {
    const trimmed = page.text.trim();
    if (!trimmed) {
      continue;
    }

    const paragraphs = trimmed
      .split(PARAGRAPH_SPLIT_RE)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_CHARS);

    if (paragraphs.length === 0) {
      records.push(
        toRecord({
          documentPathname: input.documentPathname,
          documentFilename: input.documentFilename,
          page: page.page,
          chunkIndex: chunkIndex++,
          text: trimmed,
        })
      );
      continue;
    }

    let buffer = "";
    for (const paragraph of paragraphs) {
      const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      if (candidate.length <= TARGET_CHUNK_CHARS) {
        buffer = candidate;
        continue;
      }

      if (buffer) {
        records.push(
          toRecord({
            documentPathname: input.documentPathname,
            documentFilename: input.documentFilename,
            page: page.page,
            chunkIndex: chunkIndex++,
            text: buffer,
          })
        );
      }

      if (paragraph.length <= TARGET_CHUNK_CHARS) {
        buffer = paragraph;
      } else {
        for (const slice of splitBySize(paragraph, TARGET_CHUNK_CHARS)) {
          records.push(
            toRecord({
              documentPathname: input.documentPathname,
              documentFilename: input.documentFilename,
              page: page.page,
              chunkIndex: chunkIndex++,
              text: slice,
            })
          );
        }
        buffer = "";
      }
    }

    if (buffer) {
      records.push(
        toRecord({
          documentPathname: input.documentPathname,
          documentFilename: input.documentFilename,
          page: page.page,
          chunkIndex: chunkIndex++,
          text: buffer,
        })
      );
    }
  }

  return records;
}

function splitBySize(text: string, size: number): string[] {
  const slices: string[] = [];
  for (let cursor = 0; cursor < text.length; cursor += size) {
    slices.push(text.slice(cursor, cursor + size));
  }
  return slices;
}

function toRecord(input: {
  documentPathname: string;
  documentFilename: string;
  page: number | null;
  chunkIndex: number;
  text: string;
}): ChunkRecord {
  const text = input.text.trim();
  return {
    documentPathname: input.documentPathname,
    documentFilename: input.documentFilename,
    page: input.page,
    chunkIndex: input.chunkIndex,
    text,
    hash: createHash("sha1").update(text).digest("hex"),
    tokenEstimate: estimateTokens(text),
  };
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
