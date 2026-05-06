"use client";

import { toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuBot, LuCirclePlay, LuRefreshCw } from "react-icons/lu";
import {
  startProjectDueDiligence,
  retryProjectDueDiligence,
  cancelProjectDueDiligence,
} from "@/lib/actions/project";
import type {
  ApiKeyProvider,
  DiligenceJobStatus,
  DiligenceStageName,
  DiligenceStageStatus,
  ProjectDocumentProcessingStatus,
} from "@/lib/generated/prisma/client";
import type { ProjectStatus } from "@/lib/models/ProjectModel";
import type { ApiKeyStatus } from "@/lib/actions/apiKeys";

type ProjectInspectDocument = {
  id: string;
  filename: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  processingStatus: ProjectDocumentProcessingStatus;
  processingError: string | null;
  lastProcessedAt: string | null;
  reprocessCount: number;
};

type DiligenceJobSummary = {
  id: string;
  status: DiligenceJobStatus;
  selectedProvider: ApiKeyProvider;
  selectedModel: string;
  currentStage: DiligenceStageName | null;
  progressPercent: number;
  tokenUsageTotal: number;
  estimatedCostUsd: number | null;
  errorMessage: string | null;
  stageRuns: Array<{
    stage: DiligenceStageName;
    status: DiligenceStageStatus;
    attempts: number;
    updatedAt: Date;
  }>;
};

type DiligenceInsightsSummary = {
  risks: Array<{ id: string; title: string; summary: string; confidence: number | null }>;
  claims: Array<{ id: string; claimText: string; confidence: number | null }>;
  entities: Array<{ id: string; name: string; kind: string; confidence: number | null }>;
  contradictions: Array<{
    id: string;
    statementA: string;
    statementB: string;
    confidence: number | null;
  }>;
};

type ProjectDocumentsPanelLabels = {
  documentsHeading: string;
  fileInputLabel: string;
  uploadInProgress: string;
  dropzoneTitle: string;
  dropzoneHint: string;
  uploadQueueHeading: string;
  uploadStatusQueued: string;
  uploadStatusUploading: string;
  uploadStatusUploaded: string;
  uploadStatusFailed: string;
  emptyDocuments: string;
  loadingDocuments: string;
  loadError: string;
  uploadError: string;
  viewFileCta: string;
  deleteFileCta: string;
  deleteInProgress: string;
  deleteError: string;
  reprocessFileCta: string;
  reprocessInProgress: string;
  reprocessError: string;
  fileStatusLabel: string;
  fileProcessingStatuses: Record<ProjectDocumentProcessingStatus, string>;
  beDiligentCta: string;
  providerSelectionLabel: string;
  modelInputLabel: string;
  modelInputPlaceholder: string;
  fallbackProvidersLabel: string;
  retryDiligenceCta: string;
  cancelDiligenceCta: string;
  cancelDiligenceConfirm: string;
  cancelDiligenceToast: string;
  cancelDiligenceErrorToast: string;
  diligenceProgressHeading: string;
  diligenceStatusLabel: string;
  diligenceCurrentStageLabel: string;
  diligenceJobIdLabel: string;
  diligenceTokenUsageLabel: string;
  diligenceCostEstimateLabel: string;
  diligenceLastErrorLabel: string;
  diligenceNoJobMessage: string;
  diligenceJobCreatedToast: string;
  diligenceRunningToast: string;
  diligenceCompletedToast: string;
  diligenceRetryToast: string;
  diligenceRetryErrorToast: string;
  diligenceStatuses: Record<DiligenceJobStatus, string>;
  diligenceStages: Record<DiligenceStageName, string>;
  setupApiKeysMessage: string;
  setupApiKeysToast: string;
  diligenceStartToast: string;
  insightsHeading: string;
  insightsEmpty: string;
  insightsRisksHeading: string;
  insightsClaimsHeading: string;
  insightsEntitiesHeading: string;
  insightsContradictionsHeading: string;
};

