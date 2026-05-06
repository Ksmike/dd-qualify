-- AlterTable
ALTER TABLE "DiligenceEvidenceGap" ADD COLUMN     "sourceStage" "DiligenceStageName";

-- CreateTable
CREATE TABLE "DiligenceDocumentClassification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentPathname" TEXT NOT NULL,
    "documentFilename" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vintage" TEXT,
    "authoritativeness" TEXT NOT NULL,
    "relevance" TEXT NOT NULL,
    "topicsCovered" JSONB,
    "confidence" DOUBLE PRECISION,
    "chunkRefs" JSONB,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiligenceDocumentClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiligenceDocumentClassification_projectId_idx" ON "DiligenceDocumentClassification"("projectId");

-- CreateIndex
CREATE INDEX "DiligenceDocumentClassification_jobId_idx" ON "DiligenceDocumentClassification"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceDocumentClassification_jobId_documentPathname_key" ON "DiligenceDocumentClassification"("jobId", "documentPathname");

-- CreateIndex
CREATE INDEX "DiligenceEvidenceGap_jobId_sourceStage_idx" ON "DiligenceEvidenceGap"("jobId", "sourceStage");

-- AddForeignKey
ALTER TABLE "DiligenceDocumentClassification" ADD CONSTRAINT "DiligenceDocumentClassification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceDocumentClassification" ADD CONSTRAINT "DiligenceDocumentClassification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceDocumentClassification" ADD CONSTRAINT "DiligenceDocumentClassification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
