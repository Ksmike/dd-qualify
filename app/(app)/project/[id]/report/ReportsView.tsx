"use client";

import Link from "next/link";
import { LuFileText, LuPackage, LuMap, LuExternalLink } from "react-icons/lu";
import type { AppLabels } from "@/labels/types";

type ReportsLabels = AppLabels["app"]["reports"];

type Report = {
  id: string;
  jobId: string;
  stage: string | null;
  type: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
  jobStatus: string;
  jobCompletedAt: Date | null;
};

type Props = {
  projectId: string;
  projectName: string;
  labels: ReportsLabels;
  reports: Report[];
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

function JobStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    COMPLETED: "bg-success/10 text-success",
    RUNNING: "bg-primary/10 text-primary",
    FAILED: "bg-danger/10 text-danger",
    QUEUED: "bg-default/10 text-foreground/50",
    CANCELED: "bg-default/10 text-foreground/40",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? colors.QUEUED}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

export function ReportsView({ projectId, projectName, labels, reports }: Props) {
  if (reports.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          {labels.heading}
        </h1>
        <p className="text-foreground/60">{labels.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {labels.heading}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {projectName} — {labels.description}
        </p>
      </div>

      {/* Reports table */}
      <div className="overflow-x-auto rounded-xl border border-divider bg-content1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider text-left">
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadType}
              </th>
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadStage}
              </th>
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadFormat}
              </th>
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadSize}
              </th>
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadDate}
              </th>
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadJobStatus}
              </th>
              <th className="px-4 py-3 font-medium text-foreground/60">
                {labels.tableHeadActions}
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const Icon = typeIcons[report.type] ?? LuFileText;
              const typeName =
                labels.artifactTypes[
                  report.type as keyof typeof labels.artifactTypes
                ] ?? report.type;

              return (
                <tr
                  key={report.id}
                  className="border-b border-divider/50 last:border-0 transition-colors hover:bg-content2/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="size-4 text-foreground/60"
                        aria-hidden="true"
                      />
                      <span className="font-medium text-foreground">
                        {typeName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {report.stage
                      ? report.stage.replace(/_/g, " ").toLowerCase()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {report.mimeType ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {formatBytes(report.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={report.jobStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/project/${projectId}/report/${report.id}`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      <LuExternalLink className="size-3" aria-hidden="true" />
                      {labels.viewCta}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
