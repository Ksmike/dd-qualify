import {
  DiligenceCoreQuestion,
  DiligenceStageName,
} from "@/lib/generated/prisma/client";

export const DILIGENCE_STAGE_SEQUENCE: DiligenceStageName[] = [
  DiligenceStageName.DOCUMENT_EXTRACTION,
  DiligenceStageName.DOCUMENT_CLASSIFICATION,
  DiligenceStageName.EVIDENCE_INDEXING,
  DiligenceStageName.ENTITY_EXTRACTION,
  DiligenceStageName.CLAIM_EXTRACTION,
  DiligenceStageName.CORROBORATION,
  DiligenceStageName.Q1_IDENTITY_AND_OWNERSHIP,
  DiligenceStageName.Q2_PRODUCT_AND_TECHNOLOGY,
  DiligenceStageName.Q3_MARKET_AND_TRACTION,
  DiligenceStageName.Q4_EXECUTION_CAPABILITY,
  DiligenceStageName.Q5_BUSINESS_MODEL_VIABILITY,
  DiligenceStageName.Q6_RISK_ANALYSIS,
  DiligenceStageName.Q8_FAILURE_MODES_AND_FRAGILITY,
  DiligenceStageName.OPEN_QUESTIONS,
  DiligenceStageName.EXECUTIVE_SUMMARY,
  DiligenceStageName.FINAL_REPORT,
];

export const STAGE_TO_QUESTION: Partial<
  Record<DiligenceStageName, DiligenceCoreQuestion>
> = {
  [DiligenceStageName.Q1_IDENTITY_AND_OWNERSHIP]: DiligenceCoreQuestion.Q1_IDENTITY,
  [DiligenceStageName.Q2_PRODUCT_AND_TECHNOLOGY]: DiligenceCoreQuestion.Q2_PRODUCT,
  [DiligenceStageName.Q3_MARKET_AND_TRACTION]: DiligenceCoreQuestion.Q3_MARKET,
  [DiligenceStageName.Q4_EXECUTION_CAPABILITY]: DiligenceCoreQuestion.Q4_EXECUTION,
  [DiligenceStageName.Q5_BUSINESS_MODEL_VIABILITY]: DiligenceCoreQuestion.Q5_BUSINESS_MODEL,
  [DiligenceStageName.Q6_RISK_ANALYSIS]: DiligenceCoreQuestion.Q6_RISKS,
  [DiligenceStageName.Q8_FAILURE_MODES_AND_FRAGILITY]: DiligenceCoreQuestion.Q8_FAILURE_MODES,
};

export function getStageProgressPercent(stage: DiligenceStageName): number {
  const index = DILIGENCE_STAGE_SEQUENCE.indexOf(stage);
  if (index < 0) {
    return 0;
  }
  return Math.round(((index + 1) / DILIGENCE_STAGE_SEQUENCE.length) * 100);
}

export function getNextStage(
  currentStage: DiligenceStageName | null
): DiligenceStageName | null {
  if (!currentStage) {
    return DILIGENCE_STAGE_SEQUENCE[0] ?? null;
  }

  const currentIndex = DILIGENCE_STAGE_SEQUENCE.indexOf(currentStage);
  if (currentIndex < 0) {
    return DILIGENCE_STAGE_SEQUENCE[0] ?? null;
  }

  return DILIGENCE_STAGE_SEQUENCE[currentIndex + 1] ?? null;
}
