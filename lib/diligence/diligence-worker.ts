import { get, list } from "@vercel/blob";
import { db } from "@/lib/db";
import { buildProjectBlobPrefix } from "@/lib/blob/documents";
import { DiligenceLLMService } from "@/lib/diligence/diligence-llm-service";
import { getStageProgressPercent, getNextStage, STAGE_TO_QUESTION } from "@/lib/diligence/stages";
import { getStagePromptPlan } from "@/lib/diligence/prompts";
import {
  extractDocument,
  getLowercaseExtension,
} from "@/lib/diligence/document-extractors";
import { chunkDocument, type ChunkRecord } from "@/lib/diligence/chunker";
import {
  corroborateClaims,
  type RawClaim,
  type ChunkSourceMap,
} from "@/lib/diligence/corroboration";
import { UserApiKeyModel } from "@/lib/models/UserApiKeyModel";
import {
  ApiKeyProvider,
  DiligenceArtifactType,
  type DiligenceCoreQuestion,
  DiligenceJobStatus,
  DiligenceStageName,
  DiligenceStageStatus,
  DiligenceStorageProvider,
  type Prisma,
  ProjectDocumentProcessingStatus,
} from "@/lib/generated/prisma/client";

const MAX_CHUNK_PROMPT_CHARS = 60_000; // ~15k tokens — conservative budget for question stages

type StageExecutionResult = {
  outputJson: Record<string, unknown>;
  provider?: ApiKeyProvider;
  model?: string;
  tokenUsageTotal?: number;
  estimatedCostUsd?: number;
};

type StageContext = {
  stage: DiligenceStageName;
  jobId: string;
  projectId: string;
  userId: string;
  selectedProvider: ApiKeyProvider;
  selectedModel: string;
  fallbackProviders: ApiKeyProvider[];
  userApiKeyId: string | null;
};

type LlmCredentials = {
  primary: { provider: ApiKeyProvider; model: string; apiKey: string };
  fallbacks: Array<{ provider: ApiKeyProvider; model: string; apiKey: string }>;
};

function toNonNegativeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function estimateCostUsd(
  provider: ApiKeyProvider,
  usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number }
): number {
  const inputTokens = toNonNegativeNumber(usage.input_tokens);
  const outputTokens = toNonNegativeNumber(usage.output_tokens);
  const totalTokens = toNonNegativeNumber(usage.total_tokens);

  if (provider === ApiKeyProvider.OPENAI) {
    return inputTokens * 0.00000015 + outputTokens * 0.0000006;
  }
  if (provider === ApiKeyProvider.ANTHROPIC) {
    return inputTokens * 0.0000003 + outputTokens * 0.0000015;
  }
  if (provider === ApiKeyProvider.GOOGLE) {
    return totalTokens * 0.0000002;
  }
  return 0;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asStringArray(value: unknown): string[] {
  return asArray<unknown>(value).filter(
    (entry): entry is string => typeof entry === "string"
  );
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export class DiligenceWorker {
  private readonly llmService = new DiligenceLLMService();

  async runNextStage(input: {
    jobId: string;
    userId: string;
  }): Promise<{
    status: "completed" | "progressed" | "waiting_input";
    stage?: DiligenceStageName;
  }> {
    const job = await db.diligenceJob.findFirst({
      where: { id: input.jobId, userId: input.userId },
      select: {
        id: true,
        userId: true,
        projectId: true,
        status: true,
        currentStage: true,
        selectedProvider: true,
        selectedModel: true,
        fallbackProviders: true,
        userApiKeyId: true,
        tokenUsageTotal: true,
        estimatedCostUsd: true,
      },
    });

    if (!job) {
      throw new Error("Diligence job not found.");
    }
    if (
      job.status === DiligenceJobStatus.COMPLETED ||
      job.status === DiligenceJobStatus.CANCELED
    ) {
      return { status: "completed" };
    }

    const nextStage = getNextStage(job.currentStage);
    if (!nextStage) {
      await this.markJobCompleted(job.id, job.projectId, job.userId);
      return { status: "completed" };
    }

    await db.diligenceJob.update({
      where: { id: job.id },
      data: {
        status: DiligenceJobStatus.RUNNING,
        startedAt: new Date(),
        lastHeartbeatAt: new Date(),
        attemptCount: { increment: 1 },
        errorMessage: null,
      },
    });

    await db.diligenceStageRun.upsert({
      where: { jobId_stage: { jobId: job.id, stage: nextStage } },
      create: {
        jobId: job.id,
        stage: nextStage,
        status: DiligenceStageStatus.RUNNING,
        attempts: 1,
        startedAt: new Date(),
      },
      update: {
        status: DiligenceStageStatus.RUNNING,
        attempts: { increment: 1 },
        startedAt: new Date(),
        completedAt: null,
        errorMessage: null,
      },
    });

    try {
      const context: StageContext = {
        stage: nextStage,
        jobId: job.id,
        projectId: job.projectId,
        userId: job.userId,
        selectedProvider: job.selectedProvider,
        selectedModel: job.selectedModel,
        fallbackProviders: Array.isArray(job.fallbackProviders)
          ? (job.fallbackProviders.filter(
              (value) => typeof value === "string"
            ) as ApiKeyProvider[])
          : [],
        userApiKeyId: job.userApiKeyId,
      };

      const stageResult = await this.executeStage(context);

      const tokenUsageTotal = toNonNegativeNumber(stageResult.tokenUsageTotal);
      const estimatedCostUsd = toNonNegativeNumber(stageResult.estimatedCostUsd);

      await db.diligenceStageRun.update({
        where: { jobId_stage: { jobId: job.id, stage: nextStage } },
        data: {
          status: DiligenceStageStatus.COMPLETED,
          provider: stageResult.provider ?? null,
          model: stageResult.model ?? null,
          tokenUsageTotal,
          estimatedCostUsd,
          outputJson: toInputJson(stageResult.outputJson),
          completedAt: new Date(),
          outputArtifactCount: Array.isArray(stageResult.outputJson.items)
            ? (stageResult.outputJson.items as unknown[]).length
            : 0,
        },
      });

      const nextProgress = getStageProgressPercent(nextStage);
      const isCompleted = nextProgress >= 100;

      await db.diligenceJob.update({
        where: { id: job.id },
        data: {
          currentStage: nextStage,
          progressPercent: nextProgress,
          tokenUsageTotal: { increment: tokenUsageTotal },
          estimatedCostUsd:
            toNonNegativeNumber(job.estimatedCostUsd) + estimatedCostUsd,
          status: isCompleted
            ? DiligenceJobStatus.COMPLETED
            : DiligenceJobStatus.RUNNING,
          completedAt: isCompleted ? new Date() : null,
          lastHeartbeatAt: new Date(),
        },
      });

      if (isCompleted) {
        await db.project.updateMany({
          where: { id: job.projectId, userId: job.userId },
          data: { status: "reviewed" },
        });
        return { status: "completed", stage: nextStage };
      }

      return { status: "progressed", stage: nextStage };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stage execution failed.";
      await db.diligenceStageRun.update({
        where: { jobId_stage: { jobId: job.id, stage: nextStage } },
        data: {
          status: DiligenceStageStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      await db.diligenceJob.update({
        where: { id: job.id },
        data: {
          status: DiligenceJobStatus.FAILED,
          errorMessage: message,
          lastHeartbeatAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async markJobCompleted(jobId: string, projectId: string, userId: string) {
    await db.diligenceJob.update({
      where: { id: jobId },
      data: {
        status: DiligenceJobStatus.COMPLETED,
        completedAt: new Date(),
        progressPercent: 100,
      },
    });
    await db.project.updateMany({
      where: { id: projectId, userId },
      data: { status: "reviewed" },
    });
  }

  // ───────────────────────── stage routing ─────────────────────────

  private async executeStage(ctx: StageContext): Promise<StageExecutionResult> {
    switch (ctx.stage) {
      case DiligenceStageName.DOCUMENT_EXTRACTION:
        return this.runDocumentExtraction(ctx);
      case DiligenceStageName.EVIDENCE_INDEXING:
        return this.runEvidenceIndexing(ctx);
      case DiligenceStageName.CORROBORATION:
        return this.runCorroboration(ctx);
      default:
        return this.runLlmStage(ctx);
    }
  }

  // ───────────────────────── DOCUMENT_EXTRACTION ─────────────────────────

  private async runDocumentExtraction(
    ctx: StageContext
  ): Promise<StageExecutionResult> {
    const prefix = buildProjectBlobPrefix(ctx.userId, ctx.projectId);
    if (!prefix) {
      throw new Error("Invalid project storage prefix.");
    }

    const { blobs } = await list({ prefix });
    if (blobs.length === 0) {
      await db.diligenceJob.update({
        where: { id: ctx.jobId },
        data: {
          status: DiligenceJobStatus.WAITING_INPUT,
          errorMessage: "No documents uploaded yet.",
        },
      });
      return {
        outputJson: { items: [], summary: "No source documents available." },
      };
    }

    await db.projectDocument.updateMany({
      where: { projectId: ctx.projectId, userId: ctx.userId },
      data: {
        processingStatus: ProjectDocumentProcessingStatus.PROCESSING,
        processingError: null,
      },
    });

    const extractedItems: Array<{
      pathname: string;
      filename: string;
      sizeBytes: number;
      pages: Array<{ page: number | null; text: string }>;
      extractionMode: string;
      processingStatus: ProjectDocumentProcessingStatus;
      processingError: string | null;
      warnings: string[];
    }> = [];

    for (const blob of blobs) {
      const filename = blob.pathname.startsWith(prefix)
        ? blob.pathname.slice(prefix.length)
        : blob.pathname;

      let pages: Array<{ page: number | null; text: string }> = [];
      let extractionMode = "metadata_only";
      let warnings: string[] = [];
      let processingStatus: ProjectDocumentProcessingStatus =
        ProjectDocumentProcessingStatus.PROCESSED;
      let processingError: string | null = null;

      try {
        const blobResult = await get(blob.pathname, { access: "private" });
        if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
          throw new Error("Document stream unavailable.");
        }
        const bytes = await streamToBytes(blobResult.stream);
        const result = await extractDocument({ filename, bytes });
        pages = result.pages;
        extractionMode = result.extractionMode;
        warnings = result.warnings;
        if (
          result.extractionMode === "metadata_only" ||
          pages.every((page) => page.text.trim().length === 0)
        ) {
          processingError =
            warnings[0] ?? "No extractable text found in this document.";
        }
      } catch (error) {
        processingStatus = ProjectDocumentProcessingStatus.FAILED;
        processingError =
          error instanceof Error ? error.message : "Extraction failed.";
      }

      await db.projectDocument.upsert({
        where: {
          projectId_pathname: {
            projectId: ctx.projectId,
            pathname: blob.pathname,
          },
        },
        create: {
          projectId: ctx.projectId,
          userId: ctx.userId,
          filename,
          pathname: blob.pathname,
          sizeBytes: blob.size,
          processingStatus,
          processingError,
          lastProcessedAt:
            processingStatus === ProjectDocumentProcessingStatus.PROCESSED
              ? new Date()
              : null,
        },
        update: {
          filename,
          sizeBytes: blob.size,
          processingStatus,
          processingError,
          lastProcessedAt:
            processingStatus === ProjectDocumentProcessingStatus.PROCESSED
              ? new Date()
              : null,
        },
      });

      extractedItems.push({
        pathname: blob.pathname,
        filename,
        sizeBytes: blob.size,
        pages,
        extractionMode,
        processingStatus,
        processingError,
        warnings,
      });
    }

    await db.diligenceArtifact.deleteMany({
      where: {
        jobId: ctx.jobId,
        stage: DiligenceStageName.DOCUMENT_EXTRACTION,
      },
    });

    await db.diligenceArtifact.createMany({
      data: extractedItems.map((item) => ({
        projectId: ctx.projectId,
        jobId: ctx.jobId,
        userId: ctx.userId,
        stage: DiligenceStageName.DOCUMENT_EXTRACTION,
        type: DiligenceArtifactType.EXTRACTED_TEXT,
        storageProvider: DiligenceStorageProvider.JSON_COLUMN,
        storageKey: `db:project-document:${ctx.projectId}:${item.pathname}`,
        mimeType: "text/plain",
        sizeBytes: item.pages.reduce((sum, page) => sum + page.text.length, 0),
        checksum: null,
        metadata: toInputJson({
          pathname: item.pathname,
          filename: item.filename,
          extractionMode: item.extractionMode,
          warnings: item.warnings,
          processingStatus: item.processingStatus,
          processingError: item.processingError,
          pages: item.pages,
        }),
      })),
    });

    const processedCount = extractedItems.filter(
      (item) =>
        item.processingStatus === ProjectDocumentProcessingStatus.PROCESSED
    ).length;

    return {
      outputJson: {
        items: extractedItems.map((item) => ({
          pathname: item.pathname,
          filename: item.filename,
          sizeBytes: item.sizeBytes,
          extractionMode: item.extractionMode,
          processingStatus: item.processingStatus,
          processingError: item.processingError,
          warnings: item.warnings,
          pageCount: item.pages.length,
        })),
        summary: `Extracted text from ${processedCount}/${extractedItems.length} source document(s).`,
      },
    };
  }

  // ───────────────────────── EVIDENCE_INDEXING ─────────────────────────

  private async runEvidenceIndexing(
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

    await db.diligenceChunk.deleteMany({ where: { jobId: ctx.jobId } });

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

    if (records.length > 0) {
      await db.diligenceChunk.createMany({
        data: records.map((record) => ({
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
        })),
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

  // ───────────────────────── CORROBORATION (deterministic) ─────────────────────────

  private async runCorroboration(
    ctx: StageContext
  ): Promise<StageExecutionResult> {
    const claims = await db.diligenceClaim.findMany({
      where: { jobId: ctx.jobId },
      select: {
        id: true,
        claimText: true,
        chunkRefs: true,
        evidenceRefs: true,
      },
    });

    const chunkMap = await this.loadChunkSourceMap(ctx.jobId);

    const rawClaims: RawClaim[] = claims.map((claim) => {
      const evidence = claim.evidenceRefs as Record<string, unknown> | null;
      return {
        claim: claim.claimText,
        category: asNullableString(evidence?.category) ?? undefined,
        quantitative: Boolean(evidence?.quantitative),
        value: evidence?.value as string | number | null | undefined,
        unit: asNullableString(evidence?.unit) ?? undefined,
        period: asNullableString(evidence?.period) ?? undefined,
        chunk_refs: asStringArray(claim.chunkRefs),
      };
    });

    const corroborated = corroborateClaims({
      claims: rawClaims,
      chunkToDocument: chunkMap,
    });

    let supportedCount = 0;
    let contradictedCount = 0;
    let inconclusiveCount = 0;

    for (let index = 0; index < corroborated.length; index += 1) {
      const claim = corroborated[index];
      const claimRow = claims[index];
      if (!claim || !claimRow) {
        continue;
      }
      if (claim.status === "SUPPORTED") supportedCount += 1;
      else if (claim.status === "CONTRADICTED") contradictedCount += 1;
      else inconclusiveCount += 1;

      await db.diligenceClaim.update({
        where: { id: claimRow.id },
        data: {
          status: claim.status,
          confidence: claim.confidence,
          sourceCount: claim.sourceCount,
          contradictions: claim.contradictedBy.length > 0
            ? toInputJson(claim.contradictedBy)
            : undefined,
        },
      });
    }

    return {
      outputJson: {
        items: corroborated.map((c) => ({
          claim: c.claim,
          status: c.status,
          confidence: c.confidence,
          sourceCount: c.sourceCount,
          contradictedBy: c.contradictedBy,
        })),
        summary: `Corroborated ${corroborated.length} claims — supported: ${supportedCount}, contradicted: ${contradictedCount}, inconclusive: ${inconclusiveCount}.`,
        supportedCount,
        contradictedCount,
        inconclusiveCount,
      },
    };
  }

  // ───────────────────────── LLM stages ─────────────────────────

  private async runLlmStage(ctx: StageContext): Promise<StageExecutionResult> {
    const credentials = await this.loadLlmCredentials(ctx);
    const plan = getStagePromptPlan(ctx.stage);

    const userPrompt = await this.buildStageUserPrompt(ctx, plan.needsFullChunks);

    const llmResult = await this.llmService.invokeStructured<
      Record<string, unknown>
    >({
      stage: ctx.stage,
      systemInstruction: plan.systemInstruction,
      userPrompt,
      outputSchema: plan.outputSchema,
      primary: credentials.primary,
      fallbacks: credentials.fallbacks,
    });

    const items = asArray<Record<string, unknown>>(llmResult.parsed.items);
    const summary = asString(llmResult.parsed.summary, "");
    const evidenceGaps = asArray<Record<string, unknown>>(
      llmResult.parsed.evidence_gaps
    );

    await this.persistStageOutputs({
      ctx,
      summary,
      items,
      structured: llmResult.parsed,
      evidenceGaps,
    });

    const usage = llmResult.usage ?? {};
    const usageTotal =
      toNonNegativeNumber(usage.total_tokens) ||
      toNonNegativeNumber(usage.input_tokens) +
        toNonNegativeNumber(usage.output_tokens);
    const estimatedCostUsd = estimateCostUsd(llmResult.provider, usage);

    return {
      outputJson: {
        summary,
        items,
        structured: llmResult.parsed,
        raw: llmResult.rawText,
      },
      provider: llmResult.provider,
      model: llmResult.model,
      tokenUsageTotal: usageTotal,
      estimatedCostUsd,
    };
  }

  private async buildStageUserPrompt(
    ctx: StageContext,
    includeFullChunks: boolean
  ): Promise<string> {
    const plan = getStagePromptPlan(ctx.stage);

    const sections: string[] = [plan.userInstruction];

    if (includeFullChunks) {
      const chunks = await this.loadChunksForPrompt(ctx);
      sections.push("", "### Source chunks", chunks);
    }

    const substrate = await this.loadSubstrateContext(ctx);
    if (substrate) {
      sections.push("", "### Prior diligence substrate", substrate);
    }

    return sections.join("\n");
  }

  private async loadChunksForPrompt(ctx: StageContext): Promise<string> {
    const chunks = await db.diligenceChunk.findMany({
      where: { jobId: ctx.jobId },
      orderBy: [{ documentPathname: "asc" }, { chunkIndex: "asc" }],
      select: {
        id: true,
        documentFilename: true,
        page: true,
        text: true,
      },
    });

    if (chunks.length === 0) {
      return "(no chunks available — document extraction may have produced no text)";
    }

    const lines: string[] = [];
    let cursor = 0;
    for (const chunk of chunks) {
      const header = `--- chunk_id=${chunk.id} doc="${chunk.documentFilename}" page=${chunk.page ?? "n/a"} ---`;
      const body = chunk.text;
      const blockSize = header.length + body.length + 2;
      if (cursor + blockSize > MAX_CHUNK_PROMPT_CHARS) {
        lines.push(
          `\n[truncated ${chunks.length - lines.length / 2} additional chunks to stay within prompt budget]`
        );
        break;
      }
      lines.push(header, body);
      cursor += blockSize;
    }
    return lines.join("\n");
  }

  private async loadSubstrateContext(ctx: StageContext): Promise<string | null> {
    const stagesNeedingSubstrate: DiligenceStageName[] = [
      DiligenceStageName.Q1_IDENTITY_AND_OWNERSHIP,
      DiligenceStageName.Q2_PRODUCT_AND_TECHNOLOGY,
      DiligenceStageName.Q3_MARKET_AND_TRACTION,
      DiligenceStageName.Q4_EXECUTION_CAPABILITY,
      DiligenceStageName.Q5_BUSINESS_MODEL_VIABILITY,
      DiligenceStageName.Q6_RISK_ANALYSIS,
      DiligenceStageName.Q8_FAILURE_MODES_AND_FRAGILITY,
      DiligenceStageName.OPEN_QUESTIONS,
      DiligenceStageName.EXECUTIVE_SUMMARY,
      DiligenceStageName.FINAL_REPORT,
    ];

    if (!stagesNeedingSubstrate.includes(ctx.stage)) {
      return null;
    }

    const [entities, claims, gaps, prevAnswers] = await Promise.all([
      db.diligenceEntity.findMany({
        where: { jobId: ctx.jobId },
        orderBy: { createdAt: "asc" },
        select: {
          name: true,
          kind: true,
          confidence: true,
          sourceCount: true,
          metadata: true,
        },
        take: 200,
      }),
      db.diligenceClaim.findMany({
        where: { jobId: ctx.jobId },
        orderBy: { createdAt: "asc" },
        select: {
          claimText: true,
          status: true,
          confidence: true,
          sourceCount: true,
          evidenceRefs: true,
        },
        take: 200,
      }),
      db.diligenceEvidenceGap.findMany({
        where: { jobId: ctx.jobId },
        select: { question: true, title: true, severity: true },
      }),
      db.diligenceQuestionAnswer.findMany({
        where: { jobId: ctx.jobId },
        select: { question: true, summary: true, confidence: true },
      }),
    ]);

    const blocks: string[] = [];

    if (entities.length > 0) {
      blocks.push(
        "Entities (curated, deduplicated):",
        ...entities.slice(0, 50).map(
          (entity) =>
            `- [${entity.kind}] ${entity.name}` +
            (entity.confidence != null ? ` (conf=${entity.confidence.toFixed(2)})` : "")
        )
      );
    }

    if (claims.length > 0) {
      blocks.push(
        "",
        "Claims (with corroboration status):",
        ...claims.slice(0, 80).map(
          (claim) =>
            `- [${claim.status}, sources=${claim.sourceCount}, conf=${claim.confidence?.toFixed(2) ?? "n/a"}] ${claim.claimText}`
        )
      );
    }

    if (gaps.length > 0) {
      blocks.push(
        "",
        "Already-identified evidence gaps:",
        ...gaps.map((gap) => `- [${gap.question}, ${gap.severity}] ${gap.title}`)
      );
    }

    if (prevAnswers.length > 0) {
      blocks.push(
        "",
        "Already-answered questions (summaries only):",
        ...prevAnswers.map(
          (answer) =>
            `- ${answer.question} (conf=${answer.confidence?.toFixed(2) ?? "n/a"}): ${answer.summary.slice(0, 240)}`
        )
      );
    }

    return blocks.length > 0 ? blocks.join("\n") : null;
  }

  // ───────────────────────── Persistence per stage ─────────────────────────

  private async persistStageOutputs(input: {
    ctx: StageContext;
    summary: string;
    items: Record<string, unknown>[];
    structured: Record<string, unknown>;
    evidenceGaps: Record<string, unknown>[];
  }): Promise<void> {
    const { ctx, summary, items, structured, evidenceGaps } = input;
    const chunkMap = await this.loadChunkSourceMap(ctx.jobId);

    if (ctx.stage === DiligenceStageName.ENTITY_EXTRACTION) {
      await db.diligenceEntity.deleteMany({ where: { jobId: ctx.jobId } });
      const dedupedEntities = mergeEntities(items, chunkMap);
      if (dedupedEntities.length > 0) {
        await db.diligenceEntity.createMany({
          data: dedupedEntities.map((entity) => ({
            projectId: ctx.projectId,
            jobId: ctx.jobId,
            userId: ctx.userId,
            name: entity.name,
            kind: entity.kind,
            confidence: entity.confidence,
            sourceCount: entity.sourceCount,
            chunkRefs: toInputJson(entity.chunkRefs),
            metadata: toInputJson(entity.metadata),
          })),
        });
      }
    } else if (ctx.stage === DiligenceStageName.CLAIM_EXTRACTION) {
      await db.diligenceClaim.deleteMany({ where: { jobId: ctx.jobId } });
      const claimRows = items.map((item) => buildClaimRow(item, chunkMap));
      if (claimRows.length > 0) {
        await db.diligenceClaim.createMany({
          data: claimRows.map((row) => ({
            projectId: ctx.projectId,
            jobId: ctx.jobId,
            userId: ctx.userId,
            claimText: row.claimText,
            status: undefined, // status is computed in CORROBORATION
            confidence: null,
            sourceCount: row.sourceCount,
            chunkRefs: toInputJson(row.chunkRefs),
            evidenceRefs: toInputJson(row.evidence),
          })),
        });
      }
    } else if (ctx.stage === DiligenceStageName.Q6_RISK_ANALYSIS) {
      await db.diligenceFinding.deleteMany({
        where: { jobId: ctx.jobId, type: "RISK" },
      });
      const risks = asArray<Record<string, unknown>>(structured.risks);
      const sourceItems = risks.length > 0 ? risks : items;
      if (sourceItems.length > 0) {
        await db.diligenceFinding.createMany({
          data: sourceItems.map((item) => buildFindingRow(item, chunkMap, ctx)),
        });
      }
      await this.persistQuestionAnswer(ctx, structured, chunkMap);
    } else if (ctx.stage === DiligenceStageName.Q8_FAILURE_MODES_AND_FRAGILITY) {
      await db.diligenceContradiction.deleteMany({
        where: { jobId: ctx.jobId },
      });
      const contradictions = asArray<Record<string, unknown>>(
        structured.contradictions
      );
      if (contradictions.length > 0) {
        await db.diligenceContradiction.createMany({
          data: contradictions.map((item) =>
            buildContradictionRow(item, chunkMap, ctx)
          ),
        });
      }
      await this.persistQuestionAnswer(ctx, structured, chunkMap);
    } else if (STAGE_TO_QUESTION[ctx.stage]) {
      await this.persistQuestionAnswer(ctx, structured, chunkMap);
    } else if (ctx.stage === DiligenceStageName.OPEN_QUESTIONS) {
      await db.diligenceOpenQuestion.deleteMany({ where: { jobId: ctx.jobId } });
      if (items.length > 0) {
        await db.diligenceOpenQuestion.createMany({
          data: items.map((item) => buildOpenQuestionRow(item, ctx)),
        });
      }
    } else if (
      ctx.stage === DiligenceStageName.EXECUTIVE_SUMMARY ||
      ctx.stage === DiligenceStageName.FINAL_REPORT
    ) {
      await db.diligenceArtifact.create({
        data: {
          projectId: ctx.projectId,
          jobId: ctx.jobId,
          userId: ctx.userId,
          stage: ctx.stage,
          type: DiligenceArtifactType.GENERATED_REPORT,
          storageProvider: DiligenceStorageProvider.JSON_COLUMN,
          storageKey: `db:diligence-report:${ctx.jobId}:${ctx.stage}`,
          mimeType: "application/json",
          sizeBytes: null,
          checksum: null,
          metadata: toInputJson({ summary, items, structured }),
        },
      });
    }

    // Evidence gaps are stage-agnostic — persist whenever the LLM returns them.
    if (evidenceGaps.length > 0) {
      const question =
        STAGE_TO_QUESTION[ctx.stage] ??
        (("Q7_EVIDENCE" as const) as DiligenceCoreQuestion);
      await db.diligenceEvidenceGap.deleteMany({
        where: { jobId: ctx.jobId, question },
      });
      await db.diligenceEvidenceGap.createMany({
        data: evidenceGaps.map((gap) => ({
          projectId: ctx.projectId,
          jobId: ctx.jobId,
          userId: ctx.userId,
          question,
          title: asString(gap.title, "Evidence gap"),
          description: asString(gap.description, ""),
          severity: normalizeSeverity(gap.severity),
          suggestedSource:
            asNullableString(gap.suggested_source ?? gap.suggestedSource) ??
            null,
        })),
      });
    }
  }

  private async persistQuestionAnswer(
    ctx: StageContext,
    structured: Record<string, unknown>,
    chunkMap: ChunkSourceMap
  ): Promise<void> {
    const question = STAGE_TO_QUESTION[ctx.stage];
    if (!question) {
      return;
    }
    const summary = asString(structured.summary, "");
    const confidence = asNumber(structured.confidence);
    const chunkRefs = collectChunkRefsFromStructured(structured);
    const distinctDocuments = new Set<string>();
    for (const chunkId of chunkRefs) {
      const document = chunkMap.get(chunkId);
      if (document) {
        distinctDocuments.add(document);
      }
    }

    await db.diligenceQuestionAnswer.upsert({
      where: { jobId_question: { jobId: ctx.jobId, question } },
      create: {
        projectId: ctx.projectId,
        jobId: ctx.jobId,
        userId: ctx.userId,
        question,
        summary,
        structured: toInputJson(structured),
        confidence,
        sourceCount: distinctDocuments.size,
        chunkRefs: toInputJson(chunkRefs),
      },
      update: {
        summary,
        structured: toInputJson(structured),
        confidence,
        sourceCount: distinctDocuments.size,
        chunkRefs: toInputJson(chunkRefs),
      },
    });
  }

  // ───────────────────────── Credential helpers ─────────────────────────

  private async loadLlmCredentials(ctx: StageContext): Promise<LlmCredentials> {
    if (!ctx.userApiKeyId) {
      throw new Error("Missing user API key reference for diligence job.");
    }
    const selectedKey = await UserApiKeyModel.findByIdForUser({
      userId: ctx.userId,
      userApiKeyId: ctx.userApiKeyId,
    });
    if (!selectedKey || !selectedKey.enabled) {
      throw new Error("Selected API key is missing or disabled.");
    }
    const primaryApiKey = UserApiKeyModel.decryptApiKey(selectedKey.encryptedKey);
    const fallbacks: LlmCredentials["fallbacks"] = [];
    for (const provider of ctx.fallbackProviders) {
      const key = await UserApiKeyModel.findForUser({
        userId: ctx.userId,
        provider,
      });
      if (!key || !key.enabled) {
        continue;
      }
      fallbacks.push({
        provider: key.provider,
        model: key.defaultModel ?? ctx.selectedModel,
        apiKey: UserApiKeyModel.decryptApiKey(key.encryptedKey),
      });
    }
    return {
      primary: {
        provider: ctx.selectedProvider,
        model: ctx.selectedModel,
        apiKey: primaryApiKey,
      },
      fallbacks,
    };
  }

  private async loadChunkSourceMap(jobId: string): Promise<ChunkSourceMap> {
    const chunks = await db.diligenceChunk.findMany({
      where: { jobId },
      select: { id: true, documentPathname: true },
    });
    const map: ChunkSourceMap = new Map();
    for (const chunk of chunks) {
      map.set(chunk.id, chunk.documentPathname);
    }
    return map;
  }
}

// ───────────────────────── Pure helpers ─────────────────────────

function mergeEntities(
  items: Record<string, unknown>[],
  chunkMap: ChunkSourceMap
): Array<{
  name: string;
  kind: string;
  confidence: number | null;
  sourceCount: number;
  chunkRefs: string[];
  metadata: Record<string, unknown>;
}> {
  const merged = new Map<
    string,
    {
      name: string;
      kind: string;
      confidence: number | null;
      chunkRefs: Set<string>;
      sourceDocs: Set<string>;
      metadata: Record<string, unknown>;
    }
  >();

  for (const item of items) {
    const name = asString(item.name);
    if (!name.trim()) {
      continue;
    }
    const kind = asString(item.kind ?? item.type, "unknown");
    const key = `${kind.toLowerCase()}::${name.trim().toLowerCase()}`;
    const chunkRefs = asStringArray(item.chunk_refs ?? item.chunkRefs);
    const docs = chunkRefs
      .map((id) => chunkMap.get(id))
      .filter((doc): doc is string => Boolean(doc));

    const existing = merged.get(key);
    if (existing) {
      for (const ref of chunkRefs) existing.chunkRefs.add(ref);
      for (const doc of docs) existing.sourceDocs.add(doc);
      const c = asNumber(item.confidence);
      if (c !== null && (existing.confidence === null || c > existing.confidence)) {
        existing.confidence = c;
      }
    } else {
      merged.set(key, {
        name: name.trim(),
        kind,
        confidence: asNumber(item.confidence),
        chunkRefs: new Set(chunkRefs),
        sourceDocs: new Set(docs),
        metadata: item,
      });
    }
  }

  return Array.from(merged.values()).map((entry) => ({
    name: entry.name,
    kind: entry.kind,
    confidence: entry.confidence,
    sourceCount: entry.sourceDocs.size,
    chunkRefs: Array.from(entry.chunkRefs),
    metadata: entry.metadata,
  }));
}

function buildClaimRow(
  item: Record<string, unknown>,
  chunkMap: ChunkSourceMap
): {
  claimText: string;
  chunkRefs: string[];
  sourceCount: number;
  evidence: Record<string, unknown>;
} {
  const chunkRefs = asStringArray(item.chunk_refs ?? item.chunkRefs);
  const distinctDocs = new Set<string>();
  for (const ref of chunkRefs) {
    const doc = chunkMap.get(ref);
    if (doc) distinctDocs.add(doc);
  }
  return {
    claimText:
      asString(item.claim) ||
      asString(item.claimText) ||
      asString(item.title) ||
      "Unnamed claim",
    chunkRefs,
    sourceCount: distinctDocs.size,
    evidence: {
      category: item.category ?? null,
      quantitative: Boolean(item.quantitative),
      value: item.value ?? null,
      unit: item.unit ?? null,
      period: item.period ?? null,
      source: item.source ?? null,
      raw: item,
    },
  };
}

function buildFindingRow(
  item: Record<string, unknown>,
  chunkMap: ChunkSourceMap,
  ctx: StageContext
): Prisma.DiligenceFindingCreateManyInput {
  const chunkRefs = asStringArray(item.chunk_refs ?? item.chunkRefs);
  const distinctDocs = new Set<string>();
  for (const ref of chunkRefs) {
    const doc = chunkMap.get(ref);
    if (doc) distinctDocs.add(doc);
  }
  return {
    projectId: ctx.projectId,
    jobId: ctx.jobId,
    userId: ctx.userId,
    type: "RISK",
    title: asString(item.title, asString(item.category, "Risk")),
    summary:
      asString(item.description) ||
      asString(item.summary) ||
      asString(item.details) ||
      "No description provided.",
    severity: normalizeSeverity(item.severity),
    confidence: asNumber(item.confidence),
    sourceCount: distinctDocs.size,
    chunkRefs: toInputJson(chunkRefs),
    evidenceRefs: toInputJson({
      category: item.category ?? null,
      evidence_strength: item.evidence_strength ?? null,
      mitigation_disclosed: item.mitigation_disclosed ?? null,
    }),
    metadata: toInputJson(item),
  };
}

function buildContradictionRow(
  item: Record<string, unknown>,
  chunkMap: ChunkSourceMap,
  ctx: StageContext
): Prisma.DiligenceContradictionCreateManyInput {
  const refsA = asStringArray(item.chunk_refs_a ?? item.chunkRefsA);
  const refsB = asStringArray(item.chunk_refs_b ?? item.chunkRefsB);
  const allRefs = [...refsA, ...refsB];
  return {
    projectId: ctx.projectId,
    jobId: ctx.jobId,
    userId: ctx.userId,
    statementA: asString(item.statement_a ?? item.statementA, "Unspecified statement A"),
    statementB: asString(item.statement_b ?? item.statementB, "Unspecified statement B"),
    severity: normalizeSeverity(item.severity),
    confidence: asNumber(item.confidence),
    chunkRefs: toInputJson(allRefs),
    evidenceRefs: toInputJson({
      explanation: item.explanation ?? null,
      sources_a: refsA.map((id) => chunkMap.get(id) ?? id),
      sources_b: refsB.map((id) => chunkMap.get(id) ?? id),
    }),
  };
}

function buildOpenQuestionRow(
  item: Record<string, unknown>,
  ctx: StageContext
): Prisma.DiligenceOpenQuestionCreateManyInput {
  const category = normalizeQuestionCategory(item.category);
  return {
    projectId: ctx.projectId,
    jobId: ctx.jobId,
    userId: ctx.userId,
    category,
    question: asString(item.question, "Unspecified question"),
    rationale: asString(item.rationale, ""),
    priority: normalizePriority(item.priority),
    resolvedBy:
      asNullableString(item.resolved_by) ?? asNullableString(item.resolvedBy),
    chunkRefs: toInputJson(asStringArray(item.chunk_refs ?? item.chunkRefs)),
  };
}

function collectChunkRefsFromStructured(
  structured: Record<string, unknown>
): string[] {
  const refs = new Set<string>();
  const overall = structured.chunk_refs_overall ?? structured.chunkRefsOverall;
  for (const ref of asStringArray(overall)) {
    refs.add(ref);
  }
  visitForChunkRefs(structured, refs);
  return Array.from(refs);
}

function visitForChunkRefs(value: unknown, sink: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) visitForChunkRefs(entry, sink);
    return;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const refs = record.chunk_refs ?? record.chunkRefs;
    for (const ref of asStringArray(refs)) sink.add(ref);
    for (const child of Object.values(record)) visitForChunkRefs(child, sink);
  }
}

function normalizeSeverity(value: unknown): string {
  const normalized = asString(value, "").toLowerCase();
  const accepted = new Set([
    "blocker",
    "critical",
    "high",
    "medium",
    "low",
    "info",
  ]);
  return accepted.has(normalized) ? normalized : "medium";
}

function normalizePriority(value: unknown): string {
  const normalized = asString(value, "").toLowerCase();
  const accepted = new Set(["blocker", "high", "medium", "low"]);
  return accepted.has(normalized) ? normalized : "medium";
}

function normalizeQuestionCategory(value: unknown): DiligenceCoreQuestion {
  const accepted = new Set<DiligenceCoreQuestion>([
    "Q1_IDENTITY",
    "Q2_PRODUCT",
    "Q3_MARKET",
    "Q4_EXECUTION",
    "Q5_BUSINESS_MODEL",
    "Q6_RISKS",
    "Q7_EVIDENCE",
    "Q8_FAILURE_MODES",
  ]);
  const normalized = asString(value, "").toUpperCase();
  return accepted.has(normalized as DiligenceCoreQuestion)
    ? (normalized as DiligenceCoreQuestion)
    : "Q7_EVIDENCE";
}
