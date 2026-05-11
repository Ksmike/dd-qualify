## Prisma Setup

This project uses Prisma 7 with the `prisma-client` generator and a multi-file schema:

- Root config: `prisma/schema.prisma` (generator + datasource)
- Domain models: `prisma/models/*.prisma`
- Runtime client output: `lib/generated/prisma/`

Database access is centralized through `lib/db.ts` using `PrismaPg` adapter.

## Schema Domains

### 1) Identity + Auth

From `prisma/models/user.prisma` and `prisma/models/auth.prisma`:

- `User`
- `Account`
- `Session`
- `VerificationToken`

Purpose:
- Application identity and login/session state for Auth.js.

Key points:
- `User.email` is unique.
- `User.password` is nullable to support OAuth-only users.
- `User.locale` defaults to `"en"`.
- `Account` enforces `@@unique([provider, providerAccountId])`.
- `Session.sessionToken` is unique.
- `VerificationToken` enforces `@@unique([identifier, token])`.

### 2) Project Workspace

From `prisma/models/project.prisma` and `prisma/models/project-document.prisma`:

- `Project`
- `ProjectDocument`
- enum `ProjectStatus`
- enum `ProjectDocumentProcessingStatus`

Purpose:
- Represents a diligence workspace (`Project`) and uploaded source files (`ProjectDocument`).

Key points:
- `Project` belongs to one `User`.
- `Project.status` is one of `DRAFT`, `IN_PROGRESS`, `REVIEWED`, `COMPLETE`, `REJECTED`.
- `Project` has direct relations to all diligence output tables, not just jobs and documents.
- `ProjectDocument` stores file metadata/pathname and processing state.
- `ProjectDocument.processingStatus` is one of `QUEUED`, `PROCESSING`, `PROCESSED`, `FAILED`.
- Cascade delete removes project children when a project is deleted.
- `ProjectDocument` enforces `@@unique([projectId, pathname])` to avoid duplicate paths within a project.

### 3) API Key Management

From `prisma/models/api-key.prisma`:

- `UserApiKey`
- enum `ApiKeyProvider` (`OPENAI`, `ANTHROPIC`, `GOOGLE`)

Purpose:
- Encrypted per-user model credentials and provider defaults.

Key points:
- One key per provider per user via `@@unique([userId, provider])`.
- `enabled` allows a key to be disabled without deletion.
- Validation state is captured with `lastValidatedAt` and `validationError`.

### 4) Diligence Execution and Outputs

From `prisma/models/diligence.prisma`:

- Execution control:
  - `DiligenceJob`
  - `DiligenceStageRun`
  - enums `DiligenceJobStatus`, `DiligenceStageName`, `DiligenceStageStatus`
- Input/output artifacts:
  - `DiligenceArtifact`
  - `DiligenceChunk`
  - enums `DiligenceArtifactType`, `DiligenceStorageProvider`
- Analytical entities:
  - `DiligenceEntity`
  - `DiligenceClaim`
  - `DiligenceFinding`
  - `DiligenceContradiction`
  - enums `DiligenceFindingType`, `DiligenceClaimStatus`
- Structured question framework:
  - `DiligenceQuestionAnswer`
  - `DiligenceEvidenceGap`
  - `DiligenceOpenQuestion`
  - `DiligenceDocumentClassification`
  - enum `DiligenceCoreQuestion`

Purpose:
- Tracks staged pipeline progress and persists all generated diligence intelligence.

Key points:
- `DiligenceJob` stores provider/model selection, fallback providers, workflow run ID, token usage, and estimated cost.
- `DiligenceStageName` currently includes:
  - `DOCUMENT_EXTRACTION`
  - `DOCUMENT_CLASSIFICATION`
  - `EVIDENCE_INDEXING`
  - `ENTITY_EXTRACTION`
  - `CLAIM_EXTRACTION`
  - `CORROBORATION`
  - `Q1_IDENTITY_AND_OWNERSHIP`
  - `Q2_PRODUCT_AND_TECHNOLOGY`
  - `Q3_MARKET_AND_TRACTION`
  - `Q4_EXECUTION_CAPABILITY`
  - `Q5_BUSINESS_MODEL_VIABILITY`
  - `Q6_RISK_ANALYSIS`
  - `Q7_EVIDENCE_QUALITY`
  - `Q8_FAILURE_MODES_AND_FRAGILITY`
  - `OPEN_QUESTIONS`
  - `EXECUTIVE_SUMMARY`
  - `FINAL_REPORT`
