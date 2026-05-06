-- AlterTable
ALTER TABLE "UserApiKey"
ADD COLUMN "defaultModel" TEXT,
ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastValidatedAt" TIMESTAMP(3),
ADD COLUMN "validationError" TEXT;

-- CreateEnum
CREATE TYPE "DiligenceJobStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'WAITING_INPUT',
    'COMPLETED',
    'FAILED',
    'CANCELED'
);

-- CreateEnum
CREATE TYPE "DiligenceStageName" AS ENUM (
    'DOCUMENT_EXTRACTION',
    'DOCUMENT_CLASSIFICATION',
    'ENTITY_EXTRACTION',
    'CLAIM_EXTRACTION',
    'RISK_EXTRACTION',
    'CROSS_DOCUMENT_VALIDATION',
    'CONTRADICTION_DETECTION',
    'EVIDENCE_GRAPH_GENERATION',
    'EXECUTIVE_SUMMARY_GENERATION',
    'FINAL_REPORT_GENERATION'
);

-- CreateEnum
CREATE TYPE "DiligenceStageStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'SKIPPED'
);

-- CreateEnum
CREATE TYPE "DiligenceArtifactType" AS ENUM (
    'ORIGINAL_DOCUMENT',
    'EXTRACTED_TEXT',
    'OCR_OUTPUT',
    'DOCUMENT_CHUNK',
    'EMBEDDING_SNAPSHOT',
    'INTERMEDIATE_JSON',
    'MODEL_TRACE',
    'EVIDENCE_MAP',
    'GENERATED_REPORT',
    'EXPORT_BUNDLE'
);

-- CreateEnum
CREATE TYPE "DiligenceStorageProvider" AS ENUM (
    'VERCEL_BLOB',
    'DATABASE',
    'JSON_COLUMN',
    'VECTOR_DATABASE',
    'OBJECT_STORAGE',
    'TEMPORARY_STORAGE'
);

-- CreateEnum
CREATE TYPE "DiligenceFindingType" AS ENUM (
    'RISK',
    'OPPORTUNITY',
    'WARNING',
    'OBSERVATION'
);

-- CreateEnum
CREATE TYPE "DiligenceClaimStatus" AS ENUM (
    'SUPPORTED',
    'CONTRADICTED',
    'INCONCLUSIVE'
);

-- CreateTable
CREATE TABLE "DiligenceJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userApiKeyId" TEXT,
    "selectedProvider" "ApiKeyProvider" NOT NULL,
    "selectedModel" TEXT NOT NULL,
    "fallbackProviders" JSONB,
    "status" "DiligenceJobStatus" NOT NULL DEFAULT 'QUEUED',
    "currentStage" "DiligenceStageName",
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "inputDocumentCount" INTEGER NOT NULL DEFAULT 0,
    "tokenUsageTotal" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceStageRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" "DiligenceStageName" NOT NULL,
    "status" "DiligenceStageStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "provider" "ApiKeyProvider",
    "model" TEXT,
    "tokenUsageTotal" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION,
    "inputArtifactCount" INTEGER NOT NULL DEFAULT 0,
    "outputArtifactCount" INTEGER NOT NULL DEFAULT 0,
    "outputJson" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceStageRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" "DiligenceStageName",
    "type" "DiligenceArtifactType" NOT NULL,
    "storageProvider" "DiligenceStorageProvider" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiligenceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceEntity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceClaim" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "status" "DiligenceClaimStatus" NOT NULL DEFAULT 'INCONCLUSIVE',
    "confidence" DOUBLE PRECISION,
    "evidenceRefs" JSONB,
    "contradictions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceFinding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DiligenceFindingType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidenceRefs" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceContradiction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statementA" TEXT NOT NULL,
    "statementB" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceContradiction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiligenceJob_projectId_createdAt_idx" ON "DiligenceJob"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "DiligenceJob_userId_createdAt_idx" ON "DiligenceJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DiligenceJob_status_idx" ON "DiligenceJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceStageRun_jobId_stage_key" ON "DiligenceStageRun"("jobId", "stage");

-- CreateIndex
CREATE INDEX "DiligenceStageRun_jobId_status_idx" ON "DiligenceStageRun"("jobId", "status");

-- CreateIndex
CREATE INDEX "DiligenceArtifact_projectId_type_idx" ON "DiligenceArtifact"("projectId", "type");

-- CreateIndex
CREATE INDEX "DiligenceArtifact_jobId_stage_idx" ON "DiligenceArtifact"("jobId", "stage");

-- CreateIndex
CREATE INDEX "DiligenceArtifact_storageProvider_idx" ON "DiligenceArtifact"("storageProvider");

-- CreateIndex
CREATE INDEX "DiligenceEntity_projectId_kind_idx" ON "DiligenceEntity"("projectId", "kind");

-- CreateIndex
CREATE INDEX "DiligenceEntity_jobId_idx" ON "DiligenceEntity"("jobId");

-- CreateIndex
CREATE INDEX "DiligenceClaim_projectId_status_idx" ON "DiligenceClaim"("projectId", "status");

-- CreateIndex
CREATE INDEX "DiligenceClaim_jobId_idx" ON "DiligenceClaim"("jobId");

-- CreateIndex
CREATE INDEX "DiligenceFinding_projectId_type_idx" ON "DiligenceFinding"("projectId", "type");

-- CreateIndex
CREATE INDEX "DiligenceFinding_jobId_idx" ON "DiligenceFinding"("jobId");

-- CreateIndex
CREATE INDEX "DiligenceContradiction_projectId_idx" ON "DiligenceContradiction"("projectId");

-- CreateIndex
CREATE INDEX "DiligenceContradiction_jobId_idx" ON "DiligenceContradiction"("jobId");

-- AddForeignKey
ALTER TABLE "DiligenceJob" ADD CONSTRAINT "DiligenceJob_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceJob" ADD CONSTRAINT "DiligenceJob_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceJob" ADD CONSTRAINT "DiligenceJob_userApiKeyId_fkey"
FOREIGN KEY ("userApiKeyId") REFERENCES "UserApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceStageRun" ADD CONSTRAINT "DiligenceStageRun_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceArtifact" ADD CONSTRAINT "DiligenceArtifact_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceArtifact" ADD CONSTRAINT "DiligenceArtifact_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceArtifact" ADD CONSTRAINT "DiligenceArtifact_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEntity" ADD CONSTRAINT "DiligenceEntity_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEntity" ADD CONSTRAINT "DiligenceEntity_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEntity" ADD CONSTRAINT "DiligenceEntity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceClaim" ADD CONSTRAINT "DiligenceClaim_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceClaim" ADD CONSTRAINT "DiligenceClaim_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceClaim" ADD CONSTRAINT "DiligenceClaim_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceFinding" ADD CONSTRAINT "DiligenceFinding_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceFinding" ADD CONSTRAINT "DiligenceFinding_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceFinding" ADD CONSTRAINT "DiligenceFinding_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceContradiction" ADD CONSTRAINT "DiligenceContradiction_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceContradiction" ADD CONSTRAINT "DiligenceContradiction_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceContradiction" ADD CONSTRAINT "DiligenceContradiction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
