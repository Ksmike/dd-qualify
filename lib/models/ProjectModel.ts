import { db } from "@/lib/db";

const PROJECT_STATUSES = [
  "draft",
  "inprogress",
  "complete",
  "rejected",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

function toProjectStatus(status: string): ProjectStatus {
  return PROJECT_STATUSES.includes(status as ProjectStatus)
    ? (status as ProjectStatus)
    : "draft";
}

export const ProjectModel = {
  async countByUserId(userId: string): Promise<number> {
    return db.project.count({
      where: { userId },
    });
  },

  async listByUserId(
    userId: string
  ): Promise<Array<{ id: string; name: string; status: ProjectStatus }>> {
    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return projects.map((project) => ({
      ...project,
      status: toProjectStatus(project.status),
    }));
  },

  async findByIdForUser(input: {
    projectId: string;
    userId: string;
  }): Promise<{
    id: string;
    name: string;
    status: ProjectStatus;
    createdAt: Date;
  } | null> {
    const project = await db.project.findFirst({
      where: {
        id: input.projectId,
        userId: input.userId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    if (!project) {
      return null;
    }

    return {
      ...project,
      status: toProjectStatus(project.status),
    };
  },

  async createForUser(input: { name: string; userId: string }) {
    return db.project.create({
      data: {
        name: input.name,
        status: "draft",
        userId: input.userId,
      },
    });
  },

  async updateStatusForUser(input: {
    projectId: string;
    userId: string;
    status: ProjectStatus;
  }): Promise<boolean> {
    const result = await db.project.updateMany({
      where: {
        id: input.projectId,
        userId: input.userId,
      },
      data: {
        status: input.status,
      },
    });

    return result.count > 0;
  },
};
