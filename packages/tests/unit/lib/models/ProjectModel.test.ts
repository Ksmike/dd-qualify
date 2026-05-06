import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb } from "../../../mocks/db";

const { ProjectModel } = await import("@/lib/models/ProjectModel");

describe("ProjectModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("countByUserId", () => {
    it("returns the count from db.project.count", async () => {
      mockDb.project.count.mockResolvedValue(5);

      const result = await ProjectModel.countByUserId("user-1");

      expect(result).toBe(5);
      expect(mockDb.project.count).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });

    it("returns 0 when user has no projects", async () => {
      mockDb.project.count.mockResolvedValue(0);

      const result = await ProjectModel.countByUserId("user-2");

      expect(result).toBe(0);
    });
  });

  describe("listByUserId", () => {
    it("returns projects with normalized status", async () => {
      mockDb.project.findMany.mockResolvedValue([
        { id: "p1", name: "Project A", status: "draft" },
        { id: "p2", name: "Project B", status: "inprogress" },
      ]);

      const result = await ProjectModel.listByUserId("user-1");

      expect(result).toEqual([
        { id: "p1", name: "Project A", status: "draft" },
        { id: "p2", name: "Project B", status: "inprogress" },
      ]);
      expect(mockDb.project.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true },
      });
    });

    it("defaults unknown status to draft", async () => {
      mockDb.project.findMany.mockResolvedValue([
        { id: "p1", name: "Project A", status: "unknown_status" },
      ]);

      const result = await ProjectModel.listByUserId("user-1");

      expect(result[0].status).toBe("draft");
    });

    it("returns empty array when user has no projects", async () => {
      mockDb.project.findMany.mockResolvedValue([]);

      const result = await ProjectModel.listByUserId("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("findByIdForUser", () => {
    it("returns project with normalized status when found", async () => {
      const createdAt = new Date("2024-01-01");
      mockDb.project.findFirst.mockResolvedValue({
        id: "p1",
        name: "Project A",
        status: "complete",
        createdAt,
      });

      const result = await ProjectModel.findByIdForUser({
        projectId: "p1",
        userId: "user-1",
      });

      expect(result).toEqual({
        id: "p1",
        name: "Project A",
        status: "complete",
        createdAt,
      });
      expect(mockDb.project.findFirst).toHaveBeenCalledWith({
        where: { id: "p1", userId: "user-1" },
        select: { id: true, name: true, status: true, createdAt: true },
      });
    });

    it("returns null when project is not found", async () => {
      mockDb.project.findFirst.mockResolvedValue(null);

      const result = await ProjectModel.findByIdForUser({
        projectId: "missing",
        userId: "user-1",
      });

      expect(result).toBeNull();
    });

    it("defaults unknown status to draft", async () => {
      mockDb.project.findFirst.mockResolvedValue({
        id: "p1",
        name: "Project A",
        status: "invalid",
        createdAt: new Date(),
      });

      const result = await ProjectModel.findByIdForUser({
        projectId: "p1",
        userId: "user-1",
      });

      expect(result?.status).toBe("draft");
    });
  });
});
