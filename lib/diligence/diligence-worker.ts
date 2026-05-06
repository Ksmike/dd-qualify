import { get, list } from "@vercel/blob";
import { db } from "@/lib/db";
import { buildProjectBlobPrefix } from "@/lib/blob/documents";
import { DiligenceLLMService } from "@/lib/diligence/diligence-llm-service";
import { getStageProgressPercent, getNextStage } from "@/lib/diligence/stages";
import { UserApiKeyModel } from "@/lib/models/UserApiKeyModel";
import {
  ApiKeyProvider,
  DiligenceArtifactType,
  DiligenceJobStatus,
  DiligenceStageName,
  DiligenceStageStatus,
  DiligenceStorageProvider,
  type Prisma,
  ProjectDocumentProcessingStatus,
} from "@/lib/generated/prisma/client";

type StageExecutionResult = {
  outputJson: Record<string, unknown>;
  provider?: ApiKeyProvider;
  model?: string;
  tokenUsageTotal?: number;
  estimatedCostUsd?: number;
};

function toNonNegativeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function getLowercaseExtension(pathname: string): string {
  const lastDotIndex = pathname.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === pathname.length - 1) {
    return "";
  }
  return pathname.slice(lastDotIndex).toLowerCase();
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
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

  return new TextDecoder("utf-8").decode(merged);
}

