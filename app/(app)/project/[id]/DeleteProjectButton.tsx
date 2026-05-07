"use client";

import { useState } from "react";
import { toast } from "@heroui/react";
import { deleteProject } from "@/lib/actions/project";

type DeleteProjectLabels = {
  deleteProjectCta: string;
  deleteProjectConfirm: string;
  deleteProjectInProgress: string;
  deleteProjectSuccessToast: string;
  deleteProjectErrorToast: string;
};

type DeleteProjectButtonProps = {
  projectId: string;
  labels: DeleteProjectLabels;
};

export function DeleteProjectButton({ projectId, labels }: DeleteProjectButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteProject() {
    if (!window.confirm(labels.deleteProjectConfirm)) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (result.error) {
        toast.danger(result.error || labels.deleteProjectErrorToast);
        setIsDeleting(false);
        return;
      }
      toast.success(labels.deleteProjectSuccessToast);
      // Use hard navigation to avoid the deleted project's page trying to
      // re-render (which would 404) during a soft client-side transition.
      window.location.href = "/dashboard";
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDeleteProject()}
      disabled={isDeleting}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/15 disabled:opacity-60 sm:w-auto"
    >
      {isDeleting ? labels.deleteProjectInProgress : labels.deleteProjectCta}
    </button>
  );
}
