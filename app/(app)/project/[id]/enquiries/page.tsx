import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLabelsForLocale } from "@/labels";
import { ProjectModel } from "@/lib/models/ProjectModel";

export const metadata = {
  title: "Enquiries | DD Qualify",
};

type EnquiriesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EnquiriesPage({ params }: EnquiriesPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    const { id } = await params;
    redirect(`/login?callbackUrl=/project/${id}/enquiries`);
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {labels.app.enquiries.heading}
      </h1>
      <p className="text-sm text-foreground/70">
        {project.name} - {labels.app.enquiries.description}
      </p>
      <div className="rounded-xl border border-divider bg-content1 p-4 text-sm text-foreground/80">
        {labels.app.enquiries.placeholder}
      </div>
    </div>
  );
}
