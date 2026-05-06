import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockProjectModel = {
  countByUserId: vi.fn(),
  createForUser: vi.fn(),
  updateStatusForUser: vi.fn(),
};
vi.mock("@/lib/models/ProjectModel", () => ({
  ProjectModel: mockProjectModel,
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

const mockRedirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>(
    "next/navigation"
  );
  return {
    ...actual,
    redirect: mockRedirect,
  };
});

const { createProject, startProjectDueDiligence } = await import(
  "@/lib/actions/project"
);

function buildFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      createProject(buildFormData({ name: "Project A" }))
    ).rejects.toThrow("REDIRECT:/login?callbackUrl=/projects/new");
  });

  it("redirects back to create page when name is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(createProject(buildFormData({ name: "   " }))).rejects.toThrow(
      "REDIRECT:/projects/new"
    );
    expect(mockProjectModel.createForUser).not.toHaveBeenCalled();
  });

  it("creates project and redirects to dashboard", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockProjectModel.createForUser.mockResolvedValue({
      id: "project-1",
      name: "Project A",
      userId: "user-1",
    });

    await expect(
      createProject(buildFormData({ name: "  Project A  " }))
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(mockProjectModel.createForUser).toHaveBeenCalledWith({
      name: "Project A",
      userId: "user-1",
    });
  });
});

describe("startProjectDueDiligence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await startProjectDueDiligence("project-1");
    expect(result).toEqual({ error: "Not authenticated." });
  });

  it("returns error when project is not found for user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockProjectModel.updateStatusForUser.mockResolvedValue(false);

    const result = await startProjectDueDiligence("project-1");
    expect(result).toEqual({ error: "Project not found." });
  });

  it("updates project status to inprogress and revalidates pages", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockProjectModel.updateStatusForUser.mockResolvedValue(true);

    const result = await startProjectDueDiligence("project-1");
    expect(result).toEqual({});
    expect(mockProjectModel.updateStatusForUser).toHaveBeenCalledWith({
      projectId: "project-1",
      userId: "user-1",
      status: "inprogress",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/project/project-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
