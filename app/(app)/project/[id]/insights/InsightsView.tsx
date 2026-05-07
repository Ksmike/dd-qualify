"use client";

import {
  LuTriangleAlert,
  LuShieldCheck,
  LuUsers,
  LuGitCompare,
  LuCircleCheck,
  LuCircleX,
  LuCircleHelp,
  LuLightbulb,
  LuEye,
  LuUser,
  LuBuilding2,
  LuBadgePoundSterling,
  LuTrendingUp,
  LuTarget,
  LuHandshake,
  LuFactory,
  LuFileText,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import type { AppLabels } from "@/labels/types";

type InsightsLabels = AppLabels["app"]["insights"];

type InsightsData = {
  job: {
    id: string;
    status: string;
    selectedProvider: string;
    selectedModel: string;
    tokenUsageTotal: number;
    estimatedCostUsd: number | null;
    createdAt: Date;
    completedAt: Date | null;
  };
  findings: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    confidence: number | null;
    metadata: unknown;
    createdAt: Date;
  }>;
  claims: Array<{
    id: string;
    claimText: string;
    status: string;
    confidence: number | null;
    evidenceRefs: unknown;
    createdAt: Date;
  }>;
  entities: Array<{
    id: string;
    name: string;
    kind: string;
    confidence: number | null;
    metadata: unknown;
    createdAt: Date;
  }>;
  contradictions: Array<{
    id: string;
    statementA: string;
    statementB: string;
    confidence: number | null;
    evidenceRefs: unknown;
    createdAt: Date;
  }>;
  stageRuns: Array<{
    stage: string;
    status: string;
    attempts: number;
    provider: string | null;
    model: string | null;
    tokenUsageTotal: number;
    estimatedCostUsd: number | null;
    errorMessage: string | null;
    updatedAt: Date;
  }>;
} | null;

type Props = {
  projectName: string;
  labels: InsightsLabels;
  data: InsightsData;
};

const findingTypeIcons: Record<string, typeof LuTriangleAlert> = {
  RISK: LuTriangleAlert,
  OPPORTUNITY: LuLightbulb,
  WARNING: LuTriangleAlert,
  OBSERVATION: LuEye,
};

const findingTypeColors: Record<string, string> = {
  RISK: "text-danger",
  OPPORTUNITY: "text-success",
  WARNING: "text-warning",
  OBSERVATION: "text-foreground/60",
};

const claimStatusIcons: Record<string, typeof LuCircleCheck> = {
  SUPPORTED: LuCircleCheck,
  CONTRADICTED: LuCircleX,
  INCONCLUSIVE: LuCircleHelp,
};

const claimStatusColors: Record<string, string> = {
  SUPPORTED: "text-success",
  CONTRADICTED: "text-danger",
  INCONCLUSIVE: "text-warning",
};

type EntityKindMeta = {
  label: string;
  Icon: IconType;
  className: string;
};

const ENTITY_KIND_META: Record<string, EntityKindMeta> = {
  person: {
    label: "Person",
    Icon: LuUser,
    className: "bg-secondary/15 text-secondary",
  },
  company: {
    label: "Company",
    Icon: LuBuilding2,
    className: "bg-primary/15 text-primary",
  },
  financial_metric: {
    label: "Financial Metric",
    Icon: LuBadgePoundSterling,
    className: "bg-success/15 text-success",
  },
  market: {
    label: "Market",
    Icon: LuTrendingUp,
    className: "bg-warning/15 text-warning",
  },
  product: {
    label: "Product",
    Icon: LuTarget,
    className: "bg-primary/15 text-primary",
  },
  investor: {
    label: "Investor",
    Icon: LuHandshake,
    className: "bg-secondary/15 text-secondary",
  },
  competitor: {
    label: "Competitor",
    Icon: LuFactory,
    className: "bg-danger/15 text-danger",
  },
};

function ConfidenceBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger";
  return (
    <span className={`text-xs font-medium ${color}`}>{pct}%</span>
  );
}

export function InsightsView({ projectName, labels, data }: Props) {
  if (!data) {
    return (
      <div className="min-w-0 w-full space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {labels.heading}
        </h1>
        <p className="text-foreground/60">{labels.empty}</p>
      </div>
    );
  }

  const { findings, claims, entities, contradictions } = data;

  return (
    <div className="min-w-0 w-full space-y-8 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {labels.heading}
        </h1>
        <p className="mt-1 break-words text-sm text-foreground/60">
          {projectName} — {labels.description}
        </p>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LuTriangleAlert className="size-5" aria-hidden="true" />
            {labels.findingsHeading}
            <span className="text-sm font-normal text-foreground/50">
              ({findings.length})
            </span>
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {findings.map((finding) => {
              const Icon = findingTypeIcons[finding.type] ?? LuEye;
              const color = findingTypeColors[finding.type] ?? "text-foreground/60";
              return (
                <div
                  key={finding.id}
                  className="rounded-lg border border-divider bg-content1 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-4 ${color}`} aria-hidden="true" />
                      <span className={`text-xs font-medium uppercase ${color}`}>
                        {labels.findingTypes[finding.type as keyof typeof labels.findingTypes] ?? finding.type}
                      </span>
                    </div>
                    <ConfidenceBadge value={finding.confidence} />
                  </div>
                  <h3 className="mt-2 break-words text-sm font-semibold text-foreground">
                    {finding.title}
                  </h3>
                  <p className="mt-1 break-words text-sm text-foreground/70">
                    {finding.summary}
                  </p>
                  <FindingDetails metadata={finding.metadata} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Claims */}
      {claims.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LuShieldCheck className="size-5" aria-hidden="true" />
            {labels.claimsHeading}
            <span className="text-sm font-normal text-foreground/50">
              ({claims.length})
            </span>
          </h2>
          <div className="mt-3 space-y-2">
            {claims.map((claim) => {
              const Icon = claimStatusIcons[claim.status] ?? LuCircleHelp;
              const color = claimStatusColors[claim.status] ?? "text-foreground/60";
              const evidence = extractEvidence(claim.evidenceRefs);
              return (
                <div
                  key={claim.id}
                  className="flex items-start gap-3 rounded-lg border border-divider bg-content1 p-4"
                >
                  <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />
                  <div className="flex-1">
                    <p className="break-words text-sm text-foreground">{claim.claimText}</p>
                    {evidence && (
                      <p className="mt-1 text-xs text-foreground/60 italic">
                        {evidence}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-foreground/50">
                      <span className={color}>
                        {labels.claimStatuses[claim.status as keyof typeof labels.claimStatuses] ?? claim.status}
                      </span>
                      <ConfidenceBadge value={claim.confidence} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Entities */}
      {entities.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LuUsers className="size-5" aria-hidden="true" />
            {labels.entitiesHeading}
            <span className="text-sm font-normal text-foreground/50">
              ({entities.length})
            </span>
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity) => {
              const details = extractEntityDetails(entity.metadata);
              const kindMeta = getEntityKindMeta(entity.kind);
              return (
                <div
                  key={entity.id}
                  className="rounded-lg border border-divider bg-content1 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {entity.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${kindMeta.className}`}
                    >
                      <kindMeta.Icon aria-hidden="true" className="size-3.5" />
                      {kindMeta.label}
                    </span>
                  </div>
                  {details && (
                    <p className="mt-1 text-xs text-foreground/60">{details}</p>
                  )}
                  <ConfidenceBadge value={entity.confidence} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Contradictions */}
      {contradictions.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <LuGitCompare className="size-5" aria-hidden="true" />
            {labels.contradictionsHeading}
            <span className="text-sm font-normal text-foreground/50">
              ({contradictions.length})
            </span>
          </h2>
          <div className="mt-3 space-y-3">
            {contradictions.map((c) => {
              const explanation = extractContradictionExplanation(c.evidenceRefs);
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-divider bg-content1 p-4"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium uppercase text-danger">
                      Contradiction
                    </span>
                    <ConfidenceBadge value={c.confidence} />
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="rounded-md bg-content2 p-2">
                      <p className="break-words text-sm text-foreground/80">
                        &ldquo;{c.statementA}&rdquo;
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <LuGitCompare className="size-4 text-danger" aria-hidden="true" />
                    </div>
                    <div className="rounded-md bg-content2 p-2">
                      <p className="break-words text-sm text-foreground/80">
                        &ldquo;{c.statementB}&rdquo;
                      </p>
                    </div>
                  </div>
                  {explanation && (
                    <p className="mt-2 text-xs text-foreground/60">
                      <span className="font-medium">Why: </span>
                      {explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function FindingDetails({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  const details =
    typeof meta.details === "string" ? meta.details : null;
  const severity =
    typeof meta.severity === "string" ? meta.severity : null;
  const evidenceRefs = Array.isArray(meta.evidenceRefs)
    ? (meta.evidenceRefs as string[])
    : null;

  if (!details && !severity && !evidenceRefs) return null;

  return (
    <div className="mt-2 space-y-1 border-t border-divider/50 pt-2">
      {severity && (
        <p className="text-xs">
          <span className="font-medium text-foreground/60">Severity: </span>
          <SeverityBadge severity={severity} />
        </p>
      )}
      {details && (
        <p className="text-xs text-foreground/60">{details}</p>
      )}
      {evidenceRefs && evidenceRefs.length > 0 && (
        <p className="text-xs text-foreground/50">
          <span className="font-medium">Sources: </span>
          {evidenceRefs.join(", ")}
        </p>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-danger/10 text-danger",
    high: "bg-danger/10 text-danger",
    medium: "bg-warning/10 text-warning",
    low: "bg-success/10 text-success",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity] ?? "bg-default/10 text-foreground/50"}`}
    >
      {severity}
    </span>
  );
}

function extractEvidence(evidenceRefs: unknown): string | null {
  if (!evidenceRefs || typeof evidenceRefs !== "object") return null;
  const refs = evidenceRefs as Record<string, unknown>;
  if (typeof refs.evidence === "string") return refs.evidence;
  if (typeof refs.source === "string") return `Source: ${refs.source}`;
  if (Array.isArray(evidenceRefs)) {
    return evidenceRefs
      .filter((r) => typeof r === "string")
      .join(", ");
  }
  return null;
}

function extractEntityDetails(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  const details = typeof meta.details === "string" ? meta.details : null;
  const source = typeof meta.source === "string" ? meta.source : null;
  if (details && source) return `${details} (${source})`;
  if (details) return details;
  if (source) return `Found in: ${source}`;
  return null;
}

function extractContradictionExplanation(evidenceRefs: unknown): string | null {
  if (!evidenceRefs || typeof evidenceRefs !== "object") return null;
  const refs = evidenceRefs as Record<string, unknown>;
  if (typeof refs.explanation === "string") return refs.explanation;
  const sourceA = typeof refs.sourceA === "string" ? refs.sourceA : null;
  const sourceB = typeof refs.sourceB === "string" ? refs.sourceB : null;
  if (sourceA && sourceB) return `${sourceA} vs. ${sourceB}`;
  return null;
}

function getEntityKindMeta(kind: string): EntityKindMeta {
  const normalizedKind = kind.trim().toLowerCase();
  const exact = ENTITY_KIND_META[normalizedKind];
  if (exact) {
    return exact;
  }

  return {
    label: formatEntityKindLabel(normalizedKind || kind),
    Icon: LuFileText,
    className: "bg-content2 text-foreground/70",
  };
}

function formatEntityKindLabel(kind: string): string {
  return kind
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
