import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectDocumentsPanel } from "@/app/(app)/project/[id]/ProjectDocumentsPanel";
import { toast } from "@heroui/react";

vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual<typeof import("@heroui/react")>(
    "@heroui/react"
  );
  return {
    ...actual,
    toast: {
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

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
  beDiligentCta: "Be Diligent",
  setupApiKeysMessage: "Add at least one API key in Settings to run due diligence.",
  setupApiKeysToast: "No API keys found. Opening Settings in a new tab.",
  diligenceStartToast: "Due diligence workflow start is coming next.",
};

describe("ProjectDocumentsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders existing documents", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          documents: [
            {
              filename: "report.pdf",
              pathname: "user-1/project-1/report.pdf",
              size: 2048,
              uploadedAt: "2026-05-06T00:00:00.000Z",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        hasAnyApiKeys={true}
        labels={labels}
      />
    );

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/api/projects/project-1/documents/report.pdf"
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("uploads files automatically after file selection", async () => {
    let hasUploaded = false;
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit): Promise<Response> => {
        if (init?.method === "POST") {
          hasUploaded = true;
          return {
            ok: true,
            json: async () => ({}),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            documents: hasUploaded
              ? [
                  {
                    filename: "evidence.txt",
                    pathname: "user-1/project-1/evidence.txt",
                    size: 24,
                    uploadedAt: "2026-05-06T00:00:00.000Z",
                  },
                ]
              : [],
          }),
        } as Response;
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        hasAnyApiKeys={true}
        labels={labels}
      />
    );

    const input = await screen.findByLabelText("Upload files");
    await user.upload(input, new File(["hello"], "evidence.txt", { type: "text/plain" }));

    expect(await screen.findByText("Upload progress")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-1/documents", {
        method: "POST",
        body: expect.any(FormData),
      });
    });
    expect(screen.getByText("uploaded")).toBeInTheDocument();
    expect((await screen.findAllByText("evidence.txt")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/api/projects/project-1/documents/evidence.txt"
    );
  });

  it("uploads files automatically on drop", async () => {
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit): Promise<Response> => {
        if (init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({}),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ documents: [] }),
        } as Response;
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        hasAnyApiKeys={true}
        labels={labels}
      />
    );

    const droppedFile = new File(["dragged"], "dragged.pdf", {
      type: "application/pdf",
    });
    const dropzoneText = await screen.findByText("Drag and drop files to upload");
    const dropzone = dropzoneText.closest("div");
    expect(dropzone).not.toBeNull();

    fireEvent.drop(dropzone as Element, {
      dataTransfer: {
        files: [droppedFile],
      },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-1/documents", {
        method: "POST",
        body: expect.any(FormData),
      });
    });
  });

  it("deletes a document from the list", async () => {
    let documents = [
      {
        filename: "report.pdf",
        pathname: "user-1/project-1/report.pdf",
        size: 2048,
        uploadedAt: "2026-05-06T00:00:00.000Z",
      },
    ];
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit): Promise<Response> => {
        if (init?.method === "DELETE") {
          documents = [];
          return {
            ok: true,
            json: async () => ({ deleted: true }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ documents }),
        } as Response;
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        hasAnyApiKeys={true}
        labels={labels}
      />
    );

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/project-1/documents/report.pdf",
        { method: "DELETE" }
      );
    });
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("routes users without API keys to settings in a new tab", async () => {
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: [
          {
            filename: "report.pdf",
            pathname: "user-1/project-1/report.pdf",
            size: 2048,
            uploadedAt: "2026-05-06T00:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(
      <ProjectDocumentsPanel
        projectId="project-1"
        hasAnyApiKeys={false}
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
});
