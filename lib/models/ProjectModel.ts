import { db } from "@/lib/db";

export type ProjectStatus = "inprogress" | "complete" | "rejected";

export const ProjectModel = {
  async countByUserId(userId: string): Promise<number> {
    return db.project.count({
      where: { userId },
    });
  },

  async listByUserId(
    userId: string
  ): Promise<Array<{ id: string; name: string; status: ProjectStatus }>> {
    return db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });
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
    return db.project.findFirst({
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
  },

  async createForUser(input: { name: string; userId: string }) {
    return db.project.create({
      data: {
        name: input.name,
        userId: input.userId,
      },
    });
  },
};
