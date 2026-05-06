import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectDocumentsPanel } from "@/app/(app)/project/[id]/ProjectDocumentsPanel";
import { toast } from "@heroui/react";
import {
  startProjectDueDiligence,
  retryProjectDueDiligence,
} from "@/lib/actions/project";

vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual<typeof import("@heroui/react")>(
    "@heroui/react"
  );
  return {
    ...actual,
    toast: {
      warning: vi.fn(),
      success: vi.fn(),
      danger: vi.fn(),
    },
  };
});
vi.mock("@/lib/actions/project", () => ({
  startProjectDueDiligence: vi.fn().mockResolvedValue({ jobId: "job-1" }),
  retryProjectDueDiligence: vi.fn().mockResolvedValue({ runId: "run-1" }),
}));

const labels = {
  documentsHeading: "Files",
  fileInputLabel: "Upload files",
  uploadInProgress: "Uploading...",
  dropzoneTitle: "Drag and drop files to upload",
  dropzoneHint: "Files upload automatically after drop.",
  uploadQueueHeading: "Upload progress",
  uploadStatusQueued: "queued",
  uploadStatusUploading: "uploading",
  uploadStatusUploaded: "uploaded",
  uploadStatusFailed: "failed",
  emptyDocuments: "No files uploaded yet.",
  loadingDocuments: "Loading files...",
  loadError: "Failed to load files.",
  uploadError: "Failed to upload file.",
  viewFileCta: "View",
  deleteFileCta: "Delete",
  deleteInProgress: "Deleting...",
  deleteError: "Failed to delete file.",
  reprocessFileCta: "Re-process",
  reprocessInProgress: "Queueing...",
  reprocessError: "Failed to queue file for re-processing.",
  fileStatusLabel: "File status",
  fileProcessingStatuses: {
    QUEUED: "queued",
    PROCESSING: "processing",
    PROCESSED: "processed",
    FAILED: "failed",
  },
  beDiligentCta: "Be Diligent",
  providerSelectionLabel: "Provider",
  modelInputLabel: "Model",
  modelInputPlaceholder: "gpt-4o-mini",
  fallbackProvidersLabel: "Fallback providers",
  retryDiligenceCta: "Retry diligence",
  cancelDiligenceCta: "Cancel diligence",
  cancelDiligenceConfirm: "Cancel the running diligence workflow?",
  cancelDiligenceToast: "Diligence cancelled.",
  cancelDiligenceErrorToast: "Failed to cancel diligence.",
  diligenceProgressHeading: "Diligence worker",
  diligenceStatusLabel: "Job status",
  diligenceCurrentStageLabel: "Current stage",
  diligenceJobIdLabel: "Job ID",
  diligenceTokenUsageLabel: "Token usage",
  diligenceCostEstimateLabel: "Estimated cost",
  diligenceLastErrorLabel: "Last error",
  diligenceNoJobMessage: "No diligence job has started yet.",
  diligenceJobCreatedToast: "Due diligence job initialized.",
  diligenceRunningToast: "Diligence workflow running.",
  diligenceCompletedToast: "Due diligence job completed.",
  diligenceRetryToast: "Diligence retry started.",
  diligenceRetryErrorToast: "Failed to retry due diligence.",
  diligenceStatuses: {
    QUEUED: "queued",
    RUNNING: "running",
    WAITING_INPUT: "waiting for input",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELED: "canceled",
  },
  diligenceStages: {
    DOCUMENT_EXTRACTION: "document extraction",
    DOCUMENT_CLASSIFICATION: "document classification",
    ENTITY_EXTRACTION: "entity extraction",
    CLAIM_EXTRACTION: "claim extraction",
    RISK_EXTRACTION: "risk extraction",
    CROSS_DOCUMENT_VALIDATION: "cross-document validation",
    CONTRADICTION_DETECTION: "contradiction detection",
    EVIDENCE_GRAPH_GENERATION: "evidence graph generation",
    EXECUTIVE_SUMMARY_GENERATION: "executive summary generation",
    FINAL_REPORT_GENERATION: "final report generation",
  },
  setupApiKeysMessage: "Add at least one API key in Settings to run due diligence.",
  setupApiKeysToast: "No API keys found. Opening Settings in a new tab.",
  diligenceStartToast: "Due diligence started.",
  insightsHeading: "Reviewed insights",
  insightsEmpty: "No reviewed insights yet. Run due diligence to generate findings.",
  insightsRisksHeading: "Top risks",
  insightsClaimsHeading: "Key claims",
  insightsEntitiesHeading: "Core entities",
  insightsContradictionsHeading: "Contradictions",
};

