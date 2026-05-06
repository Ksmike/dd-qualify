import { db } from "@/lib/db";
import { ProjectDocumentProcessingStatus } from "@/lib/generated/prisma/client";

export type ProjectDocumentListItem = {
  id: string;
  filename: string;
  pathname: string;
  sizeBytes: number;
  uploadedAt: Date;
  processingStatus: ProjectDocumentProcessingStatus;
  processingError: string | null;
  lastProcessedAt: Date | null;
  reprocessCount: number;
};

export const ProjectDocumentModel = {
  async upsertFromBlob(input: {
    projectId: string;
    userId: string;
    filename: string;
    pathname: string;
    sizeBytes: number;
    contentType: string | null;
    resetProcessingStatus?: boolean;
  }) {
    const shouldReset = input.resetProcessingStatus ?? false;
    return db.projectDocument.upsert({
      where: {
        projectId_pathname: {
          projectId: input.projectId,
          pathname: input.pathname,
        },
      },
      create: {
        projectId: input.projectId,
        userId: input.userId,
        filename: input.filename,
        pathname: input.pathname,
        sizeBytes: input.sizeBytes,
        contentType: input.contentType,
        processingStatus: ProjectDocumentProcessingStatus.QUEUED,
      },
      update: {
        filename: input.filename,
        sizeBytes: input.sizeBytes,
        contentType: input.contentType,
        ...(shouldReset
          ? {
              processingStatus: ProjectDocumentProcessingStatus.QUEUED,
              processingError: null,
            }
          : {}),
      },
    });
  },

  async listForProject(input: {
    projectId: string;
    userId: string;
  }): Promise<ProjectDocumentListItem[]> {
    return db.projectDocument.findMany({
      where: {
        projectId: input.projectId,
        userId: input.userId,
      },
      orderBy: {
        uploadedAt: "asc",
      },
      select: {
        id: true,
        filename: true,
        pathname: true,
        sizeBytes: true,
        uploadedAt: true,
        processingStatus: true,
        processingError: true,
        lastProcessedAt: true,
        reprocessCount: true,
      },
    });
  },

  async countForProject(input: { projectId: string; userId: string }): Promise<number> {
    return db.projectDocument.count({
      where: {
        projectId: input.projectId,
        userId: input.userId,
      },
    });
  },

  async deleteForProjectPath(input: {
    projectId: string;
    userId: string;
    pathname: string;
  }) {
    return db.projectDocument.deleteMany({
      where: {
        projectId: input.projectId,
        userId: input.userId,
        pathname: input.pathname,
      },
    });
  },

  async markQueuedForProjectPath(input: {
    projectId: string;
    userId: string;
    pathname: string;
  }) {
    return db.projectDocument.updateMany({
      where: {
        projectId: input.projectId,
        userId: input.userId,
        pathname: input.pathname,
      },
      data: {
        processingStatus: ProjectDocumentProcessingStatus.QUEUED,
        processingError: null,
        reprocessCount: { increment: 1 },
      },
    });
  },

  async markAllQueuedForProject(input: { projectId: string; userId: string }) {
    return db.projectDocument.updateMany({
      where: {
        projectId: input.projectId,
        userId: input.userId,
      },
      data: {
        processingStatus: ProjectDocumentProcessingStatus.QUEUED,
        processingError: null,
      },
    });
  },
};