- `DiligenceArtifact` supports multiple storage backends and artifact types including `OCR_OUTPUT`, `MODEL_TRACE`, `EVIDENCE_MAP`, and `EXPORT_BUNDLE`.
- `DiligenceQuestionAnswer` enforces `@@unique([jobId, question])`.
- `DiligenceDocumentClassification` enforces `@@unique([jobId, documentPathname])`.

## Entity Relationship Overview

```mermaid
erDiagram
  User ||--o{ Project : owns
  User ||--o{ UserApiKey : configures
  User ||--o{ ProjectDocument : uploads
  User ||--o{ DiligenceJob : runs

  Project ||--o{ ProjectDocument : contains
  Project ||--o{ DiligenceJob : executes

  DiligenceJob ||--o{ DiligenceStageRun : tracks
  DiligenceJob ||--o{ DiligenceArtifact : emits
  DiligenceJob ||--o{ DiligenceChunk : indexes
  DiligenceJob ||--o{ DiligenceEntity : extracts
  DiligenceJob ||--o{ DiligenceClaim : extracts
  DiligenceJob ||--o{ DiligenceFinding : identifies
  DiligenceJob ||--o{ DiligenceContradiction : detects
  DiligenceJob ||--o{ DiligenceQuestionAnswer : answers
  DiligenceJob ||--o{ DiligenceEvidenceGap : records
  DiligenceJob ||--o{ DiligenceOpenQuestion : proposes
  DiligenceJob ||--o{ DiligenceDocumentClassification : classifies

  UserApiKey ||--o{ DiligenceJob : selected_for
```

## Indexing and Query Patterns

Important index patterns in current schema:

- Core ownership / scoping:
  - `Project @@index([userId])`
  - `ProjectDocument @@index([userId, projectId])`
  - `UserApiKey @@index([userId])`
- Job retrieval and queueing:
  - `DiligenceJob @@index([projectId, createdAt])`
  - `DiligenceJob @@index([userId, createdAt])`
  - `DiligenceJob @@index([status])`
  - `DiligenceJob @@index([status, priority])`
  - `DiligenceJob @@index([workflowRunId])`
- Stage run lookups:
  - `DiligenceStageRun @@unique([jobId, stage])`
  - `DiligenceStageRun @@index([jobId, status])`
- Document processing:
  - `ProjectDocument @@index([projectId, processingStatus])`
- Project-oriented analysis reads:
  - model-level indexes on `projectId`, `jobId`, and status/type fields across chunks, entities, claims, findings, contradictions, answers, evidence gaps, open questions, and classifications.

These support:
- "latest job for project"
- "stage-by-stage progress"
- "latest completed outputs for project"
- "user-scoped project and evidence reads"
- "document processing queues by project"
- "resume workflow execution by `workflowRunId`"

## Design Decisions

- `userId` is duplicated across child diligence tables intentionally:
  - allows direct row-level filtering by user without mandatory joins through `Project`/`DiligenceJob`.
- JSON fields are used for opaque structured outputs and references:
  - `metadata`, `chunkRefs`, `evidenceRefs`, `structured`, `outputJson`, `topicsCovered`, `contradictions`, `fallbackProviders`.
- Heavy text (`DiligenceChunk.text`) and outputs are stored in DB for deterministic replay and enquiry grounding.
- Per-job uniqueness constraints keep stage outputs, question answers, and document classifications deterministic.

## Migration / Generate Commands

After changing schema files:

```bash
yarn prisma generate
yarn prisma migrate dev
```
