import { db } from "@/lib/db";
import { chunkDocument, type ChunkRecord } from "@/lib/diligence/chunker";
import {
  type StageContext,
  type StageExecutionResult,
} from "@/lib/diligence/stage-helpers";
import {
  DiligenceArtifactType,
  DiligenceStageName,
} from "@/lib/generated/prisma/client";

export async function runEvidenceIndexing(
  ctx: StageContext
): Promise<StageExecutionResult> {
  const extractionArtifacts = await db.diligenceArtifact.findMany({
    where: {
      jobId: ctx.jobId,
      type: DiligenceArtifactType.EXTRACTED_TEXT,
      stage: DiligenceStageName.DOCUMENT_EXTRACTION,
    },
    orderBy: { createdAt: "asc" },
    select: { metadata: true },
  });

  const records: ChunkRecord[] = [];
  for (const artifact of extractionArtifacts) {
    const metadata = artifact.metadata as
      | {
          pathname?: string;
          filename?: string;
          pages?: Array<{ page: number | null; text: string }>;
        }
      | null;
    if (!metadata?.pathname || !metadata.filename || !metadata.pages) {
      continue;
    }
    const chunks = chunkDocument({
      documentPathname: metadata.pathname,
      documentFilename: metadata.filename,
      pages: metadata.pages,
    });
    records.push(...chunks);
  }

  // Idempotent: upsert each chunk on (jobId, documentPathname, chunkIndex)
  // so a partial-progress re-run resumes without losing already-indexed
  // chunks. After upserting, prune any chunks left over from a previous
  // longer extraction (e.g., a doc that no longer exists).
  const seenKeys = new Set<string>();
  for (const record of records) {
    const key = `${record.documentPathname}::${record.chunkIndex}`;
    seenKeys.add(key);
    await db.diligenceChunk.upsert({
      where: {
        jobId_documentPathname_chunkIndex: {
          jobId: ctx.jobId,
          documentPathname: record.documentPathname,
          chunkIndex: record.chunkIndex,
        },
      },
      create: {
        projectId: ctx.projectId,
        jobId: ctx.jobId,
        userId: ctx.userId,
        documentPathname: record.documentPathname,
        documentFilename: record.documentFilename,
        page: record.page,
        chunkIndex: record.chunkIndex,
        text: record.text,
        hash: record.hash,
        tokenEstimate: record.tokenEstimate,
      },
      update: {
        documentFilename: record.documentFilename,
        page: record.page,
        text: record.text,
        hash: record.hash,
        tokenEstimate: record.tokenEstimate,
      },
    });
  }

  const existing = await db.diligenceChunk.findMany({
    where: { jobId: ctx.jobId },
    select: { id: true, documentPathname: true, chunkIndex: true },
  });
  const staleIds = existing
    .filter(
      (chunk) => !seenKeys.has(`${chunk.documentPathname}::${chunk.chunkIndex}`)
    )
    .map((chunk) => chunk.id);
  if (staleIds.length > 0) {
    await db.diligenceChunk.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  const totalTokens = records.reduce(
    (sum, record) => sum + record.tokenEstimate,
    0
  );
  const distinctDocuments = new Set(records.map((r) => r.documentPathname));

  return {
    outputJson: {
      items: [],
      summary: `Indexed ${records.length} chunks across ${distinctDocuments.size} documents (~${totalTokens} tokens).`,
      chunkCount: records.length,
      documentCount: distinctDocuments.size,
      approxTokens: totalTokens,
    },
  };
}
