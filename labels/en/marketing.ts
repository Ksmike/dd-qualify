import type { MarketingLabels } from "@/labels/types";

export const marketingLabels: MarketingLabels = {
  hero: {
    badge: "Automated Due Diligence Platform",
    title: "DD Qualify helps investors underwrite faster with less blind risk.",
    description:
      "We combine structured data ingestion, AI-assisted analysis, and analyst-ready reporting so funds and strategic buyers can complete commercial diligence in days instead of weeks.",
    trialCta: "Start Free Trial",
    demoCta: "View Live Workspace",
    segmentLabels: [
      "VC",
      "Growth Equity",
      "M&A",
      "Commercial DD",
      "Financial DD",
      "Compliance DD",
    ],
  },
  metrics: [
    { label: "Deals screened per month", value: "240+" },
    { label: "Median first-pass report", value: "36 hours" },
    { label: "Manual analyst effort reduced", value: "92%" },
  ],
  workflow: {
    heading: "How DD Qualify works",
    steps: [
      {
        title: "Collect",
        description:
          "Connect data rooms, cap-table exports, accounting systems, and policy docs in one intake flow.",
      },
      {
        title: "Analyze",
        description:
          "Run automated checks across legal, financial, and operational risk domains with explainable scoring.",
      },
      {
        title: "Decide",
        description:
          "Get an executive summary, red-flag queue, and audit-ready workpapers your IC can review immediately.",
      },
    ],
  },
  coverage: {
    heading: "Risk coverage teams trust",
    description:
      "Built for pre-investment and post-close reviews across venture, growth equity, and M&A teams.",
    items: [
      "Corporate and contract compliance",
      "Revenue quality and concentration risk",
      "Unit economics and burn-rate stability",
      "Security posture and vendor dependencies",
      "KYC / AML, sanctions, and jurisdiction checks",
      "Board governance and policy completeness",
    ],
    outcomesTitle: "Pilot portfolio outcomes",
    outcomesParagraphs: [
      "Teams using DD Qualify in pilot reduced kickoff-to-investment-committee cycle time by an average of 11 days while increasing issue detection before signing.",
      "Typical users include diligence leads, deal teams, operating partners, and legal counsel collaborating from a single evidence trail.",
    ],
  },
  taxonomy: {
    heading: "Built-in deal labels",
    description:
      "Standardized labels are attached to every diligence workspace so teams can filter risks, route reviewers, and keep reporting consistent.",
    items: [
      "Data Quality",
      "Legal Risk",
      "Financial Anomaly",
      "Concentration Risk",
      "Cyber / InfoSec",
      "Regulatory",
    ],
  },
  cta: {
    heading: "Ready to automate your next diligence cycle?",
    description:
      "Launch a workspace in minutes, invite your deal team, and generate a structured red-flag report before your next partner meeting.",
    createWorkspaceCta: "Create Workspace",
    contactSalesCta: "Contact Sales",
    footnote:
      "Enterprise-ready API, SOC 2 roadmap, and role-based permissions available.",
  },
};
