-- CreateEnum
CREATE TYPE "ApiKeyProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE');

-- CreateEnum
CREATE TYPE "DiligenceJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_INPUT', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DiligenceStageName" AS ENUM ('DOCUMENT_EXTRACTION', 'DOCUMENT_CLASSIFICATION', 'EVIDENCE_INDEXING', 'ENTITY_EXTRACTION', 'CLAIM_EXTRACTION', 'CORROBORATION', 'Q1_IDENTITY_AND_OWNERSHIP', 'Q2_PRODUCT_AND_TECHNOLOGY', 'Q3_MARKET_AND_TRACTION', 'Q4_EXECUTION_CAPABILITY', 'Q5_BUSINESS_MODEL_VIABILITY', 'Q6_RISK_ANALYSIS', 'Q8_FAILURE_MODES_AND_FRAGILITY', 'OPEN_QUESTIONS', 'EXECUTIVE_SUMMARY', 'FINAL_REPORT');

-- CreateEnum
CREATE TYPE "DiligenceStageStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DiligenceArtifactType" AS ENUM ('ORIGINAL_DOCUMENT', 'EXTRACTED_TEXT', 'OCR_OUTPUT', 'DOCUMENT_CHUNK', 'EMBEDDING_SNAPSHOT', 'INTERMEDIATE_JSON', 'MODEL_TRACE', 'EVIDENCE_MAP', 'GENERATED_REPORT', 'EXPORT_BUNDLE');

-- CreateEnum
CREATE TYPE "DiligenceStorageProvider" AS ENUM ('VERCEL_BLOB', 'DATABASE', 'JSON_COLUMN', 'VECTOR_DATABASE', 'OBJECT_STORAGE', 'TEMPORARY_STORAGE');

-- CreateEnum
CREATE TYPE "DiligenceFindingType" AS ENUM ('RISK', 'OPPORTUNITY', 'WARNING', 'OBSERVATION');

