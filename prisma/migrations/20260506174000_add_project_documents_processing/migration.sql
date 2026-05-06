-- CreateEnum
CREATE TYPE "ProjectDocumentProcessingStatus" AS ENUM (
    'QUEUED',
    'PROCESSING',
    'PROCESSED',
    'FAILED'
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "processingStatus" "ProjectDocumentProcessingStatus" NOT NULL DEFAULT 'QUEUED',
    "processingError" TEXT,
    "reprocessCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastProcessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_projectId_pathname_key" ON "ProjectDocument"("projectId", "pathname");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_processingStatus_idx" ON "ProjectDocument"("projectId", "processingStatus");

-- CreateIndex
CREATE INDEX "ProjectDocument_userId_projectId_idx" ON "ProjectDocument"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
