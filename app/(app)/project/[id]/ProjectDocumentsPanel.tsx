"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ProjectInspectDocument = {
  filename: string;
  pathname: string;
  size: number;
  uploadedAt: string;
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
};

type ProjectDocumentsPanelProps = {
  projectId: string;
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

export function ProjectDocumentsPanel({
  projectId,
  labels,
}: ProjectDocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<ProjectInspectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [deletingPaths, setDeletingPaths] = useState<string[]>([]);

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

  return (
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
                <p className="text-xs text-foreground/60">
                  {formatSize(document.size)}
                </p>
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
  );
}
