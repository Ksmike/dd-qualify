import type { MarketingLabels } from "@/labels/types";

export const marketingLabels: MarketingLabels = {
  hero: {
    badge: "Source-of-Truth Intelligence for Investment Diligence",
    title: "Every claim. Every source. Triangulated automatically.",
    description:
      "DD Qualify is the source-of-truth intelligence layer for VC and PE diligence teams. Every claim from every source — triangulated automatically, with gaps closed and contradictions surfaced.",
    trialCta: "Start Free Trial",
    demoCta: "See It in Action",
    segmentLabels: [
      "VC",
      "Growth Equity",
      "PE",
      "M&A",
      "CDD",
      "Expert Networks",
    ],
  },
  metrics: [
    { label: "Sources triangulated per engagement", value: "12+" },
    { label: "Claims structured automatically", value: "1,000+" },
    { label: "Contradictions surfaced without manual review", value: "100%" },
  ],
  workflow: {
    heading: "How DD Qualify works",
    steps: [
      {
        title: "Ingest",
        description:
          "Connect pitch decks, CDD reports, expert call transcripts, and data room documents in one intake flow — no change to existing workflows.",
      },
      {
        title: "Triangulate",
        description:
          "Claims are structured into the intelligence graph and triangulated across sources. Convergence, divergence, and source gaps are detected automatically.",
      },
      {
        title: "Surface",
        description:
          "Contradictions are flagged with provenance. Gaps are identified and chased. Your team gets a living, breathing picture of every deal that deepens with every source.",
      },
    ],
  },
  coverage: {
    heading: "Intelligence your deal team trusts",
    description:
      "Built specifically for the problems VC and PE diligence teams face — disparate sources making conflicting claims about a single deal.",
    items: [
      "Convergence and divergence across all sources",
      "Contradictions surfaced, not buried",
      "Source-gap detection across the engagement",
      "Conviction tested against the investment thesis",
      "Every claim weighed against what the team prioritises",
      "Disagreements between sources flagged, with provenance",
    ],
    outcomesTitle: "Pilot outcomes",
    outcomesParagraphs: [
      "Due diligence teams are drowning in data. Every deal generates dozens of sources — pitch decks, interview transcripts, CDD reports, expert calls — each making claims about the target. Associates spend weeks manually stitching them together into a memo. Insights fall through the cracks. Contradictions go unnoticed. Gaps rarely get chased down.",
      "Teams using DD Qualify in pilot eliminated manual claim-stitching and surfaced contradictions before signing — producing a complete picture of every deal without extra work or changes to existing workflows.",
    ],
  },
  taxonomy: {
    heading: "Built-in intelligence labels",
    description:
      "Standardised labels are attached to every diligence workspace so teams can filter signals, route reviewers, and keep reporting consistent across the engagement.",
    items: [
      "Convergence",
      "Divergence",
      "Source Gap",
      "Contradiction",
      "Unverified Claim",
      "Conviction Signal",
    ],
  },
  cta: {
    heading: "Ready to triangulate your next deal?",
    description:
      "Launch a workspace in minutes, connect your sources, and get a structured intelligence graph before your next partner meeting.",
    createWorkspaceCta: "Create Workspace",
    contactSalesCta: "Get in Touch",
    footnote:
      "Enterprise-ready API, SOC 2 roadmap, and role-based permissions available.",
  },
};
