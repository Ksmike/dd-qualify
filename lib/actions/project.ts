"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { ProjectModel } from "@/lib/models/ProjectModel";

export async function createProject(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/projects/new");
  }

  const nameEntry = formData.get("name");
  const name =
    typeof nameEntry === "string" ? nameEntry.trim().slice(0, 120) : "";

  if (!name) {
    redirect("/projects/new");
  }

  await ProjectModel.createForUser({
    name,
    userId: session.user.id,
  });

  redirect("/dashboard");
}

export async function startProjectDueDiligence(
  projectId: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated." };
  }

  const updated = await ProjectModel.updateStatusForUser({
    projectId,
    userId: session.user.id,
    status: "inprogress",
  });

  if (!updated) {
    return { error: "Project not found." };
  }

  revalidatePath(`/project/${projectId}`);
  revalidatePath("/dashboard");
  return {};
}
