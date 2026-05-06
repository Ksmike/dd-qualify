import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/labels/types", () => ({}));

const { ReportDetailView } = await import(
  "@/app/(app)/project/[id]/report/[reportId]/ReportDetailView"
);

const mockLabels = {
  heading: "Reports",
  description: "Generated reports and artifacts",
  empty: "No reports available yet.",
  tableHeadType: "Type",
  tableHeadStage: "Stage",
  tableHeadFormat: "Format",
  tableHeadSize: "Size",
  tableHeadDate: "Date",
  tableHeadJobStatus: "Job Status",
  tableHeadActions: "Actions",
  viewCta: "View",
  artifactTypes: {
    GENERATED_REPORT: "Generated Report",
    EXPORT_BUNDLE: "Export Bundle",
    EVIDENCE_MAP: "Evidence Map",
  },
};

const baseArtifact = {
  id: "art-1",
  type: "GENERATED_REPORT",
  stage: "FINAL_REPORT",
  storageProvider: "VERCEL_BLOB",
  storageKey: "reports/art-1.pdf",
  mimeType: "application/pdf",
  sizeBytes: 4096,
  metadata: null,
  createdAt: new Date("2024-06-15"),
  job: {
    id: "job-1",
    status: "COMPLETED",
    selectedProvider: "OPENAI",
    selectedModel: "gpt-4o-mini",
    tokenUsageTotal: 8000,
    estimatedCostUsd: 0.0234,
    completedAt: new Date("2024-06-15"),
  },
};

describe("ReportDetailView", () => {
  it("renders artifact type name and project name", () => {
    const { container } = render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={baseArtifact}
        labels={mockLabels}
      />
    );

    expect(screen.getByText("Generated Report")).toBeInTheDocument();
    expect(container.textContent).toContain("Acme Corp");
  });

  it("renders metadata grid with job details", () => {
    render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={baseArtifact}
        labels={mockLabels}
      />
    );

    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.getByText("4.0 KB")).toBeInTheDocument();
    expect(screen.getByText("OPENAI")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
    expect(screen.getByText("8,000")).toBeInTheDocument();
    expect(screen.getByText(/0\.0234/)).toBeInTheDocument();
    expect(screen.getByText("vercel blob")).toBeInTheDocument();
  });

  it("renders back link to reports page", () => {
    render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={baseArtifact}
        labels={mockLabels}
      />
    );

    const backLink = screen.getByText("Back to reports").closest("a");
    expect(backLink).toHaveAttribute("href", "/project/project-1/report");
  });

  it("renders executive summary when metadata has summary", () => {
    const artifact = {
      ...baseArtifact,
      metadata: {
        summary: "This is the executive summary of the report.",
      },
    };

    render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={artifact}
        labels={mockLabels}
      />
    );

    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(
      screen.getByText("This is the executive summary of the report.")
    ).toBeInTheDocument();
  });

  it("renders report items when metadata has items", () => {
    const artifact = {
      ...baseArtifact,
      metadata: {
        items: [
          { title: "Section 1", content: "Content of section 1" },
          { section: "Section 2", content: "Content of section 2" },
        ],
      },
    };

    render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={artifact}
        labels={mockLabels}
      />
    );

    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Content of section 1")).toBeInTheDocument();
    expect(screen.getByText("Section 2")).toBeInTheDocument();
    expect(screen.getByText("Content of section 2")).toBeInTheDocument();
  });

  it("renders raw metadata when metadata is non-null but not structured", () => {
    const artifact = {
      ...baseArtifact,
      metadata: { custom: "value" },
    };

    render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={artifact}
        labels={mockLabels}
      />
    );

    // No summary or items, so raw metadata is shown
    expect(screen.queryByText("Executive Summary")).not.toBeInTheDocument();
  });

  it("renders without stage in subtitle when stage is null", () => {
    const artifact = {
      ...baseArtifact,
      stage: null,
    };

    render(
      <ReportDetailView
        projectId="project-1"
        projectName="Acme Corp"
        artifact={artifact}
        labels={mockLabels}
      />
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
