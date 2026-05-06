import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/labels/types", () => ({}));

const { ReportsView } = await import(
  "@/app/(app)/project/[id]/report/ReportsView"
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

describe("ReportsView", () => {
  it("renders empty state when reports array is empty", () => {
    render(
      <ReportsView
        projectId="project-1"
        projectName="Acme"
        labels={mockLabels}
        reports={[]}
      />
    );

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("No reports available yet.")).toBeInTheDocument();
  });

  it("renders reports table when reports exist", () => {
    const reports = [
      {
        id: "art-1",
        jobId: "job-1",
        stage: "FINAL_REPORT",
        type: "GENERATED_REPORT",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        createdAt: new Date("2024-06-15"),
        jobStatus: "COMPLETED",
        jobCompletedAt: new Date("2024-06-15"),
      },
    ];

    render(
      <ReportsView
        projectId="project-1"
        projectName="Acme"
        labels={mockLabels}
        reports={reports}
      />
    );

    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Acme — Generated reports and artifacts")).toBeInTheDocument();
    expect(screen.getByText("Generated Report")).toBeInTheDocument();
    expect(screen.getByText("final report generation")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("renders multiple reports", () => {
    const reports = [
      {
        id: "art-1",
        jobId: "job-1",
        stage: null,
        type: "GENERATED_REPORT",
        mimeType: "text/html",
        sizeBytes: 512,
        createdAt: new Date("2024-06-15"),
        jobStatus: "COMPLETED",
        jobCompletedAt: new Date("2024-06-15"),
      },
      {
        id: "art-2",
        jobId: "job-1",
        stage: null,
        type: "EXPORT_BUNDLE",
        mimeType: "application/zip",
        sizeBytes: 1048576,
        createdAt: new Date("2024-06-16"),
        jobStatus: "COMPLETED",
        jobCompletedAt: new Date("2024-06-16"),
      },
    ];

    render(
      <ReportsView
        projectId="project-1"
        projectName="Acme"
        labels={mockLabels}
        reports={reports}
      />
    );

    expect(screen.getByText("Generated Report")).toBeInTheDocument();
    expect(screen.getByText("Export Bundle")).toBeInTheDocument();
    expect(screen.getByText("1.0 MB")).toBeInTheDocument();
  });

  it("renders view links with correct href", () => {
    const reports = [
      {
        id: "art-1",
        jobId: "job-1",
        stage: null,
        type: "GENERATED_REPORT",
        mimeType: null,
        sizeBytes: null,
        createdAt: new Date("2024-06-15"),
        jobStatus: "COMPLETED",
        jobCompletedAt: null,
      },
    ];

    render(
      <ReportsView
        projectId="project-1"
        projectName="Acme"
        labels={mockLabels}
        reports={reports}
      />
    );

    const viewLink = screen.getByText("View").closest("a");
    expect(viewLink).toHaveAttribute("href", "/project/project-1/report/art-1");
  });

  it("shows dash for null size and mimeType", () => {
    const reports = [
      {
        id: "art-1",
        jobId: "job-1",
        stage: null,
        type: "EVIDENCE_MAP",
        mimeType: null,
        sizeBytes: null,
        createdAt: new Date("2024-06-15"),
        jobStatus: "RUNNING",
        jobCompletedAt: null,
      },
    ];

    render(
      <ReportsView
        projectId="project-1"
        projectName="Acme"
        labels={mockLabels}
        reports={reports}
      />
    );

    expect(screen.getByText("Evidence Map")).toBeInTheDocument();
    // Dashes for null values
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
