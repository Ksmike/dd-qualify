import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/labels/types", () => ({}));

const { InsightsView } = await import(
  "@/app/(app)/project/[id]/insights/InsightsView"
);

const mockLabels = {
  heading: "Insights",
  description: "Analysis results",
  empty: "No insights available yet.",
  jobInfoHeading: "Job Information",
  providerLabel: "Provider",
  modelLabel: "Model",
  tokensLabel: "Tokens",
  costLabel: "Cost",
  createdLabel: "Created",
  completedLabel: "Completed",
  statusLabel: "Status",
  typeLabel: "Type",
  confidenceLabel: "Confidence",
  stagesHeading: "Pipeline Stages",
  findingsHeading: "Findings",
  claimsHeading: "Claims",
  entitiesHeading: "Entities",
  contradictionsHeading: "Contradictions",
  findingTypes: {
    RISK: "Risk",
    OPPORTUNITY: "Opportunity",
    WARNING: "Warning",
    OBSERVATION: "Observation",
  },
  claimStatuses: {
    SUPPORTED: "Supported",
    CONTRADICTED: "Contradicted",
    INCONCLUSIVE: "Inconclusive",
  },
};

describe("InsightsView", () => {
  it("renders empty state when data is null", () => {
    render(
      <InsightsView projectName="Acme" labels={mockLabels} data={null} />
    );

    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("No insights available yet.")).toBeInTheDocument();
  });

  it("renders job information when data is provided", () => {
    const data = {
      job: {
        id: "job-1",
        status: "COMPLETED",
        selectedProvider: "OPENAI",
        selectedModel: "gpt-4o-mini",
        tokenUsageTotal: 5000,
        estimatedCostUsd: 0.0123,
        createdAt: new Date("2024-01-01"),
        completedAt: new Date("2024-01-02"),
      },
      findings: [],
      claims: [],
      entities: [],
      contradictions: [],
      stageRuns: [],
    };

    render(
      <InsightsView projectName="Acme" labels={mockLabels} data={data} />
    );

    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("Acme — Analysis results")).toBeInTheDocument();
    expect(screen.getByText("Job Information")).toBeInTheDocument();
    expect(screen.getByText("OPENAI")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o-mini")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
  });

  it("renders findings section when findings exist", () => {
    const data = {
      job: {
        id: "job-1",
        status: "COMPLETED",
        selectedProvider: "OPENAI",
        selectedModel: "gpt-4o-mini",
        tokenUsageTotal: 1000,
        estimatedCostUsd: null,
        createdAt: new Date("2024-01-01"),
        completedAt: null,
      },
      findings: [
        {
          id: "f1",
          type: "RISK",
          title: "Market Risk",
          summary: "High competition in target market",
          confidence: 0.85,
          metadata: null,
          createdAt: new Date("2024-01-01"),
        },
      ],
      claims: [],
      entities: [],
      contradictions: [],
      stageRuns: [],
    };

    render(
      <InsightsView projectName="Acme" labels={mockLabels} data={data} />
    );

    expect(screen.getByText("Findings")).toBeInTheDocument();
    expect(screen.getByText("Market Risk")).toBeInTheDocument();
    expect(screen.getByText("High competition in target market")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders claims section when claims exist", () => {
    const data = {
      job: {
        id: "job-1",
        status: "COMPLETED",
        selectedProvider: "OPENAI",
        selectedModel: "gpt-4o-mini",
        tokenUsageTotal: 1000,
        estimatedCostUsd: null,
        createdAt: new Date("2024-01-01"),
        completedAt: null,
      },
      findings: [],
      claims: [
        {
          id: "c1",
          claimText: "Revenue grew 50% YoY",
          status: "SUPPORTED",
          confidence: 0.9,
          evidenceRefs: null,
          createdAt: new Date("2024-01-01"),
        },
      ],
      entities: [],
      contradictions: [],
      stageRuns: [],
    };

    render(
      <InsightsView projectName="Acme" labels={mockLabels} data={data} />
    );

    expect(screen.getByText("Claims")).toBeInTheDocument();
    expect(screen.getByText("Revenue grew 50% YoY")).toBeInTheDocument();
    expect(screen.getByText("Supported")).toBeInTheDocument();
  });

  it("renders entities section when entities exist", () => {
    const data = {
      job: {
        id: "job-1",
        status: "COMPLETED",
        selectedProvider: "OPENAI",
        selectedModel: "gpt-4o-mini",
        tokenUsageTotal: 1000,
        estimatedCostUsd: null,
        createdAt: new Date("2024-01-01"),
        completedAt: null,
      },
      findings: [],
      claims: [],
      entities: [
        {
          id: "e1",
          name: "John Smith",
          kind: "PERSON",
          confidence: 0.95,
          metadata: null,
          createdAt: new Date("2024-01-01"),
        },
      ],
      contradictions: [],
      stageRuns: [],
    };

    render(
      <InsightsView projectName="Acme" labels={mockLabels} data={data} />
    );

    expect(screen.getByText("Entities")).toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("PERSON")).toBeInTheDocument();
  });

  it("renders contradictions section when contradictions exist", () => {
    const data = {
      job: {
        id: "job-1",
        status: "COMPLETED",
        selectedProvider: "OPENAI",
        selectedModel: "gpt-4o-mini",
        tokenUsageTotal: 1000,
        estimatedCostUsd: null,
        createdAt: new Date("2024-01-01"),
        completedAt: null,
      },
      findings: [],
      claims: [],
      entities: [],
      contradictions: [
        {
          id: "x1",
          statementA: "Revenue is $10M",
          statementB: "Revenue is $5M",
          confidence: 0.8,
          evidenceRefs: null,
          createdAt: new Date("2024-01-01"),
        },
      ],
      stageRuns: [],
    };

    render(
      <InsightsView projectName="Acme" labels={mockLabels} data={data} />
    );

    expect(screen.getByText("Contradictions")).toBeInTheDocument();
    expect(screen.getByText(/Revenue is \$10M/)).toBeInTheDocument();
    expect(screen.getByText(/Revenue is \$5M/)).toBeInTheDocument();
  });
});
