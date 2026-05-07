"use client";

import Link from "next/link";
import {
  LuFileText,
  LuPackage,
  LuMap,
  LuArrowLeft,
  LuCpu,
  LuCoins,
  LuClock,
  LuShieldCheck,
  LuUsers,
  LuTrendingUp,
  LuTarget,
  LuBriefcase,
  LuTriangleAlert,
  LuLightbulb,
  LuScale,
  LuSearch,
  LuFileQuestion,
  LuClipboardList,
} from "react-icons/lu";
import type { AppLabels } from "@/labels/types";

type ReportsLabels = AppLabels["app"]["reports"];

type Artifact = {
  id: string;
  type: string;
  stage: string | null;
  storageProvider: string;
  storageKey: string;
  mimeType: string | null;
  sizeBytes: number | null;
  metadata: unknown;
  createdAt: Date;
  job: {
    id: string;
    status: string;
    selectedProvider: string;
    selectedModel: string;
    tokenUsageTotal: number;
    estimatedCostUsd: number | null;
    completedAt: Date | null;
  };
};

type Props = {
  projectId: string;
  projectName: string;
  artifact: Artifact;
  labels: ReportsLabels;
};

const typeIcons: Record<string, typeof LuFileText> = {
  GENERATED_REPORT: LuFileText,
  EXPORT_BUNDLE: LuPackage,
  EVIDENCE_MAP: LuMap,
};

/**
 * Maps raw section/title identifiers from the diligence pipeline
 * to proper human-readable headings.
 */
const SECTION_LABELS: Record<string, { title: string; icon: typeof LuFileText }> = {
  thesis: { title: "Investment Thesis", icon: LuLightbulb },
  executive_summary: { title: "Executive Summary", icon: LuClipboardList },
  q1_identity: { title: "Identity & Ownership", icon: LuUsers },
  q1_identity_and_ownership: { title: "Identity & Ownership", icon: LuUsers },
  q2_product: { title: "Product & Technology", icon: LuCpu },
  q2_product_and_technology: { title: "Product & Technology", icon: LuCpu },
  q3_market: { title: "Market & Traction", icon: LuTrendingUp },
  q3_market_and_traction: { title: "Market & Traction", icon: LuTrendingUp },
  q4_execution: { title: "Execution Capability", icon: LuTarget },
  q4_execution_capability: { title: "Execution Capability", icon: LuTarget },
  q5_business_model: { title: "Business Model Viability", icon: LuBriefcase },
  q5_business_model_viability: { title: "Business Model Viability", icon: LuBriefcase },
  q6_risks: { title: "Risk Analysis", icon: LuTriangleAlert },
  q6_risk_analysis: { title: "Risk Analysis", icon: LuTriangleAlert },
  q7_legal: { title: "Legal & Compliance", icon: LuScale },
  q7_legal_and_compliance: { title: "Legal & Compliance", icon: LuScale },
  q8_failure_modes: { title: "Failure Modes & Fragility", icon: LuTriangleAlert },
  q8_failure_modes_and_fragility: { title: "Failure Modes & Fragility", icon: LuTriangleAlert },
  open_questions: { title: "Open Questions", icon: LuFileQuestion },
  corroboration: { title: "Corroboration & Evidence", icon: LuShieldCheck },
  final_report: { title: "Final Report", icon: LuFileText },
  evidence_indexing: { title: "Evidence Indexing", icon: LuSearch },
};

function getSectionDisplay(raw: string): { title: string; icon: typeof LuFileText } {
  const key = raw.toLowerCase().trim();
  if (SECTION_LABELS[key]) return SECTION_LABELS[key];

  // Fallback: convert snake_case/kebab-case to Title Case
  const formatted = key
    .replace(/[_-]/g, " ")
    .replace(/\bq\d+\s*/g, "") // strip q1, q2 prefixes
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

  return { title: formatted || raw, icon: LuFileText };
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportDetailView({
  projectId,
  projectName,
  artifact,
  labels,
}: Props) {
  const Icon = typeIcons[artifact.type] ?? LuFileText;
  const typeName =
    labels.artifactTypes[artifact.type as keyof typeof labels.artifactTypes] ??
    artifact.type;

  // Parse metadata for report content
  const meta = artifact.metadata as {
    summary?: string;
    items?: Array<{ title?: string; content?: string; section?: string }>;
  } | null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href={`/project/${projectId}/report`}
        className="inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <LuArrowLeft className="size-4" aria-hidden="true" />
        Back to reports
      </Link>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{typeName}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {projectName}
            {artifact.stage &&
              ` — ${getSectionDisplay(artifact.stage).title}`}
          </p>
        </div>
      </header>

      {/* Metadata strip */}
      <section className="rounded-xl border border-divider bg-content1 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Format" value={artifact.mimeType ?? "Unknown"} />
          <Stat label="Size" value={formatBytes(artifact.sizeBytes)} />
          <Stat
            label="Generated"
            value={new Date(artifact.createdAt).toLocaleDateString()}
            icon={<LuClock className="size-3.5 text-foreground/40" />}
          />
          <Stat
            label="Model"
            value={artifact.job.selectedModel}
            icon={<LuCpu className="size-3.5 text-foreground/40" />}
          />
        </div>
      </section>

      {/* Report content */}
      {meta && (
        <section className="space-y-5">
          {meta.summary && (
            <div className="rounded-xl border border-divider bg-content1 p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <LuClipboardList className="size-4 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Executive Summary
                </h2>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {meta.summary}
              </p>
            </div>
          )}

          {meta.items && meta.items.length > 0 && (
            <div className="space-y-4">
              {meta.items.map((item, idx) => {
                const rawTitle = item.title ?? item.section ?? "";
                const { title, icon: SectionIcon } = getSectionDisplay(rawTitle);

                return (
                  <article
                    key={idx}
                    className="rounded-xl border border-divider bg-content1 p-5 sm:p-6"
                  >
                    {rawTitle && (
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-content2">
                          <SectionIcon
                            className="size-4 text-foreground/60"
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">
                          {title}
                        </h3>
                      </div>
                    )}
                    {item.content && (
                      <div className={rawTitle ? "mt-4 pl-[2.625rem]" : ""}>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/75">
                          {item.content}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Raw metadata fallback */}
      {meta === null && artifact.metadata != null && (
        <section className="rounded-xl border border-divider bg-content1 p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Raw metadata
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-content2 p-4 text-xs text-foreground/80">
            {JSON.stringify(artifact.metadata, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-foreground/50">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
