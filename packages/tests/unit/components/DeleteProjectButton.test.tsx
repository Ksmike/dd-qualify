import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockDeleteProject = vi.fn().mockResolvedValue({});
vi.mock("@/lib/actions/project", () => ({
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
}));

const mockToast = { success: vi.fn(), danger: vi.fn() };
vi.mock("@heroui/react", () => ({
  toast: mockToast,
}));

const { DeleteProjectButton } = await import(
  "@/app/(app)/project/[id]/DeleteProjectButton"
);

const mockLabels = {
  deleteProjectCta: "Delete Project",
  deleteProjectConfirm: "Are you sure?",
  deleteProjectInProgress: "Deleting...",
  deleteProjectSuccessToast: "Project deleted",
  deleteProjectErrorToast: "Failed to delete",
};

describe("DeleteProjectButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href assignment
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("renders delete button", () => {
    render(<DeleteProjectButton projectId="proj-123" labels={mockLabels} />);

    expect(screen.getByRole("button", { name: "Delete Project" })).toBeInTheDocument();
  });

  it("deletes project after confirmation", async () => {
    mockDeleteProject.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<DeleteProjectButton projectId="proj-123" labels={mockLabels} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith("proj-123");
      expect(mockToast.success).toHaveBeenCalledWith("Project deleted");
      expect(window.location.href).toBe("/dashboard");
    });
  });

  it("does not delete when confirmation is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<DeleteProjectButton projectId="proj-123" labels={mockLabels} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    expect(mockDeleteProject).not.toHaveBeenCalled();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteProject.mockResolvedValue({ error: "Permission denied" });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<DeleteProjectButton projectId="proj-123" labels={mockLabels} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    await waitFor(() => {
      expect(mockToast.danger).toHaveBeenCalledWith("Permission denied");
    });
  });
});
