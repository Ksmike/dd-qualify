import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";

const DOCS_DIR = path.join(process.cwd(), "docs");

export type DocEntry = {
  relativePath: string;
  sourcePath: string;
  routeSegments: string[];
  href: string;
  title: string;
  summary: string;
  content: string;
};

function toPosixPath(input: string): string {
  return input.split(path.sep).join("/");
}

function slugifySegment(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function titleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.md$/i, "");
  const spaced = withoutExt
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      /^[A-Z0-9]+$/.test(part) ? part : part[0].toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function extractTitle(content: string, fallbackFilename: string): string {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || titleFromFilename(fallbackFilename);
}

function extractSummary(content: string): string {
  const lines = content.split(/\r?\n/);
  const collected: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (collected.length > 0) break;
      continue;
    }
    if (
      line.startsWith("#") ||
      line.startsWith("```") ||
      line.startsWith("- ") ||
      line.startsWith("* ") ||
      /^\d+\.\s/.test(line) ||
      line === "---"
    ) {
      if (collected.length > 0) break;
      continue;
    }

    collected.push(line);
  }

  return collected.join(" ").trim();
}

async function walkMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkMarkdownFiles(absolutePath);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        return [absolutePath];
      }
      return [];
    })
  );

  return files.flat().sort((a, b) => a.localeCompare(b));
}

export const getAllDocs = cache(async (): Promise<DocEntry[]> => {
  const markdownFiles = await walkMarkdownFiles(DOCS_DIR);

  return Promise.all(
    markdownFiles.map(async (sourcePath) => {
      const content = await fs.readFile(sourcePath, "utf8");
      const relativePath = toPosixPath(path.relative(DOCS_DIR, sourcePath));
      const routeSegments = relativePath
        .replace(/\.md$/i, "")
        .split("/")
        .map(slugifySegment)
        .filter(Boolean);

      return {
        relativePath,
        sourcePath,
        routeSegments,
        href: `/docs/${routeSegments.join("/")}`,
        title: extractTitle(content, path.basename(sourcePath)),
        summary: extractSummary(content),
        content,
      };
    })
  );
});

export const getDocBySlug = cache(
  async (slugSegments: string[]): Promise<DocEntry | null> => {
    const docs = await getAllDocs();
    return (
      docs.find(
        (doc) =>
          doc.routeSegments.length === slugSegments.length &&
          doc.routeSegments.every((segment, index) => segment === slugSegments[index])
      ) ?? null
    );
  }
);
