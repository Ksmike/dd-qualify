"use server";

import { auth } from "@/lib/auth";
import { ProjectModel } from "@/lib/models/ProjectModel";

export async function getProjectForSidebar(
  projectId: string
): Promise<{ id: string; name: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await ProjectModel.findByIdForUser({
    projectId,
    userId: session.user.id,
  });
  if (!project) return null;
  return { id: project.id, name: project.name };
}
