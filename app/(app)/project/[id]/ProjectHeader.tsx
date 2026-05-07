"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import { copyToClipboard } from "@/lib/utils/copyToClipboard";
import { deleteProject } from "@/lib/actions/project";
import type { ProjectStatus } from "@/lib/models/ProjectModel";

type ProjectHeaderLabels = {
  heading: string;
  statusLabel: string;
  createdLabel: string;
  idLabel: string;
  copyIdAriaLabel: string;
  copySuccessToast: string;
  copyErrorToast: string;
  deleteProjectCta: string;
  deleteProjectConfirm: string;
  deleteProjectInProgress: string;
  deleteProjectSuccessToast: string;
  deleteProjectErrorToast: string;
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
  draft: "bg-content2 text-foreground/80",
  inprogress: "bg-warning/15 text-warning",
  reviewed: "bg-success/15 text-success",
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
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCopyProjectId() {
    const copied = await copyToClipboard(projectId);
    if (copied) {
      toast.success(labels.copySuccessToast);
      return;
    }
    toast.danger(labels.copyErrorToast);
  }

  async function handleDeleteProject() {
    if (!window.confirm(labels.deleteProjectConfirm)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (result.error) {
        toast.danger(result.error || labels.deleteProjectErrorToast);
        return;
      }
      toast.success(labels.deleteProjectSuccessToast);
      router.replace("/dashboard");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{labels.heading}</h1>
          <p className="mt-2 text-foreground/70">{projectName}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleDeleteProject()}
          disabled={isDeleting}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/15 disabled:opacity-60"
        >
          {isDeleting ? labels.deleteProjectInProgress : labels.deleteProjectCta}
        </button>
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
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-foreground/70 shrink-0">{labels.idLabel}:</p>
          <p className="font-mono text-sm font-medium text-foreground truncate">{projectId}</p>
          <button
            type="button"
            aria-label={labels.copyIdAriaLabel}
            onClick={handleCopyProjectId}
            className="shrink-0 rounded-md p-1 text-foreground/70 transition-colors hover:bg-content2 hover:text-foreground"
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
