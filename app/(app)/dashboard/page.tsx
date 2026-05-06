import Link from "next/link";
import { redirect } from "next/navigation";
import { getLabelsForLocale } from "@/labels";
import { auth } from "@/lib/auth";
import { ProjectModel } from "@/lib/models/ProjectModel";

export const metadata = {
  title: "Dashboard | DD Qualify",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const projects = await ProjectModel.listByUserId(session.user.id);

  if (projects.length === 0) {
    redirect("/projects/new");
  }

  const { labels } = getLabelsForLocale(session.user.locale ?? "en");
  const statusClasses = {
    draft: "bg-content2 text-foreground/80",
    inprogress: "bg-warning/15 text-warning",
    reviewed: "bg-success/15 text-success",
    complete: "bg-success/15 text-success",
    rejected: "bg-danger/15 text-danger",
  } as const;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">
        {labels.app.dashboard.heading}
      </h1>
      <p className="mt-2 text-foreground/60">{labels.app.dashboard.description}</p>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {labels.app.dashboard.projectsHeading}
          </h2>
          <Link
            href="/projects/new"
            className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {labels.app.dashboard.createProjectCta}
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/project/${project.id}`}
                className="flex items-center justify-between rounded-md border border-divider bg-content1 px-4 py-3 transition-colors hover:bg-content2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{project.name}</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {labels.app.dashboard.statusHeading}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[project.status]}`}
                  >
                    {labels.app.dashboard.statuses[project.status]}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {labels.app.dashboard.inspectCta}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
