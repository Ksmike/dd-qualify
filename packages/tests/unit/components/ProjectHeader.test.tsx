import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/utils/copyToClipboard", () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/actions/project", () => ({
  deleteProject: vi.fn().mockResolvedValue({}),
}));

vi.mock("@heroui/react", () => ({
  toast: {
    success: vi.fn(),
    danger: vi.fn(),
  },
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
});