type ProjectDocumentsPanelProps = {
  projectId: string;
  projectStatus: ProjectStatus;
  hasAnyApiKeys: boolean;
  apiKeyStatuses: ApiKeyStatus[];
  diligenceJob: DiligenceJobSummary | null;
  insights: DiligenceInsightsSummary | null;
  labels: ProjectDocumentsPanelLabels;
};

type UploadItemStatus = "queued" | "uploading" | "uploaded" | "failed";

type UploadItem = {
  key: string;
  filename: string;
  size: number;
  status: UploadItemStatus;
  error?: string;
};

function buildDocumentReadUrl(projectId: string, filename: string): string {
  const encodedFilename = filename
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/api/projects/${projectId}/documents/${encodedFilename}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round((bytes / 1024) * 10) / 10} KB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

function formatCurrency(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "$0.00";
  }
  return `$${value.toFixed(4)}`;
}

export function ProjectDocumentsPanel({
  projectId,
  projectStatus,
  hasAnyApiKeys,
  apiKeyStatuses,
  diligenceJob,
  insights,
  labels,
}: ProjectDocumentsPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<ProjectInspectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [deletingPaths, setDeletingPaths] = useState<string[]>([]);
  const [reprocessingPaths, setReprocessingPaths] = useState<string[]>([]);
  const [isStartingDiligence, setIsStartingDiligence] = useState(false);
  const [isRetryingDiligence, setIsRetryingDiligence] = useState(false);
  const [isCancellingDiligence, setIsCancellingDiligence] = useState(false);
  const canStartDiligence =
    projectStatus === "draft" ||
    projectStatus === "reviewed" ||
    projectStatus === "complete";

  const enabledApiProviders = apiKeyStatuses
    .filter((status) => status.isSet && status.enabled)
    .map((status) => status.provider);

  const [selectedProvider, setSelectedProvider] = useState<ApiKeyProvider | null>(
    enabledApiProviders[0] ?? null
  );

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const firstProvider = enabledApiProviders[0] ?? null;
    if (!firstProvider) {
      return "";
    }
    return (
      apiKeyStatuses.find((status) => status.provider === firstProvider)
        ?.defaultModel ?? ""
    );
  });

  const [selectedFallbackProviders, setSelectedFallbackProviders] = useState<
    ApiKeyProvider[]
  >([]);
  const resolvedSelectedProvider = selectedProvider ?? enabledApiProviders[0] ?? null;

  const documentsApiUrl = useMemo(
    () => `/api/projects/${projectId}/documents`,
    [projectId]
  );

  const loadDocuments = useCallback(async (): Promise<void> => {
    setErrorMessage(null);

    try {
      const response = await fetch(documentsApiUrl, { method: "GET" });
      if (!response.ok) {
        throw new Error(labels.loadError);
      }
      const body = (await response.json()) as { documents?: ProjectInspectDocument[] };
      setDocuments(body.documents ?? []);
    } catch {
      setErrorMessage(labels.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [documentsApiUrl, labels.loadError]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [loadDocuments]);

  async function uploadFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const batchPrefix = `${Date.now()}`;
    const filesToUpload = files.map((file, index) => ({
      key: `${batchPrefix}-${index}-${file.lastModified}-${file.size}`,
      file,
    }));
    const initialQueue: UploadItem[] = filesToUpload.map(({ file, key }) => ({
      key,
      filename: file.name,
      size: file.size,
      status: "queued",
    }));
    setUploadItems((currentItems) => [...initialQueue, ...currentItems]);

    let hasUploadFailure = false;

    try {
      for (const queuedFile of filesToUpload) {
        setUploadItems((currentItems) =>
          currentItems.map((item) =>
            item.key === queuedFile.key ? { ...item, status: "uploading" } : item
          )
        );

        const formData = new FormData();
        formData.set("file", queuedFile.file);

        const response = await fetch(documentsApiUrl, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          hasUploadFailure = true;
          setUploadItems((currentItems) =>
            currentItems.map((item) =>
              item.key === queuedFile.key
                ? {
                    ...item,
                    status: "failed",
                    error: body?.error ?? labels.uploadError,
                  }
                : item
            )
          );
          continue;
        }

        setUploadItems((currentItems) =>
          currentItems.map((item) =>
            item.key === queuedFile.key ? { ...item, status: "uploaded" } : item
          )
        );
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments();

      if (hasUploadFailure) {
        setErrorMessage(labels.uploadError);
      } else {
        // Clear completed uploads after a brief delay so user sees "uploaded" status
        setTimeout(() => {
          setUploadItems((currentItems) =>
            currentItems.filter((item) => item.status !== "uploaded")
          );
        }, 2000);
      }
    } catch {
      setErrorMessage(labels.uploadError);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteDocument(document: ProjectInspectDocument) {
    const documentUrl = buildDocumentReadUrl(projectId, document.filename);
    setDeletingPaths((currentPaths) => [...currentPaths, document.pathname]);
    setErrorMessage(null);

    try {
      const response = await fetch(documentUrl, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(labels.deleteError);
      }

      setDocuments((currentDocuments) =>
        currentDocuments.filter((item) => item.pathname !== document.pathname)
      );
    } catch {
      setErrorMessage(labels.deleteError);
    } finally {
      setDeletingPaths((currentPaths) =>
        currentPaths.filter((path) => path !== document.pathname)
      );
    }
  }

  async function handleReprocessDocument(document: ProjectInspectDocument) {
    const documentUrl = buildDocumentReadUrl(projectId, document.filename);
    setReprocessingPaths((currentPaths) => [...currentPaths, document.pathname]);
    setErrorMessage(null);

    try {
      const response = await fetch(documentUrl, { method: "PATCH" });
      if (!response.ok) {
        throw new Error(labels.reprocessError);
      }

      setDocuments((currentDocuments) =>
        currentDocuments.map((item) =>
          item.pathname === document.pathname
            ? {
                ...item,
                processingStatus: "QUEUED",
                processingError: null,
                reprocessCount: item.reprocessCount + 1,
              }
            : item
        )
      );
      toast.success(labels.reprocessInProgress);
      router.refresh();
    } catch {
      setErrorMessage(labels.reprocessError);
    } finally {
      setReprocessingPaths((currentPaths) =>
        currentPaths.filter((path) => path !== document.pathname)
      );
    }
  }

  const uploadStatusText: Record<UploadItemStatus, string> = {
    queued: labels.uploadStatusQueued,
    uploading: labels.uploadStatusUploading,
    uploaded: labels.uploadStatusUploaded,
    failed: labels.uploadStatusFailed,
  };

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files);
    void uploadFiles(droppedFiles);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const pickedFiles = Array.from(event.target.files ?? []);
    void uploadFiles(pickedFiles);
  }

  async function handleBeDiligent() {
    if (!hasAnyApiKeys) {
      toast.warning(labels.setupApiKeysToast);
      window.open("/settings", "_blank", "noopener,noreferrer");
      return;
    }
    if (!canStartDiligence) {
      return;
    }

    if (!resolvedSelectedProvider) {
      toast.danger(labels.setupApiKeysMessage);
      return;
    }

    setIsStartingDiligence(true);
    try {
      const result = await startProjectDueDiligence(projectId, {
        selectedProvider: resolvedSelectedProvider,
        selectedModel,
        fallbackProviders: selectedFallbackProviders,
      });
      if (result.error) {
        toast.danger(result.error);
        return;
      }
      toast.success(labels.diligenceJobCreatedToast);
      toast.success(labels.diligenceStartToast);
    } finally {
      setIsStartingDiligence(false);
    }
  }

  async function handleRetryDiligence() {
    if (!diligenceJob) {
      return;
    }

    setIsRetryingDiligence(true);
    try {
      const result = await retryProjectDueDiligence(diligenceJob.id);
      if (result.error) {
        toast.danger(result.error || labels.diligenceRetryErrorToast);
        return;
      }
      toast.success(labels.diligenceRetryToast);
    } finally {
      setIsRetryingDiligence(false);
    }
  }

  async function handleCancelDiligence() {
    if (!diligenceJob) {
      return;
    }
    if (!window.confirm(labels.cancelDiligenceConfirm)) {
      return;
    }

    setIsCancellingDiligence(true);
    try {
      const result = await cancelProjectDueDiligence(diligenceJob.id);
      if (result.error) {
        toast.danger(result.error || labels.cancelDiligenceErrorToast);
        return;
      }
      toast.success(labels.cancelDiligenceToast);
    } finally {
      setIsCancellingDiligence(false);
    }
  }

  function handleProviderChange(provider: ApiKeyProvider) {
    setSelectedProvider(provider);
    setSelectedFallbackProviders((currentFallbacks) =>
      currentFallbacks.filter((value) => value !== provider)
    );

    const providerModel = apiKeyStatuses.find(
      (status) => status.provider === provider
    )?.defaultModel;
    if (providerModel) {
      setSelectedModel(providerModel);
    }
  }

  function toggleFallbackProvider(provider: ApiKeyProvider) {
    setSelectedFallbackProviders((currentFallbacks) => {
      if (currentFallbacks.includes(provider)) {
        return currentFallbacks.filter((value) => value !== provider);
      }
      return [...currentFallbacks, provider];
    });
  }

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-xl border border-divider bg-content1 p-6">
        <h2 className="text-lg font-semibold text-foreground">
          {labels.documentsHeading}
        </h2>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-divider bg-background"
          }`}
        >
          <p className="text-sm font-medium text-foreground">{labels.dropzoneTitle}</p>
          <p className="mt-1 text-xs text-foreground/70">{labels.dropzoneHint}</p>
          {isUploading && (
            <p className="mt-3 text-xs font-medium text-warning">
              {labels.uploadInProgress}
            </p>
          )}
          <label
            htmlFor="files"
            className="mt-4 inline-block cursor-pointer rounded-md border border-divider bg-content1 px-3 py-2 text-xs font-medium text-foreground hover:bg-content2"
          >
            {labels.fileInputLabel}
          </label>
          <input
            ref={fileInputRef}
            id="files"
            name="files"
            type="file"
            multiple
            accept=".txt,.docx,.pages,.pdf,.ppt,.pptx,.key,.keynote"
            onChange={handleInputChange}
            className="sr-only"
          />
        </div>

        {uploadItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {labels.uploadQueueHeading}
            </p>
            <ul className="space-y-2">
              {uploadItems.map((item) => (
                <li
                  key={item.key}
                  className="rounded-md border border-divider bg-background px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.filename}</p>
                      <p className="text-xs text-foreground/60">{formatSize(item.size)}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        item.status === "uploaded"
                          ? "bg-success/15 text-success"
                          : item.status === "failed"
                            ? "bg-danger/15 text-danger"
                            : item.status === "uploading"
                              ? "bg-warning/15 text-warning"
                              : "bg-content2 text-foreground/80"
                      }`}
                    >
                      {uploadStatusText[item.status]}
                    </span>
                  </div>
                  {item.error && (
                    <p className="mt-2 text-xs text-danger">{item.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {errorMessage && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p className="text-sm text-foreground/70">{labels.loadingDocuments}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-foreground/70">{labels.emptyDocuments}</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => (
              <li
                key={document.pathname}
                className="flex items-center justify-between rounded-md border border-divider bg-background px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {document.filename}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-xs text-foreground/60">
                      {formatSize(document.size)}
                    </p>
                    <span className="text-xs text-foreground/50">
                      {labels.fileStatusLabel}:
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        document.processingStatus === "PROCESSED"
                          ? "bg-success/15 text-success"
                          : document.processingStatus === "FAILED"
                            ? "bg-danger/15 text-danger"
                            : document.processingStatus === "PROCESSING"
                              ? "bg-warning/15 text-warning"
                              : "bg-content2 text-foreground/80"
                      }`}
                    >
                      {labels.fileProcessingStatuses[document.processingStatus]}
                    </span>
                  </div>
                  {document.processingError && (
                    <p className="mt-1 text-xs text-danger">{document.processingError}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href={buildDocumentReadUrl(projectId, document.filename)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {labels.viewFileCta}
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleReprocessDocument(document)}
                    disabled={reprocessingPaths.includes(document.pathname)}
                    className="text-xs font-medium text-warning hover:underline disabled:opacity-50"
                  >
                    {reprocessingPaths.includes(document.pathname)
                      ? labels.reprocessInProgress
                      : labels.reprocessFileCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDocument(document)}
                    disabled={deletingPaths.includes(document.pathname)}
                    className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                  >
                    {deletingPaths.includes(document.pathname)
                      ? labels.deleteInProgress
                      : labels.deleteFileCta}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {documents.length > 0 && canStartDiligence && enabledApiProviders.length > 0 && (
        <section className="space-y-3 rounded-xl border border-divider bg-content1 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-foreground/70">{labels.providerSelectionLabel}</span>
              <select
                value={resolvedSelectedProvider ?? ""}
                onChange={(event) =>
                  handleProviderChange(event.target.value as ApiKeyProvider)
                }
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground"
              >
                {enabledApiProviders.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-foreground/70">{labels.modelInputLabel}</span>
              <input
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                placeholder={labels.modelInputPlaceholder}
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground"
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-foreground/70">{labels.fallbackProvidersLabel}</p>
            <div className="flex flex-wrap gap-2">
              {enabledApiProviders
                .filter((provider) => provider !== resolvedSelectedProvider)
                .map((provider) => (
                  <label
                    key={provider}
                    className="flex items-center gap-2 rounded-md border border-divider bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFallbackProviders.includes(provider)}
                      onChange={() => toggleFallbackProvider(provider)}
                    />
                    <span>{provider}</span>
                  </label>
                ))}
            </div>
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleBeDiligent()}
            disabled={isStartingDiligence || !canStartDiligence}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-60 ${
              hasAnyApiKeys
                ? "bg-success/20 text-success hover:opacity-90"
                : "bg-warning/20 text-warning hover:opacity-90"
            }`}
          >
            <LuCirclePlay aria-hidden="true" className="size-4" />
            {labels.beDiligentCta}
          </button>
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-divider bg-content1 p-4">
        <div className="flex items-center gap-2">
          <LuBot aria-hidden="true" className="size-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            {labels.diligenceProgressHeading}
          </h3>
        </div>

        {!diligenceJob ? (
          <p className="text-sm text-foreground/70">{labels.diligenceNoJobMessage}</p>
        ) : (
          <>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p className="text-foreground/70">
                {labels.diligenceStatusLabel}: {labels.diligenceStatuses[diligenceJob.status]}
              </p>
              <p className="text-foreground/70">
                {labels.diligenceCurrentStageLabel}: {diligenceJob.currentStage ? labels.diligenceStages[diligenceJob.currentStage] : "-"}
              </p>
              <p className="text-foreground/70">
                {labels.diligenceJobIdLabel}: <span className="font-mono">{diligenceJob.id}</span>
              </p>
              <p className="text-foreground/70">
                {labels.diligenceTokenUsageLabel}: {diligenceJob.tokenUsageTotal}
              </p>
              <p className="text-foreground/70">
                {labels.diligenceCostEstimateLabel}: {formatCurrency(diligenceJob.estimatedCostUsd)}
              </p>
            </div>

            {diligenceJob.errorMessage && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {labels.diligenceLastErrorLabel}: {diligenceJob.errorMessage}
              </p>
            )}

            <div className="h-2 overflow-hidden rounded-full bg-content2">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${diligenceJob.progressPercent}%` }}
              />
            </div>

            {diligenceJob.stageRuns.length > 0 && (
              <ul className="space-y-1">
                {diligenceJob.stageRuns.map((stageRun) => (
                  <li
                    key={stageRun.stage}
                    className="flex items-center justify-between rounded-md border border-divider bg-background px-2.5 py-1.5 text-xs"
                  >
                    <span className="text-foreground">
                      {labels.diligenceStages[stageRun.stage]}
                    </span>
                    <span className="text-foreground/70">{stageRun.status}</span>
                  </li>
                ))}
              </ul>
            )}

            {(diligenceJob.status === "FAILED" ||
              diligenceJob.status === "WAITING_INPUT" ||
              diligenceJob.status === "RUNNING" ||
              diligenceJob.status === "QUEUED") && (
              <div className="flex justify-end gap-2">
                {(diligenceJob.status === "FAILED" ||
                  diligenceJob.status === "WAITING_INPUT") && (
                  <button
                    type="button"
                    onClick={() => void handleRetryDiligence()}
                    disabled={isRetryingDiligence}
                    className="inline-flex items-center gap-2 rounded-md bg-primary/15 px-3 py-2 text-sm font-medium text-primary hover:opacity-90 disabled:opacity-60"
                  >
                    <LuRefreshCw
                      aria-hidden="true"
                      className={`size-4 ${isRetryingDiligence ? "animate-spin" : ""}`}
                    />
                    {labels.retryDiligenceCta}
                  </button>
                )}
                {(diligenceJob.status === "RUNNING" ||
                  diligenceJob.status === "QUEUED") && (
                  <button
                    type="button"
                    onClick={() => void handleCancelDiligence()}
                    disabled={isCancellingDiligence}
                    className="inline-flex items-center gap-2 rounded-md bg-danger/15 px-3 py-2 text-sm font-medium text-danger hover:opacity-90 disabled:opacity-60"
                  >
                    {labels.cancelDiligenceCta}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {(projectStatus === "reviewed" || projectStatus === "complete") && (
        <section className="space-y-4 rounded-xl border border-divider bg-content1 p-4">
          <h3 className="text-base font-semibold text-foreground">
            {labels.insightsHeading}
          </h3>

          {!insights ? (
            <p className="text-sm text-foreground/70">{labels.insightsEmpty}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {labels.insightsRisksHeading}
                </h4>
                {insights.risks.length === 0 ? (
                  <p className="text-xs text-foreground/60">{labels.insightsEmpty}</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.risks.map((risk) => (
                      <li
                        key={risk.id}
                        className="rounded-md border border-divider bg-background px-2.5 py-2"
                      >
                        <p className="text-xs font-medium text-foreground">{risk.title}</p>
                        <p className="mt-1 text-xs text-foreground/70">{risk.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {labels.insightsClaimsHeading}
                </h4>
                {insights.claims.length === 0 ? (
                  <p className="text-xs text-foreground/60">{labels.insightsEmpty}</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.claims.map((claim) => (
                      <li
                        key={claim.id}
                        className="rounded-md border border-divider bg-background px-2.5 py-2 text-xs text-foreground"
                      >
                        {claim.claimText}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {labels.insightsEntitiesHeading}
                </h4>
                {insights.entities.length === 0 ? (
                  <p className="text-xs text-foreground/60">{labels.insightsEmpty}</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.entities.map((entity) => (
                      <li
                        key={entity.id}
                        className="rounded-md border border-divider bg-background px-2.5 py-2 text-xs text-foreground"
                      >
                        {entity.name} ({entity.kind})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {labels.insightsContradictionsHeading}
                </h4>
                {insights.contradictions.length === 0 ? (
                  <p className="text-xs text-foreground/60">{labels.insightsEmpty}</p>
                ) : (
                  <ul className="space-y-1">
                    {insights.contradictions.map((contradiction) => (
                      <li
                        key={contradiction.id}
                        className="rounded-md border border-divider bg-background px-2.5 py-2"
                      >
                        <p className="text-xs text-foreground">
                          {contradiction.statementA}
                        </p>
                        <p className="mt-1 text-xs text-danger">
                          {contradiction.statementB}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
