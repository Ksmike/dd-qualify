"use server";

import { redirect } from "next/navigation";
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