const apiKeyStatuses = [
  {
    id: "key-1",
    provider: "OPENAI",
    isSet: true,
    hint: "1234",
    defaultModel: "gpt-4o-mini",
    enabled: true,
    lastValidatedAt: null,
  },
  {
    id: "key-2",
    provider: "ANTHROPIC",
    isSet: true,
    hint: "1234",
    defaultModel: "claude-3-5-sonnet-latest",
    enabled: true,
    lastValidatedAt: null,
  },
] as const;

describe("ProjectDocumentsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders existing documents", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [
          {
            id: "doc-1",
            filename: "report.pdf",
            pathname: "user-1/project-1/report.pdf",
            size: 2048,
            uploadedAt: "2026-05-06T00:00:00.000Z",
            processingStatus: "QUEUED",
            processingError: null,
            lastProcessedAt: null,
            reprocessCount: 0,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        projectStatus="draft"
        hasAnyApiKeys={true}
        apiKeyStatuses={[...apiKeyStatuses]}
        diligenceJob={null}
        insights={null}
        labels={labels}
      />
    );

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/api/projects/project-1/documents/report.pdf"
    );
  });

  it("routes users without API keys to settings in a new tab", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            id: "doc-1",
            filename: "report.pdf",
            pathname: "user-1/project-1/report.pdf",
            size: 2048,
            uploadedAt: "2026-05-06T00:00:00.000Z",
            processingStatus: "QUEUED",
            processingError: null,
            lastProcessedAt: null,
            reprocessCount: 0,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        projectStatus="draft"
        hasAnyApiKeys={false}
        apiKeyStatuses={[]}
        diligenceJob={null}
        insights={null}
        labels={labels}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Be Diligent" }));

    expect(toast.warning).toHaveBeenCalledWith(
      "No API keys found. Opening Settings in a new tab."
    );
    expect(openSpy).toHaveBeenCalledWith(
      "/settings",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("starts due diligence for draft projects with provider config", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            id: "doc-1",
            filename: "report.pdf",
            pathname: "user-1/project-1/report.pdf",
            size: 2048,
            uploadedAt: "2026-05-06T00:00:00.000Z",
            processingStatus: "QUEUED",
            processingError: null,
            lastProcessedAt: null,
            reprocessCount: 0,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        projectStatus="draft"
        hasAnyApiKeys={true}
        apiKeyStatuses={[...apiKeyStatuses]}
        diligenceJob={null}
        insights={null}
        labels={labels}
      />
    );

    fireEvent.change(await screen.findByLabelText("Model"), {
      target: { value: "gpt-4o" },
    });

    await user.click(await screen.findByRole("button", { name: "Be Diligent" }));

    expect(startProjectDueDiligence).toHaveBeenCalledWith("project-1", {
      selectedProvider: "OPENAI",
      selectedModel: "gpt-4o",
      fallbackProviders: [],
    });
    expect(toast.success).toHaveBeenCalledWith("Due diligence job initialized.");
  });

  it("retries a failed diligence job", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ documents: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        projectStatus="inprogress"
        hasAnyApiKeys={true}
        apiKeyStatuses={[...apiKeyStatuses]}
        diligenceJob={{
          id: "job-1",
          status: "FAILED",
          selectedProvider: "OPENAI",
          selectedModel: "gpt-4o-mini",
          currentStage: "DOCUMENT_CLASSIFICATION",
          progressPercent: 20,
          tokenUsageTotal: 100,
          estimatedCostUsd: 0.01,
          errorMessage: "boom",
          stageRuns: [
            {
              stage: "DOCUMENT_EXTRACTION",
              status: "COMPLETED",
              attempts: 1,
              updatedAt: new Date(),
            },
          ],
        }}
        insights={null}
        labels={labels}
      />
    );

    await user.click(
      await screen.findByRole("button", { name: "Retry diligence" })
    );

    expect(retryProjectDueDiligence).toHaveBeenCalledWith("job-1");
  });
});
