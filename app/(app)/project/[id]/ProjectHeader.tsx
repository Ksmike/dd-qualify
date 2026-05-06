"use client";

import { toast } from "@heroui/react";
import { copyToClipboard } from "@/lib/utils/copyToClipboard";
import type { ProjectStatus } from "@/lib/models/ProjectModel";

type ProjectHeaderLabels = {
  heading: string;
  statusLabel: string;
  createdLabel: string;
  idLabel: string;
  copyIdAriaLabel: string;
  copySuccessToast: string;
  copyErrorToast: string;
};

type ProjectHeaderProps = {
  projectName: string;
  projectId: string;
  projectStatus: ProjectStatus;
  projectStatusLabel: string;
  createdAtLabel: string;
  labels: ProjectHeaderLabels;
};

const statusClasses: Record<ProjectStatus, string> = {
  inprogress: "bg-warning/15 text-warning",
  complete: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
};

export function ProjectHeader({
  projectName,
  projectId,
  projectStatus,
  projectStatusLabel,
  createdAtLabel,
  labels,
}: ProjectHeaderProps) {
  async function handleCopyProjectId() {
    const copied = await copyToClipboard(projectId);
    if (copied) {
      toast.success(labels.copySuccessToast);
      return;
    }
    toast.danger(labels.copyErrorToast);
  }

  return (
    <header className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{labels.heading}</h1>
        <p className="mt-2 text-foreground/70">{projectName}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p className="text-foreground/70">{labels.statusLabel}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[projectStatus]}`}
        >
          {projectStatusLabel}
        </span>
        <p className="text-foreground/70">
          {labels.createdLabel}:{" "}
          <span className="font-medium text-foreground">{createdAtLabel}</span>
        </p>
        <div className="flex items-center gap-2">
          <p className="text-foreground/70">{labels.idLabel}:</p>
          <p className="font-mono text-sm font-medium text-foreground">{projectId}</p>
          <button
            type="button"
            aria-label={labels.copyIdAriaLabel}
            onClick={handleCopyProjectId}
            className="rounded-md p-1 text-foreground/70 transition-colors hover:bg-content2 hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
