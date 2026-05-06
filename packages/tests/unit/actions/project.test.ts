import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

const mockProjectModel = {
  countByUserId: vi.fn(),
  createForUser: vi.fn(),
};
vi.mock("@/lib/models/ProjectModel", () => ({
  ProjectModel: mockProjectModel,
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

const { createProject } = await import("@/lib/actions/project");

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