function estimateCostUsd(
  provider: ApiKeyProvider,
  usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number }
): number {
  const inputTokens = toNonNegativeNumber(usage.input_tokens);
  const outputTokens = toNonNegativeNumber(usage.output_tokens);
  const totalTokens = toNonNegativeNumber(usage.total_tokens);

  // Coarse planning estimates only. Real billing depends on chosen provider/model tiers.
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

export class DiligenceWorker {
  private readonly llmService = new DiligenceLLMService();

  async runNextStage(input: {
    jobId: string;
    userId: string;
  }): Promise<{ status: "completed" | "progressed" | "waiting_input"; stage?: DiligenceStageName }> {
    const job = await db.diligenceJob.findFirst({
      where: {
        id: input.jobId,
        userId: input.userId,
      },
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
      await db.diligenceJob.update({
        where: { id: job.id },
        data: {
          status: DiligenceJobStatus.COMPLETED,
          completedAt: new Date(),
          progressPercent: 100,
        },
      });
      await db.project.updateMany({
        where: { id: job.projectId, userId: job.userId },
        data: { status: "reviewed" },
      });
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
      where: {
        jobId_stage: {
          jobId: job.id,
          stage: nextStage,
        },
      },
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
      const stageResult = await this.executeStage({
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
      });

      const tokenUsageTotal = toNonNegativeNumber(stageResult.tokenUsageTotal);
      const estimatedCostUsd = toNonNegativeNumber(stageResult.estimatedCostUsd);

      await db.diligenceStageRun.update({
        where: {
          jobId_stage: {
            jobId: job.id,
            stage: nextStage,
          },
        },
        data: {
          status: DiligenceStageStatus.COMPLETED,
          provider: stageResult.provider ?? null,
          model: stageResult.model ?? null,
          tokenUsageTotal,
          estimatedCostUsd,
          outputJson: toInputJson(stageResult.outputJson),
          completedAt: new Date(),
          outputArtifactCount: Array.isArray(stageResult.outputJson.items)
            ? stageResult.outputJson.items.length
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
          estimatedCostUsd: toNonNegativeNumber(job.estimatedCostUsd) + estimatedCostUsd,
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
        where: {
          jobId_stage: {
            jobId: job.id,
            stage: nextStage,
          },
        },
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

  private async executeStage(input: {
    stage: DiligenceStageName;
    jobId: string;
    projectId: string;
    userId: string;
    selectedProvider: ApiKeyProvider;
    selectedModel: string;
    fallbackProviders: ApiKeyProvider[];
    userApiKeyId: string | null;
  }): Promise<StageExecutionResult> {
    if (input.stage === DiligenceStageName.DOCUMENT_EXTRACTION) {
      return this.runDocumentExtractionStage(input);
    }

    return this.runLlmStage(input);
  }

  private async runDocumentExtractionStage(input: {
    stage: DiligenceStageName;
    jobId: string;
    projectId: string;
    userId: string;
  }): Promise<StageExecutionResult> {
    const prefix = buildProjectBlobPrefix(input.userId, input.projectId);
    if (!prefix) {
      throw new Error("Invalid project storage prefix.");
    }

    const { blobs } = await list({ prefix });
    if (blobs.length === 0) {
      await db.diligenceJob.update({
        where: { id: input.jobId },
        data: {
          status: DiligenceJobStatus.WAITING_INPUT,
          errorMessage: "No documents uploaded yet.",
        },
      });
      return {
        outputJson: {
          items: [],
          summary: "No source documents available.",
        },
      };
    }

    await db.projectDocument.updateMany({
      where: {
        projectId: input.projectId,
        userId: input.userId,
      },
      data: {
        processingStatus: ProjectDocumentProcessingStatus.PROCESSING,
        processingError: null,
      },
    });

    const extractedItems: Array<{
      pathname: string;
      filename: string;
      sizeBytes: number;
      extractedText: string;
      extractionMode: "plain_text" | "metadata";
      processingStatus: ProjectDocumentProcessingStatus;
      processingError: string | null;
    }> = [];

    for (const blob of blobs) {
      const filename = blob.pathname.startsWith(prefix)
        ? blob.pathname.slice(prefix.length)
        : blob.pathname;
      const extension = getLowercaseExtension(filename);

      let extractedText = "";
      let extractionMode: "plain_text" | "metadata" = "metadata";
      let processingStatus: ProjectDocumentProcessingStatus =
        ProjectDocumentProcessingStatus.PROCESSED;
      let processingError: string | null = null;

      if (extension === ".txt") {
        try {
          const blobResult = await get(blob.pathname, { access: "private" });
          if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
            throw new Error("Text file stream unavailable.");
          }
          extractedText = await streamToText(blobResult.stream);
          extractionMode = "plain_text";
        } catch (error) {
          processingStatus = ProjectDocumentProcessingStatus.FAILED;
          processingError =
            error instanceof Error ? error.message : "Text extraction failed.";
        }
      } else {
        extractedText = `Document metadata:\nfilename=${filename}\nsizeBytes=${blob.size}\nnote=Text extraction is only enabled for plain text files in this build.`;
      }

      await db.projectDocument.upsert({
        where: {
          projectId_pathname: {
            projectId: input.projectId,
            pathname: blob.pathname,
          },
        },
        create: {
          projectId: input.projectId,
          userId: input.userId,
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
        extractedText,
        extractionMode,
        processingStatus,
        processingError,
      });
    }

    await db.diligenceArtifact.deleteMany({
      where: {
        jobId: input.jobId,
        stage: DiligenceStageName.DOCUMENT_EXTRACTION,
      },
    });

    await db.diligenceArtifact.createMany({
      data: extractedItems.map((item) => ({
        projectId: input.projectId,
        jobId: input.jobId,
        userId: input.userId,
        stage: DiligenceStageName.DOCUMENT_EXTRACTION,
        type: DiligenceArtifactType.EXTRACTED_TEXT,
        storageProvider: DiligenceStorageProvider.JSON_COLUMN,
        storageKey: `db:project-document:${input.projectId}:${item.pathname}`,
        mimeType: "text/plain",
        sizeBytes: item.extractedText.length,
        checksum: null,
        metadata: toInputJson(item),
      })),
    });

    const processedCount = extractedItems.filter(
      (item) => item.processingStatus === ProjectDocumentProcessingStatus.PROCESSED
    ).length;

    return {
      outputJson: {
        items: extractedItems.map((item) => ({
          pathname: item.pathname,
          filename: item.filename,
          sizeBytes: item.sizeBytes,
          processingStatus: item.processingStatus,
          processingError: item.processingError,
          extractionMode: item.extractionMode,
        })),
        summary: `Processed ${processedCount}/${extractedItems.length} source document(s).`,
      },
    };
  }

  private async runLlmStage(input: {
    stage: DiligenceStageName;
    jobId: string;
    projectId: string;
    userId: string;
    selectedProvider: ApiKeyProvider;
    selectedModel: string;
    fallbackProviders: ApiKeyProvider[];
    userApiKeyId: string | null;
  }): Promise<StageExecutionResult> {
    if (!input.userApiKeyId) {
      throw new Error("Missing user API key reference for diligence job.");
    }

    const selectedKey = await UserApiKeyModel.findByIdForUser({
      userId: input.userId,
      userApiKeyId: input.userApiKeyId,
    });
    if (!selectedKey || !selectedKey.enabled) {
      throw new Error("Selected API key is missing or disabled.");
    }

    const primaryApiKey = UserApiKeyModel.decryptApiKey(selectedKey.encryptedKey);
    const fallbackCredentials: Array<{
      provider: ApiKeyProvider;
      model: string;
      apiKey: string;
    }> = [];

    for (const provider of input.fallbackProviders) {
      const key = await UserApiKeyModel.findForUser({
        userId: input.userId,
        provider,
      });
      if (!key || !key.enabled) {
        continue;
      }
      fallbackCredentials.push({
        provider: key.provider,
        model: key.defaultModel ?? input.selectedModel,
        apiKey: UserApiKeyModel.decryptApiKey(key.encryptedKey),
      });
    }

    const extractionArtifacts = await db.diligenceArtifact.findMany({
      where: {
        jobId: input.jobId,
        type: DiligenceArtifactType.EXTRACTED_TEXT,
      },
      orderBy: { createdAt: "asc" },
      select: {
        storageKey: true,
        sizeBytes: true,
        metadata: true,
      },
    });

    const priorStages = await db.diligenceStageRun.findMany({
      where: {
        jobId: input.jobId,
        status: DiligenceStageStatus.COMPLETED,
      },
      select: {
        stage: true,
        outputJson: true,
      },
      orderBy: { updatedAt: "asc" },
    });

    const stagePlan = this.getStagePromptPlan(input.stage);

    const llmResult = await this.llmService.invokeStructured<{
      summary: string;
      itemsJson: string;
    }>({
      stage: input.stage,
      systemInstruction:
        "You are a commercial due diligence specialist. Be precise, cite evidence keys, and avoid speculation.",
      userPrompt: [
        stagePlan.prompt,
        "",
        "Source documents:",
        JSON.stringify(extractionArtifacts, null, 2),
        "",
        "Prior stage outputs:",
        JSON.stringify(priorStages, null, 2),
      ].join("\n"),
      fields: stagePlan.fields,
      primary: {
        provider: input.selectedProvider,
        model: input.selectedModel,
        apiKey: primaryApiKey,
      },
      fallbacks: fallbackCredentials,
    });

    const parsedItems = parseJsonArray<Record<string, unknown>>(
      llmResult.parsed.itemsJson
    );

    await this.persistStageStructuredData({
      stage: input.stage,
      projectId: input.projectId,
      jobId: input.jobId,
      userId: input.userId,
      items: parsedItems,
      summary:
        typeof llmResult.parsed.summary === "string"
          ? llmResult.parsed.summary
          : "",
    });

    const usage = llmResult.usage ?? {};
    const usageTotal =
      toNonNegativeNumber(usage.total_tokens) ||
      toNonNegativeNumber(usage.input_tokens) +
        toNonNegativeNumber(usage.output_tokens);
    const estimatedCostUsd = estimateCostUsd(llmResult.provider, usage);

    return {
      outputJson: {
        summary: llmResult.parsed.summary,
        items: parsedItems,
        raw: llmResult.rawText,
      },
      provider: llmResult.provider,
      model: llmResult.model,
      tokenUsageTotal: usageTotal,
      estimatedCostUsd,
    };
  }

  private getStagePromptPlan(stage: DiligenceStageName): {
    prompt: string;
    fields: Record<string, string>;
  } {
    switch (stage) {
      case DiligenceStageName.DOCUMENT_CLASSIFICATION:
        return {
          prompt:
            "Classify each document by type, diligence relevance, and confidence. Return one item per document.",
          fields: {
            summary: "Short paragraph summary of document classification results.",
            itemsJson:
              'A strict JSON array. Each item: {"id": "unique-id", "title": "document filename", "type": "financial|legal|operational|pitch|reference|other", "relevance": "high|medium|low", "confidence": 0.0-1.0, "details": "why this classification"}',
          },
        };
      case DiligenceStageName.ENTITY_EXTRACTION:
        return {
          prompt:
            "Extract all entities relevant for commercial diligence. Include companies (target and competitors), key people (founders, executives, board members), products, markets, revenue figures, funding amounts, and regulatory bodies. For each entity provide the kind, any quantitative data, and which document it was found in.",
          fields: {
            summary: "Short paragraph summary of entities found across documents.",
            itemsJson:
              'A strict JSON array. Each item: {"name": "entity name", "kind": "person|company|product|market|financial_metric|regulation|location|technology", "details": "role, title, revenue figure, or other context", "confidence": 0.0-1.0, "source": "document filename where found"}',
          },
        };
      case DiligenceStageName.CLAIM_EXTRACTION:
        return {
          prompt:
            "Extract specific, testable claims made in the documents. These are factual assertions about revenue, growth, market size, competitive position, technology capabilities, or team qualifications. For each claim, assess whether it is supported by evidence in other documents, contradicted, or inconclusive. Provide the exact quote or paraphrase and cite the source document.",
          fields: {
            summary: "Short paragraph summary of key claims and their verification status.",
            itemsJson:
              'A strict JSON array. Each item: {"claim": "the specific factual claim being made", "status": "SUPPORTED|CONTRADICTED|INCONCLUSIVE", "confidence": 0.0-1.0, "source": "document where claim was made", "evidence": "supporting or contradicting evidence from other documents", "details": "explanation of why this status was assigned"}',
          },
        };
      case DiligenceStageName.RISK_EXTRACTION:
        return {
          prompt:
            "Extract commercial and operational risks identified across the documents. Include market risks, financial risks, team risks, technology risks, legal/regulatory risks, and concentration risks. For each risk, explain what the risk is, what evidence supports it, how severe it could be, and what mitigation might exist.",
          fields: {
            summary: "Short paragraph summary of the overall risk profile.",
            itemsJson:
              'A strict JSON array. Each item: {"title": "short risk title", "summary": "detailed explanation of the risk, its potential impact, and any mitigating factors", "type": "RISK", "severity": "critical|high|medium|low", "confidence": 0.0-1.0, "evidenceRefs": ["document names that support this finding"], "details": "additional context and recommended actions"}',
          },
        };
      case DiligenceStageName.CROSS_DOCUMENT_VALIDATION:
        return {
          prompt:
            "Cross-validate claims and data points across all documents. Identify where documents agree, where they conflict, and where there are evidence gaps. Flag any numbers that don't reconcile (e.g., revenue figures that differ between pitch deck and financials).",
          fields: {
            summary: "Short paragraph summary of cross-document validation findings.",
            itemsJson:
              'A strict JSON array. Each item: {"title": "what was validated", "status": "CONFIRMED|CONFLICTING|UNVERIFIABLE", "details": "explanation of the validation result with specific references to documents and data points", "confidence": 0.0-1.0, "sources": ["document names involved"]}',
          },
        };
      case DiligenceStageName.CONTRADICTION_DETECTION:
        return {
          prompt:
            "Identify explicit contradictions between documents. A contradiction is when two sources make incompatible factual claims. For each contradiction, quote or closely paraphrase both statements, identify which documents they come from, and explain why they are contradictory.",
          fields: {
            summary: "Short paragraph summary of contradictions found.",
            itemsJson:
              'A strict JSON array. Each item: {"statementA": "exact quote or close paraphrase of first claim with source document name", "statementB": "exact quote or close paraphrase of contradicting claim with source document name", "explanation": "why these statements contradict each other", "confidence": 0.0-1.0, "sourceA": "document name for statement A", "sourceB": "document name for statement B"}',
          },
        };
      case DiligenceStageName.EVIDENCE_GRAPH_GENERATION:
        return {
          prompt:
            "Build an evidence graph connecting entities, claims, findings, and contradictions. Each node represents a key data point and edges represent relationships (supports, contradicts, relates_to).",
          fields: {
            summary: "Short paragraph summary of the evidence graph structure.",
            itemsJson:
              'A strict JSON array of edges. Each item: {"from": "source node name", "to": "target node name", "relationship": "supports|contradicts|relates_to|employs|competes_with|funds", "confidence": 0.0-1.0, "details": "context for this relationship"}',
          },
        };
      case DiligenceStageName.EXECUTIVE_SUMMARY_GENERATION:
        return {
          prompt:
            "Generate a comprehensive executive summary for investment decision support. Include: company overview, key metrics, team assessment, market position, major risks, unresolved questions, and a preliminary recommendation. Structure it as clear sections.",
          fields: {
            summary:
              "A full executive summary (3-5 paragraphs) covering the investment thesis, key strengths, critical risks, and open questions for the investment committee.",
            itemsJson:
              'A strict JSON array of report sections. Each item: {"section": "section title (e.g. Company Overview, Key Metrics, Team, Market Position, Risks, Open Questions, Recommendation)", "content": "detailed section content with specific data points and evidence"}',
          },
        };
      case DiligenceStageName.FINAL_REPORT_GENERATION:
        return {
          prompt:
            "Generate the final due diligence report with all sections, findings, and recommendations. This should be comprehensive and ready for investment committee review.",
          fields: {
            summary:
              "A comprehensive final summary (3-5 paragraphs) synthesizing all diligence findings into an actionable investment recommendation.",
            itemsJson:
              'A strict JSON array of report sections. Each item: {"section": "section title", "content": "detailed section content with data, evidence references, and analysis"}',
          },
        };
      default:
        return {
          prompt: "Run the current diligence stage and return structured outputs.",
          fields: {
            summary: "Short paragraph summary for this stage.",
            itemsJson:
              "A strict JSON array. Each item should include relevant structured data.",
          },
        };
    }
  }

  private async persistStageStructuredData(input: {
    stage: DiligenceStageName;
    projectId: string;
    jobId: string;
    userId: string;
    items: Record<string, unknown>[];
    summary: string;
  }): Promise<void> {
    if (input.stage === DiligenceStageName.ENTITY_EXTRACTION) {
      await db.diligenceEntity.deleteMany({ where: { jobId: input.jobId } });
      if (input.items.length > 0) {
        await db.diligenceEntity.createMany({
          data: input.items.map((item) => ({
            projectId: input.projectId,
            jobId: input.jobId,
            userId: input.userId,
            name:
              typeof item.name === "string"
                ? item.name
                : typeof item.title === "string"
                  ? item.title
                  : "Unnamed entity",
            kind:
              typeof item.kind === "string"
                ? item.kind
                : typeof item.type === "string"
                  ? item.type
                  : "unknown",
            confidence:
              typeof item.confidence === "number" ? item.confidence : null,
            metadata: toInputJson(item),
          })),
        });
      }
      return;
    }

    if (input.stage === DiligenceStageName.CLAIM_EXTRACTION) {
      await db.diligenceClaim.deleteMany({ where: { jobId: input.jobId } });
      if (input.items.length > 0) {
        await db.diligenceClaim.createMany({
          data: input.items.map((item) => ({
            projectId: input.projectId,
            jobId: input.jobId,
            userId: input.userId,
            claimText:
              typeof item.claim === "string"
                ? item.claim
                : typeof item.claimText === "string"
                  ? item.claimText
                  : typeof item.title === "string"
                    ? item.title
                    : "Unnamed claim",
            status:
              typeof item.status === "string" &&
              ["SUPPORTED", "CONTRADICTED", "INCONCLUSIVE"].includes(item.status)
                ? (item.status as "SUPPORTED" | "CONTRADICTED" | "INCONCLUSIVE")
                : undefined,
            confidence:
              typeof item.confidence === "number" ? item.confidence : null,
            evidenceRefs: item.evidenceRefs
              ? toInputJson(item.evidenceRefs)
              : item.evidence
                ? toInputJson({ evidence: item.evidence, source: item.source })
                : undefined,
            contradictions: item.contradictions
              ? toInputJson(item.contradictions)
              : undefined,
          })),
        });
      }
      return;
    }

    if (input.stage === DiligenceStageName.RISK_EXTRACTION) {
      await db.diligenceFinding.deleteMany({
        where: { jobId: input.jobId, type: "RISK" },
      });
      if (input.items.length > 0) {
        await db.diligenceFinding.createMany({
          data: input.items.map((item) => ({
            projectId: input.projectId,
            jobId: input.jobId,
            userId: input.userId,
            type: "RISK",
            title:
              typeof item.title === "string"
                ? item.title
                : "Commercial risk",
            summary:
              typeof item.summary === "string"
                ? item.summary
                : typeof item.details === "string"
                  ? item.details
                  : "No summary provided.",
            confidence:
              typeof item.confidence === "number" ? item.confidence : null,
            evidenceRefs: item.evidenceRefs
              ? toInputJson(item.evidenceRefs)
              : undefined,
            metadata: toInputJson(item),
          })),
        });
      }
      return;
    }

    if (input.stage === DiligenceStageName.CONTRADICTION_DETECTION) {
      await db.diligenceContradiction.deleteMany({ where: { jobId: input.jobId } });
      if (input.items.length > 0) {
        await db.diligenceContradiction.createMany({
          data: input.items.map((item) => ({
            projectId: input.projectId,
            jobId: input.jobId,
            userId: input.userId,
            statementA:
              typeof item.statementA === "string"
                ? item.statementA
                : typeof item.statement_a === "string"
                  ? item.statement_a
                  : "Unspecified statement A",
            statementB:
              typeof item.statementB === "string"
                ? item.statementB
                : typeof item.statement_b === "string"
                  ? item.statement_b
                  : "Unspecified statement B",
            confidence:
              typeof item.confidence === "number" ? item.confidence : null,
            evidenceRefs: item.evidenceRefs
              ? toInputJson(item.evidenceRefs)
              : item.explanation
                ? toInputJson({
                    explanation: item.explanation,
                    sourceA: item.sourceA,
                    sourceB: item.sourceB,
                  })
                : undefined,
          })),
        });
      }
      return;
    }

    if (
      input.stage === DiligenceStageName.FINAL_REPORT_GENERATION ||
      input.stage === DiligenceStageName.EXECUTIVE_SUMMARY_GENERATION
    ) {
      await db.diligenceArtifact.create({
        data: {
          projectId: input.projectId,
          jobId: input.jobId,
          userId: input.userId,
          stage: input.stage,
          type: DiligenceArtifactType.GENERATED_REPORT,
          storageProvider: DiligenceStorageProvider.JSON_COLUMN,
          storageKey: `db:diligence-report:${input.jobId}:${input.stage}`,
          mimeType: "application/json",
          sizeBytes: null,
          checksum: null,
          metadata: toInputJson({
            summary: input.summary,
            items: input.items,
          }),
        },
      });
    }
  }
}
