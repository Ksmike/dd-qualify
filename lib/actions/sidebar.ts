"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DiligenceJobStatus } from "@/lib/generated/prisma/client";
import { ProjectModel } from "@/lib/models/ProjectModel";

export async function getProjectForSidebar(
  projectId: string
): Promise<{
  id: string;
  name: string;
  hasInsights: boolean;
  hasReports: boolean;
  hasEnquiries: boolean;
} | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const project = await ProjectModel.findByIdForUser({
    projectId,
    userId: session.user.id,
  });
  if (!project) return null;

  const [insightRecord, reportRecord, completedReportRecord] = await Promise.all([
    db.diligenceJob.findFirst({
      where: {
        projectId: project.id,
        userId: session.user.id,
        status: DiligenceJobStatus.COMPLETED,
        OR: [
          { findings: { some: {} } },
          { claims: { some: {} } },
          { entities: { some: {} } },
          { contradictions: { some: {} } },
        ],
      },
      select: { id: true },
    }),
    db.diligenceArtifact.findFirst({
      where: {
        projectId: project.id,
        userId: session.user.id,
        type: {
          in: ["GENERATED_REPORT", "EXPORT_BUNDLE", "EVIDENCE_MAP"],
        },
      },
      select: { id: true },
    }),
    db.diligenceArtifact.findFirst({
      where: {
        projectId: project.id,
        userId: session.user.id,
        type: "GENERATED_REPORT",
        job: {
          status: DiligenceJobStatus.COMPLETED,
        },
      },
      select: { id: true },
    }),
  ]);

  return {
    id: project.id,
    name: project.name,
    hasInsights: Boolean(insightRecord),
    hasReports: Boolean(reportRecord),
    hasEnquiries: Boolean(completedReportRecord),
  };
}
