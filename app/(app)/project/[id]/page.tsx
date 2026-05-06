import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLabelsForLocale } from "@/labels";
import { ProjectModel } from "@/lib/models/ProjectModel";
import { ProjectDocumentsPanel } from "@/app/(app)/project/[id]/ProjectDocumentsPanel";
import { ProjectHeader } from "@/app/(app)/project/[id]/ProjectHeader";

export const metadata = {
  title: "Project | DD Qualify",
};

type ProjectInspectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectInspectPage({
  params,
}: ProjectInspectPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/project/${id}`);
  }

  const { id } = await params;
  const project = await ProjectModel.findByIdForUser({
    projectId: id,
    userId: session.user.id,
  });

  if (!project) {
    notFound();
  }

  const { labels } = getLabelsForLocale(session.user.locale ?? "en");
  const formattedCreatedAt = new Intl.DateTimeFormat(session.user.locale ?? "en", {
    dateStyle: "medium",
  }).format(project.createdAt);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ProjectHeader
        projectName={project.name}
        projectId={project.id}
        projectStatus={project.status}
        projectStatusLabel={labels.app.dashboard.statuses[project.status]}
        createdAtLabel={formattedCreatedAt}
        labels={labels.app.projectInspect}
      />

      <ProjectDocumentsPanel
        projectId={project.id}
        labels={labels.app.projectInspect}
      />
    </div>
  );
}
