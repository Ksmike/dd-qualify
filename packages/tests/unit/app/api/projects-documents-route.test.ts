import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const putMock = vi.fn();
const listMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@vercel/blob", () => ({
  put: putMock,
  list: listMock,
}));

describe("projects documents API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a supported private document into user/project path", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    putMock.mockResolvedValue({
      pathname: "user-1/project-1/report.pdf",
      url: "https://blob.local/private-url",
      downloadUrl: "https://blob.local/private-url?download=1",
    });

    const route = await import("@/app/api/projects/[projectId]/documents/route");

    const formData = new FormData();
    formData.set(
      "file",
      new File(["file body"], "report.pdf", { type: "application/pdf" })
    );

    const response = await route.POST(
      {
        formData: async () => formData,
      } as unknown as Request,
      { params: Promise.resolve({ projectId: "project-1" }) }
    );

    expect(response.status).toBe(201);
    expect(putMock).toHaveBeenCalledWith(
      "user-1/project-1/report.pdf",
      expect.any(File),
      expect.objectContaining({
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
      })
    );

    const body = await response.json();
    expect(body.document.pathname).toBe("user-1/project-1/report.pdf");
  });

  it("uploads a supported PowerPoint document", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    putMock.mockResolvedValue({
      pathname: "user-1/project-1/investor-deck.pptx",
      url: "https://blob.local/private-url",
      downloadUrl: "https://blob.local/private-url?download=1",
    });

    const route = await import("@/app/api/projects/[projectId]/documents/route");

    const formData = new FormData();
    formData.set(
      "file",
      new File(["pptx body"], "investor-deck.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      })
    );

    const response = await route.POST(
      {
        formData: async () => formData,
      } as unknown as Request,
      { params: Promise.resolve({ projectId: "project-1" }) }
    );

    expect(response.status).toBe(201);
    expect(putMock).toHaveBeenCalledWith(
      "user-1/project-1/investor-deck.pptx",
      expect.any(File),
      expect.objectContaining({
        access: "private",
      })
    );
  });

  it("rejects unsupported extensions", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    const route = await import("@/app/api/projects/[projectId]/documents/route");

    const formData = new FormData();
    formData.set(
      "file",
      new File(["file body"], "script.exe", {
        type: "application/octet-stream",
      })
    );

    const response = await route.POST(
      {
        formData: async () => formData,
      } as unknown as Request,
      { params: Promise.resolve({ projectId: "project-1" }) }
    );

    expect(response.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    const route = await import("@/app/api/projects/[projectId]/documents/route");

    const response = await route.GET(
      new Request("http://localhost/api/projects/project-1/documents"),
      { params: Promise.resolve({ projectId: "project-1" }) }
    );

    expect(response.status).toBe(401);
  });

  it("lists private project documents scoped by user/project prefix", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    listMock.mockResolvedValue({
      blobs: [
        {
          pathname: "user-1/project-1/folder/report.pdf",
          size: 42,
          uploadedAt: new Date("2026-05-06T00:00:00.000Z"),
          url: "https://blob.local/private-url",
          downloadUrl: "https://blob.local/private-url?download=1",
          etag: "blob-etag",
        },
      ],
      cursor: undefined,
      hasMore: false,
    });

    const route = await import("@/app/api/projects/[projectId]/documents/route");
    const response = await route.GET(
      new Request("http://localhost/api/projects/project-1/documents"),
      { params: Promise.resolve({ projectId: "project-1" }) }
    );

    expect(response.status).toBe(200);
    expect(listMock).toHaveBeenCalledWith({ prefix: "user-1/project-1/" });

    const body = await response.json();
    expect(body.documents).toEqual([
      expect.objectContaining({
        filename: "folder/report.pdf",
        pathname: "user-1/project-1/folder/report.pdf",
      }),
    ]);
  });
});
