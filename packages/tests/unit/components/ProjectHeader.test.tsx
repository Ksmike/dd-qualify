import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockCopyToClipboard = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/utils/copyToClipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

const mockDeleteProject = vi.fn().mockResolvedValue({});
vi.mock("@/lib/actions/project", () => ({
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
}));

const mockToast = { success: vi.fn(), danger: vi.fn() };
vi.mock("@heroui/react", () => ({
  toast: mockToast,
}));

const { ProjectHeader } = await import(
  "@/app/(app)/project/[id]/ProjectHeader"
);

const mockLabels = {
  heading: "Project Overview",
  statusLabel: "Status:",
  createdLabel: "Created",
  idLabel: "ID",
  copyIdAriaLabel: "Copy project ID",
  copySuccessToast: "Copied!",
  copyErrorToast: "Failed to copy",
  deleteProjectCta: "Delete Project",
  deleteProjectConfirm: "Are you sure?",
  deleteProjectInProgress: "Deleting...",
  deleteProjectSuccessToast: "Project deleted",
  deleteProjectErrorToast: "Failed to delete",
};

describe("ProjectHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders project name and heading", () => {
    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    expect(screen.getByText("Project Overview")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders project status badge", () => {
    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="inprogress"
        projectStatusLabel="In Progress"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders created date", () => {
    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="complete"
        projectStatusLabel="Complete"
        createdAtLabel="June 15, 2024"
        labels={mockLabels}
      />
    );

    expect(screen.getByText("June 15, 2024")).toBeInTheDocument();
  });

  it("renders project ID", () => {
    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    expect(screen.getByText("proj-123")).toBeInTheDocument();
  });

  it("renders delete button", () => {
    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    expect(
      screen.getByRole("button", { name: "Delete Project" })
    ).toBeInTheDocument();
  });

  it("renders copy ID button with aria label", () => {
    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    expect(
      screen.getByRole("button", { name: "Copy project ID" })
    ).toBeInTheDocument();
  });

  it("copies project ID and shows success toast", async () => {
    mockCopyToClipboard.mockResolvedValue(true);

    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy project ID" }));

    await waitFor(() => {
      expect(mockCopyToClipboard).toHaveBeenCalledWith("proj-123");
      expect(mockToast.success).toHaveBeenCalledWith("Copied!");
    });
  });

  it("shows error toast when copy fails", async () => {
    mockCopyToClipboard.mockResolvedValue(false);

    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy project ID" }));

    await waitFor(() => {
      expect(mockToast.danger).toHaveBeenCalledWith("Failed to copy");
    });
  });

  it("deletes project after confirmation", async () => {
    mockDeleteProject.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    await waitFor(() => {
      expect(mockDeleteProject).toHaveBeenCalledWith("proj-123");
      expect(mockToast.success).toHaveBeenCalledWith("Project deleted");
    });
  });

  it("does not delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    expect(mockDeleteProject).not.toHaveBeenCalled();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteProject.mockResolvedValue({ error: "Permission denied" });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <ProjectHeader
        projectName="Acme Corp"
        projectId="proj-123"
        projectStatus="draft"
        projectStatusLabel="Draft"
        createdAtLabel="Jan 1, 2024"
        labels={mockLabels}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete Project" }));

    await waitFor(() => {
      expect(mockToast.danger).toHaveBeenCalledWith("Permission denied");
    });
  });
});
