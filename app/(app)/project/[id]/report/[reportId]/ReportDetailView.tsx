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
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/project/${projectId}/report`}
        className="inline-flex items-center gap-1 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <LuArrowLeft className="size-4" aria-hidden="true" />
        Back to reports
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{typeName}</h1>
          <p className="mt-0.5 text-sm text-foreground/60">
            {projectName}
            {artifact.stage &&
              ` — ${artifact.stage.replace(/_/g, " ").toLowerCase()}`}
          </p>
        </div>
      </div>

      {/* Metadata grid */}
      <section className="rounded-xl border border-divider bg-content1 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Format" value={artifact.mimeType ?? "Unknown"} />
          <Stat label="Size" value={formatBytes(artifact.sizeBytes)} />
          <Stat
            label="Generated"
            value={new Date(artifact.createdAt).toLocaleString()}
            icon={<LuClock className="size-4 text-foreground/50" />}
          />
          <Stat label="Storage" value={artifact.storageProvider.replace(/_/g, " ").toLowerCase()} />
          <Stat label="Provider" value={artifact.job.selectedProvider} />
          <Stat
            label="Model"
            value={artifact.job.selectedModel}
            icon={<LuCpu className="size-4 text-foreground/50" />}
          />
          <Stat
            label="Tokens"
            value={artifact.job.tokenUsageTotal.toLocaleString()}
          />
          <Stat
            label="Est. cost"
            value={
              artifact.job.estimatedCostUsd !== null
                ? `$${artifact.job.estimatedCostUsd.toFixed(4)}`
                : "—"
            }
            icon={<LuCoins className="size-4 text-foreground/50" />}
          />
        </div>
      </section>

      {/* Report content */}
      {meta && (
        <section className="space-y-4">
          {meta.summary && (
            <div className="rounded-xl border border-divider bg-content1 p-5">
              <h2 className="text-lg font-semibold text-foreground">
                Executive Summary
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {meta.summary}
              </p>
            </div>
          )}

          {meta.items && meta.items.length > 0 && (
            <div className="space-y-3">
              {meta.items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-divider bg-content1 p-5"
                >
                  {(item.title || item.section) && (
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title ?? item.section}
                    </h3>
                  )}
                  {item.content && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                      {item.content}
                    </p>
                  )}
                </div>
              ))}
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
      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground">
        {icon}
        {value}
      </p>
    </div>
  );
}
