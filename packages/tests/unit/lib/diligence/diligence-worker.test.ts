import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  diligenceJob: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  diligenceStageRun: {
    upsert: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  diligenceArtifact: {
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  diligenceEntity: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  diligenceClaim: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  diligenceFinding: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  diligenceContradiction: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  project: {
    updateMany: vi.fn(),
  },
  projectDocument: {
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/generated/prisma/client", () => ({
  ApiKeyProvider: { OPENAI: "OPENAI", ANTHROPIC: "ANTHROPIC", GOOGLE: "GOOGLE" },
  DiligenceArtifactType: { EXTRACTED_TEXT: "EXTRACTED_TEXT", GENERATED_REPORT: "GENERATED_REPORT" },
  DiligenceJobStatus: {
    QUEUED: "QUEUED",
    RUNNING: "RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CANCELED: "CANCELED",
    WAITING_INPUT: "WAITING_INPUT",
  },
  DiligenceStageName: {
    DOCUMENT_EXTRACTION: "DOCUMENT_EXTRACTION",
    DOCUMENT_CLASSIFICATION: "DOCUMENT_CLASSIFICATION",
    ENTITY_EXTRACTION: "ENTITY_EXTRACTION",
    CLAIM_EXTRACTION: "CLAIM_EXTRACTION",
    RISK_EXTRACTION: "RISK_EXTRACTION",
    CROSS_DOCUMENT_VALIDATION: "CROSS_DOCUMENT_VALIDATION",
    CONTRADICTION_DETECTION: "CONTRADICTION_DETECTION",
    EVIDENCE_GRAPH_GENERATION: "EVIDENCE_GRAPH_GENERATION",
    EXECUTIVE_SUMMARY_GENERATION: "EXECUTIVE_SUMMARY_GENERATION",
    FINAL_REPORT_GENERATION: "FINAL_REPORT_GENERATION",
  },
  DiligenceStageStatus: {
    RUNNING: "RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  },
  DiligenceStorageProvider: { JSON_COLUMN: "JSON_COLUMN" },
  ProjectDocumentProcessingStatus: {
    PROCESSING: "PROCESSING",
    PROCESSED: "PROCESSED",
    FAILED: "FAILED",
  },
}));

vi.mock("@vercel/blob", () => ({
  get: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/lib/blob/documents", () => ({
  buildProjectBlobPrefix: vi.fn().mockReturnValue("users/user-1/projects/proj-1/"),
}));

const mockInvokeStructured = vi.fn();
vi.mock("@/lib/diligence/diligence-llm-service", () => ({
  DiligenceLLMService: class {
    invokeStructured = mockInvokeStructured;
  },
}));

vi.mock("@/lib/diligence/stages", () => ({
  getNextStage: vi.fn(),
  getStageProgressPercent: vi.fn().mockReturnValue(50),
}));

const mockFindByIdForUser = vi.fn();
const mockFindForUser = vi.fn();
const mockDecryptApiKey = vi.fn();

vi.mock("@/lib/models/UserApiKeyModel", () => ({
  UserApiKeyModel: {
    findByIdForUser: (...args: unknown[]) => mockFindByIdForUser(...args),
    findForUser: (...args: unknown[]) => mockFindForUser(...args),
    decryptApiKey: (...args: unknown[]) => mockDecryptApiKey(...args),
  },
}));

const { DiligenceWorker } = await import("@/lib/diligence/diligence-worker");
const { getNextStage } = await import("@/lib/diligence/stages");

describe("DiligenceWorker", () => {
  let worker: InstanceType<typeof DiligenceWorker>;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new DiligenceWorker();
  });

  describe("getStagePromptPlan (via runLlmStage)", () => {
    // We test getStagePromptPlan indirectly by triggering runLlmStage
    // and checking the prompt/fields passed to invokeStructured

    const baseJob = {
      id: "job-1",
      userId: "user-1",
      projectId: "proj-1",
      status: "RUNNING",
      currentStage: null,
      selectedProvider: "OPENAI",
      selectedModel: "gpt-4o",
      fallbackProviders: [],
      userApiKeyId: "key-1",
      tokenUsageTotal: 0,
      estimatedCostUsd: 0,
    };

    function setupForLlmStage(stage: string) {
      mockDb.diligenceJob.findFirst.mockResolvedValue(baseJob);
      (getNextStage as any).mockReturnValue(stage);
      mockDb.diligenceStageRun.upsert.mockResolvedValue({});
      mockDb.diligenceJob.update.mockResolvedValue({});
      mockDb.diligenceStageRun.update.mockResolvedValue({});
      mockFindByIdForUser.mockResolvedValue({
        id: "key-1",
        enabled: true,
        encryptedKey: "encrypted",
        provider: "OPENAI",
      });
      mockDecryptApiKey.mockReturnValue("sk-decrypted");
      mockDb.diligenceArtifact.findMany.mockResolvedValue([]);
      mockDb.diligenceStageRun.findMany.mockResolvedValue([]);
      mockInvokeStructured.mockResolvedValue({
        provider: "OPENAI",
        model: "gpt-4o",
        parsed: { summary: "Test summary", itemsJson: "[]" },
        usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
        rawText: "raw output",
      });
    }

    it("uses DOCUMENT_CLASSIFICATION prompt plan", async () => {
      setupForLlmStage("DOCUMENT_CLASSIFICATION");

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      const call = mockInvokeStructured.mock.calls[0][0];
      expect(call.stage).toBe("DOCUMENT_CLASSIFICATION");
      expect(call.fields).toHaveProperty("summary");
      expect(call.fields).toHaveProperty("itemsJson");
    });

    it("uses ENTITY_EXTRACTION prompt plan", async () => {
      setupForLlmStage("ENTITY_EXTRACTION");
      // Mock persistStageStructuredData dependencies
      mockDb.diligenceEntity.deleteMany.mockResolvedValue({});
      mockDb.diligenceEntity.createMany.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      const call = mockInvokeStructured.mock.calls[0][0];
      expect(call.stage).toBe("ENTITY_EXTRACTION");
      expect(call.fields.itemsJson).toContain("name");
      expect(call.fields.itemsJson).toContain("kind");
    });

    it("uses RISK_EXTRACTION prompt plan", async () => {
      setupForLlmStage("RISK_EXTRACTION");
      mockDb.diligenceFinding.deleteMany.mockResolvedValue({});
      mockDb.diligenceFinding.createMany.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      const call = mockInvokeStructured.mock.calls[0][0];
      expect(call.stage).toBe("RISK_EXTRACTION");
      expect(call.fields.itemsJson).toContain("severity");
    });

    it("throws when userApiKeyId is missing", async () => {
      const jobNoKey = { ...baseJob, userApiKeyId: null };
      mockDb.diligenceJob.findFirst.mockResolvedValue(jobNoKey);
      (getNextStage as any).mockReturnValue("ENTITY_EXTRACTION");
      mockDb.diligenceStageRun.upsert.mockResolvedValue({});
      mockDb.diligenceJob.update.mockResolvedValue({});
      mockDb.diligenceStageRun.update.mockResolvedValue({});

      await expect(
        worker.runNextStage({ jobId: "job-1", userId: "user-1" })
      ).rejects.toThrow("Missing user API key reference");
    });

    it("throws when selected API key is disabled", async () => {
      mockDb.diligenceJob.findFirst.mockResolvedValue(baseJob);
      (getNextStage as any).mockReturnValue("ENTITY_EXTRACTION");
      mockDb.diligenceStageRun.upsert.mockResolvedValue({});
      mockDb.diligenceJob.update.mockResolvedValue({});
      mockDb.diligenceStageRun.update.mockResolvedValue({});
      mockFindByIdForUser.mockResolvedValue({
        id: "key-1",
        enabled: false,
        encryptedKey: "encrypted",
      });

      await expect(
        worker.runNextStage({ jobId: "job-1", userId: "user-1" })
      ).rejects.toThrow("Selected API key is missing or disabled.");
    });
  });

  describe("persistStageStructuredData (via runLlmStage)", () => {
    const baseJob = {
      id: "job-1",
      userId: "user-1",
      projectId: "proj-1",
      status: "RUNNING",
      currentStage: null,
      selectedProvider: "OPENAI",
      selectedModel: "gpt-4o",
      fallbackProviders: [],
      userApiKeyId: "key-1",
      tokenUsageTotal: 0,
      estimatedCostUsd: 0,
    };

    function setupForPersist(stage: string, parsedItems: string) {
      mockDb.diligenceJob.findFirst.mockResolvedValue(baseJob);
      (getNextStage as any).mockReturnValue(stage);
      mockDb.diligenceStageRun.upsert.mockResolvedValue({});
      mockDb.diligenceJob.update.mockResolvedValue({});
      mockDb.diligenceStageRun.update.mockResolvedValue({});
      mockFindByIdForUser.mockResolvedValue({
        id: "key-1",
        enabled: true,
        encryptedKey: "encrypted",
        provider: "OPENAI",
      });
      mockDecryptApiKey.mockReturnValue("sk-decrypted");
      mockDb.diligenceArtifact.findMany.mockResolvedValue([]);
      mockDb.diligenceStageRun.findMany.mockResolvedValue([]);
      mockInvokeStructured.mockResolvedValue({
        provider: "OPENAI",
        model: "gpt-4o",
        parsed: { summary: "Summary", itemsJson: parsedItems },
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        rawText: "raw",
      });
    }

    it("persists entities for ENTITY_EXTRACTION stage", async () => {
      const items = JSON.stringify([
        { name: "Acme Corp", kind: "company", confidence: 0.9 },
        { name: "John Doe", kind: "person", confidence: 0.8 },
      ]);
      setupForPersist("ENTITY_EXTRACTION", items);
      mockDb.diligenceEntity.deleteMany.mockResolvedValue({});
      mockDb.diligenceEntity.createMany.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      expect(mockDb.diligenceEntity.deleteMany).toHaveBeenCalledWith({
        where: { jobId: "job-1" },
      });
      expect(mockDb.diligenceEntity.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: "Acme Corp", kind: "company" }),
          expect.objectContaining({ name: "John Doe", kind: "person" }),
        ]),
      });
    });

    it("persists claims for CLAIM_EXTRACTION stage", async () => {
      const items = JSON.stringify([
        { claim: "Revenue grew 50%", status: "SUPPORTED", confidence: 0.85 },
      ]);
      setupForPersist("CLAIM_EXTRACTION", items);
      mockDb.diligenceClaim.deleteMany.mockResolvedValue({});
      mockDb.diligenceClaim.createMany.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      expect(mockDb.diligenceClaim.deleteMany).toHaveBeenCalledWith({
        where: { jobId: "job-1" },
      });
      expect(mockDb.diligenceClaim.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            claimText: "Revenue grew 50%",
            status: "SUPPORTED",
          }),
        ]),
      });
    });

    it("persists findings for RISK_EXTRACTION stage", async () => {
      const items = JSON.stringify([
        { title: "Market concentration", summary: "High risk", confidence: 0.7 },
      ]);
      setupForPersist("RISK_EXTRACTION", items);
      mockDb.diligenceFinding.deleteMany.mockResolvedValue({});
      mockDb.diligenceFinding.createMany.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      expect(mockDb.diligenceFinding.deleteMany).toHaveBeenCalledWith({
        where: { jobId: "job-1", type: "RISK" },
      });
      expect(mockDb.diligenceFinding.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            title: "Market concentration",
            type: "RISK",
          }),
        ]),
      });
    });

    it("persists contradictions for CONTRADICTION_DETECTION stage", async () => {
      const items = JSON.stringify([
        {
          statementA: "Revenue is $10M",
          statementB: "Revenue is $5M",
          confidence: 0.9,
          explanation: "Conflicting revenue figures",
        },
      ]);
      setupForPersist("CONTRADICTION_DETECTION", items);
      mockDb.diligenceContradiction.deleteMany.mockResolvedValue({});
      mockDb.diligenceContradiction.createMany.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      expect(mockDb.diligenceContradiction.deleteMany).toHaveBeenCalledWith({
        where: { jobId: "job-1" },
      });
      expect(mockDb.diligenceContradiction.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            statementA: "Revenue is $10M",
            statementB: "Revenue is $5M",
          }),
        ]),
      });
    });

    it("creates artifact for FINAL_REPORT_GENERATION stage", async () => {
      const items = JSON.stringify([
        { section: "Overview", content: "Company overview" },
      ]);
      setupForPersist("FINAL_REPORT_GENERATION", items);
      mockDb.diligenceArtifact.create.mockResolvedValue({});

      await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      expect(mockDb.diligenceArtifact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stage: "FINAL_REPORT_GENERATION",
          type: "GENERATED_REPORT",
          storageProvider: "JSON_COLUMN",
        }),
      });
    });
  });

  describe("runNextStage - job lifecycle", () => {
    it("throws when job is not found", async () => {
      mockDb.diligenceJob.findFirst.mockResolvedValue(null);

      await expect(
        worker.runNextStage({ jobId: "job-1", userId: "user-1" })
      ).rejects.toThrow("Diligence job not found.");
    });

    it("returns completed when job is already COMPLETED", async () => {
      mockDb.diligenceJob.findFirst.mockResolvedValue({
        id: "job-1",
        status: "COMPLETED",
      });

      const result = await worker.runNextStage({ jobId: "job-1", userId: "user-1" });
      expect(result).toEqual({ status: "completed" });
    });

    it("returns completed when job is CANCELED", async () => {
      mockDb.diligenceJob.findFirst.mockResolvedValue({
        id: "job-1",
        status: "CANCELED",
      });

      const result = await worker.runNextStage({ jobId: "job-1", userId: "user-1" });
      expect(result).toEqual({ status: "completed" });
    });

    it("returns completed and updates status when no next stage", async () => {
      mockDb.diligenceJob.findFirst.mockResolvedValue({
        id: "job-1",
        userId: "user-1",
        projectId: "proj-1",
        status: "RUNNING",
        currentStage: "FINAL_REPORT_GENERATION",
      });
      (getNextStage as any).mockReturnValue(null);
      mockDb.diligenceJob.update.mockResolvedValue({});
      mockDb.project.updateMany.mockResolvedValue({});

      const result = await worker.runNextStage({ jobId: "job-1", userId: "user-1" });

      expect(result).toEqual({ status: "completed" });
      expect(mockDb.diligenceJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "job-1" },
          data: expect.objectContaining({
            status: "COMPLETED",
            progressPercent: 100,
          }),
        })
      );
    });
  });
});
