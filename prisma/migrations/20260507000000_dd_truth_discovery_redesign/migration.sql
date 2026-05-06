-- Truth-discovery redesign: question-aligned stages, citeable evidence chain,
-- evidence-gap and open-question typed outputs.
-- Existing in-flight diligence data is incompatible with the new stage architecture
-- and is dropped here. Production deploys must bring no DiligenceJob rows or accept reset.

-- ──────────────────────────────────────────────────────────────
-- 1. Reset diligence working set
-- ──────────────────────────────────────────────────────────────
TRUNCATE TABLE
    "DiligenceArtifact",
    "DiligenceFinding",
    "DiligenceClaim",
    "DiligenceEntity",
    "DiligenceContradiction",
    "DiligenceStageRun",
    "DiligenceJob"
RESTART IDENTITY CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 2. Replace DiligenceStageName enum
-- ──────────────────────────────────────────────────────────────
ALTER TYPE "DiligenceStageName" RENAME TO "DiligenceStageName__old";

CREATE TYPE "DiligenceStageName" AS ENUM (
    'DOCUMENT_EXTRACTION',
    'DOCUMENT_CLASSIFICATION',
    'EVIDENCE_INDEXING',
    'ENTITY_EXTRACTION',
    'CLAIM_EXTRACTION',
    'CORROBORATION',
    'Q1_IDENTITY_AND_OWNERSHIP',
    'Q2_PRODUCT_AND_TECHNOLOGY',
    'Q3_MARKET_AND_TRACTION',
    'Q4_EXECUTION_CAPABILITY',
    'Q5_BUSINESS_MODEL_VIABILITY',
    'Q6_RISK_ANALYSIS',
    'Q8_FAILURE_MODES_AND_FRAGILITY',
    'OPEN_QUESTIONS',
    'EXECUTIVE_SUMMARY',
    'FINAL_REPORT'
);

-- Tables were truncated above, so USING NULL is safe.
ALTER TABLE "DiligenceJob"
    ALTER COLUMN "currentStage" TYPE "DiligenceStageName" USING NULL;
ALTER TABLE "DiligenceStageRun"
    ALTER COLUMN "stage" TYPE "DiligenceStageName" USING NULL;
ALTER TABLE "DiligenceArtifact"
    ALTER COLUMN "stage" TYPE "DiligenceStageName" USING NULL;

DROP TYPE "DiligenceStageName__old";

-- ──────────────────────────────────────────────────────────────
-- 3. New DiligenceCoreQuestion enum
-- ──────────────────────────────────────────────────────────────
CREATE TYPE "DiligenceCoreQuestion" AS ENUM (
    'Q1_IDENTITY',
    'Q2_PRODUCT',
    'Q3_MARKET',
    'Q4_EXECUTION',
    'Q5_BUSINESS_MODEL',
    'Q6_RISKS',
    'Q7_EVIDENCE',
    'Q8_FAILURE_MODES'
);

-- ──────────────────────────────────────────────────────────────
-- 4. Citation chain & corroboration columns on existing models
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "DiligenceClaim"
    ADD COLUMN "chunkRefs" JSONB,
    ADD COLUMN "sourceCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DiligenceFinding"
    ADD COLUMN "chunkRefs" JSONB,
    ADD COLUMN "sourceCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "severity" TEXT;

ALTER TABLE "DiligenceEntity"
    ADD COLUMN "chunkRefs" JSONB,
    ADD COLUMN "sourceCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DiligenceContradiction"
    ADD COLUMN "chunkRefs" JSONB,
    ADD COLUMN "severity" TEXT;

-- ──────────────────────────────────────────────────────────────
-- 5. DiligenceChunk: citeable spans
-- ──────────────────────────────────────────────────────────────
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
CREATE UNIQUE INDEX "DiligenceChunk_jobId_documentPathname_chunkIndex_key"
    ON "DiligenceChunk"("jobId", "documentPathname", "chunkIndex");
CREATE INDEX "DiligenceChunk_jobId_idx" ON "DiligenceChunk"("jobId");
CREATE INDEX "DiligenceChunk_projectId_idx" ON "DiligenceChunk"("projectId");
ALTER TABLE "DiligenceChunk"
    ADD CONSTRAINT "DiligenceChunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceChunk_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 6. DiligenceQuestionAnswer: one row per (job, core question)
-- ──────────────────────────────────────────────────────────────
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
CREATE UNIQUE INDEX "DiligenceQuestionAnswer_jobId_question_key"
    ON "DiligenceQuestionAnswer"("jobId", "question");
CREATE INDEX "DiligenceQuestionAnswer_projectId_idx" ON "DiligenceQuestionAnswer"("projectId");
ALTER TABLE "DiligenceQuestionAnswer"
    ADD CONSTRAINT "DiligenceQuestionAnswer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceQuestionAnswer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceQuestionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 7. DiligenceEvidenceGap: looked-for-but-not-found
-- ──────────────────────────────────────────────────────────────
CREATE TABLE "DiligenceEvidenceGap" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" "DiligenceCoreQuestion" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "suggestedSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiligenceEvidenceGap_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiligenceEvidenceGap_jobId_idx" ON "DiligenceEvidenceGap"("jobId");
CREATE INDEX "DiligenceEvidenceGap_projectId_question_idx" ON "DiligenceEvidenceGap"("projectId", "question");
ALTER TABLE "DiligenceEvidenceGap"
    ADD CONSTRAINT "DiligenceEvidenceGap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceEvidenceGap_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceEvidenceGap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 8. DiligenceOpenQuestion: categorized follow-ups
-- ──────────────────────────────────────────────────────────────
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
CREATE INDEX "DiligenceOpenQuestion_jobId_idx" ON "DiligenceOpenQuestion"("jobId");
CREATE INDEX "DiligenceOpenQuestion_projectId_category_priority_idx"
    ON "DiligenceOpenQuestion"("projectId", "category", "priority");
ALTER TABLE "DiligenceOpenQuestion"
    ADD CONSTRAINT "DiligenceOpenQuestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceOpenQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DiligenceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "DiligenceOpenQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
