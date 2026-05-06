-- AlterTable
ALTER TABLE "DiligenceJob" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DiligenceJob" ADD COLUMN "workflowRunId" TEXT;

-- CreateIndex
CREATE INDEX "DiligenceJob_status_priority_idx" ON "DiligenceJob"("status", "priority");

-- CreateIndex
CREATE INDEX "DiligenceJob_workflowRunId_idx" ON "DiligenceJob"("workflowRunId");