-- CreateEnum
CREATE TYPE "DiligenceClaimStatus" AS ENUM ('SUPPORTED', 'CONTRADICTED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "DiligenceCoreQuestion" AS ENUM ('Q1_IDENTITY', 'Q2_PRODUCT', 'Q3_MARKET', 'Q4_EXECUTION', 'Q5_BUSINESS_MODEL', 'Q6_RISKS', 'Q7_EVIDENCE', 'Q8_FAILURE_MODES');

-- CreateEnum
CREATE TYPE "ProjectDocumentProcessingStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEWED', 'COMPLETE', 'REJECTED');

-- CreateTable
CREATE TABLE "UserApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "ApiKeyProvider" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "defaultModel" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastValidatedAt" TIMESTAMP(3),
    "validationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
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
    "priority" INTEGER NOT NULL DEFAULT 0,
    "workflowRunId" TEXT,
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
CREATE TABLE "DiligenceChunk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentPathname" TEXT NOT NULL,
    "documentFilename" TEXT NOT NULL,
    "page" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiligenceChunk_pkey" PRIMARY KEY ("id")
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
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "chunkRefs" JSONB,
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
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "chunkRefs" JSONB,
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
    "severity" TEXT,
    "confidence" DOUBLE PRECISION,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "chunkRefs" JSONB,
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
    "severity" TEXT,
    "confidence" DOUBLE PRECISION,
    "chunkRefs" JSONB,
    "evidenceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceContradiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceQuestionAnswer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" "DiligenceCoreQuestion" NOT NULL,
    "summary" TEXT NOT NULL,
    "structured" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "chunkRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiligenceQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiligenceEvidenceGap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" "DiligenceCoreQuestion" NOT NULL,
    "sourceStage" "DiligenceStageName",
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "suggestedSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiligenceEvidenceGap_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "DiligenceOpenQuestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "DiligenceCoreQuestion" NOT NULL,
    "question" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "chunkRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiligenceOpenQuestion_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserApiKey_userId_idx" ON "UserApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserApiKey_userId_provider_key" ON "UserApiKey"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "DiligenceJob_projectId_createdAt_idx" ON "DiligenceJob"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "DiligenceJob_userId_createdAt_idx" ON "DiligenceJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DiligenceJob_status_idx" ON "DiligenceJob"("status");

-- CreateIndex
CREATE INDEX "DiligenceJob_status_priority_idx" ON "DiligenceJob"("status", "priority");

-- CreateIndex
CREATE INDEX "DiligenceJob_workflowRunId_idx" ON "DiligenceJob"("workflowRunId");

-- CreateIndex
CREATE INDEX "DiligenceStageRun_jobId_status_idx" ON "DiligenceStageRun"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceStageRun_jobId_stage_key" ON "DiligenceStageRun"("jobId", "stage");

-- CreateIndex
CREATE INDEX "DiligenceArtifact_projectId_type_idx" ON "DiligenceArtifact"("projectId", "type");

-- CreateIndex
CREATE INDEX "DiligenceArtifact_jobId_stage_idx" ON "DiligenceArtifact"("jobId", "stage");

-- CreateIndex
CREATE INDEX "DiligenceArtifact_storageProvider_idx" ON "DiligenceArtifact"("storageProvider");

-- CreateIndex
CREATE INDEX "DiligenceChunk_jobId_idx" ON "DiligenceChunk"("jobId");

-- CreateIndex
CREATE INDEX "DiligenceChunk_projectId_idx" ON "DiligenceChunk"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceChunk_jobId_documentPathname_chunkIndex_key" ON "DiligenceChunk"("jobId", "documentPathname", "chunkIndex");

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

-- CreateIndex
CREATE INDEX "DiligenceQuestionAnswer_projectId_idx" ON "DiligenceQuestionAnswer"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceQuestionAnswer_jobId_question_key" ON "DiligenceQuestionAnswer"("jobId", "question");

-- CreateIndex
CREATE INDEX "DiligenceEvidenceGap_jobId_idx" ON "DiligenceEvidenceGap"("jobId");

-- CreateIndex
CREATE INDEX "DiligenceEvidenceGap_jobId_sourceStage_idx" ON "DiligenceEvidenceGap"("jobId", "sourceStage");

-- CreateIndex
CREATE INDEX "DiligenceEvidenceGap_projectId_question_idx" ON "DiligenceEvidenceGap"("projectId", "question");

-- CreateIndex
CREATE INDEX "DiligenceDocumentClassification_projectId_idx" ON "DiligenceDocumentClassification"("projectId");

-- CreateIndex
CREATE INDEX "DiligenceDocumentClassification_jobId_idx" ON "DiligenceDocumentClassification"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "DiligenceDocumentClassification_jobId_documentPathname_key" ON "DiligenceDocumentClassification"("jobId", "documentPathname");

-- CreateIndex
CREATE INDEX "DiligenceOpenQuestion_jobId_idx" ON "DiligenceOpenQuestion"("jobId");

-- CreateIndex
CREATE INDEX "DiligenceOpenQuestion_projectId_category_priority_idx" ON "DiligenceOpenQuestion"("projectId", "category", "priority");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_processingStatus_idx" ON "ProjectDocument"("projectId", "processingStatus");

-- CreateIndex
CREATE INDEX "ProjectDocument_userId_projectId_idx" ON "ProjectDocument"("userId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_projectId_pathname_key" ON "ProjectDocument"("projectId", "pathname");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceJob" ADD CONSTRAINT "DiligenceJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceJob" ADD CONSTRAINT "DiligenceJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceJob" ADD CONSTRAINT "DiligenceJob_userApiKeyId_fkey" FOREIGN KEY ("userApiKeyId") REFERENCES "UserApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceStageRun" ADD CONSTRAINT "DiligenceStageRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceArtifact" ADD CONSTRAINT "DiligenceArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceArtifact" ADD CONSTRAINT "DiligenceArtifact_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceArtifact" ADD CONSTRAINT "DiligenceArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceChunk" ADD CONSTRAINT "DiligenceChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceChunk" ADD CONSTRAINT "DiligenceChunk_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceChunk" ADD CONSTRAINT "DiligenceChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEntity" ADD CONSTRAINT "DiligenceEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEntity" ADD CONSTRAINT "DiligenceEntity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEntity" ADD CONSTRAINT "DiligenceEntity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceClaim" ADD CONSTRAINT "DiligenceClaim_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceClaim" ADD CONSTRAINT "DiligenceClaim_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceClaim" ADD CONSTRAINT "DiligenceClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceFinding" ADD CONSTRAINT "DiligenceFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceFinding" ADD CONSTRAINT "DiligenceFinding_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceFinding" ADD CONSTRAINT "DiligenceFinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceContradiction" ADD CONSTRAINT "DiligenceContradiction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceContradiction" ADD CONSTRAINT "DiligenceContradiction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceContradiction" ADD CONSTRAINT "DiligenceContradiction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceQuestionAnswer" ADD CONSTRAINT "DiligenceQuestionAnswer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceQuestionAnswer" ADD CONSTRAINT "DiligenceQuestionAnswer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceQuestionAnswer" ADD CONSTRAINT "DiligenceQuestionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEvidenceGap" ADD CONSTRAINT "DiligenceEvidenceGap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEvidenceGap" ADD CONSTRAINT "DiligenceEvidenceGap_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceEvidenceGap" ADD CONSTRAINT "DiligenceEvidenceGap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceDocumentClassification" ADD CONSTRAINT "DiligenceDocumentClassification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceDocumentClassification" ADD CONSTRAINT "DiligenceDocumentClassification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceDocumentClassification" ADD CONSTRAINT "DiligenceDocumentClassification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceOpenQuestion" ADD CONSTRAINT "DiligenceOpenQuestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceOpenQuestion" ADD CONSTRAINT "DiligenceOpenQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiligenceOpenQuestion" ADD CONSTRAINT "DiligenceOpenQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
