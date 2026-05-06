import { DiligenceStageName } from "@/lib/generated/prisma/client";

export const DILIGENCE_STAGE_SEQUENCE: DiligenceStageName[] = [
  DiligenceStageName.DOCUMENT_EXTRACTION,
  DiligenceStageName.DOCUMENT_CLASSIFICATION,
  DiligenceStageName.ENTITY_EXTRACTION,
  DiligenceStageName.CLAIM_EXTRACTION,
  DiligenceStageName.RISK_EXTRACTION,
  DiligenceStageName.CROSS_DOCUMENT_VALIDATION,
  DiligenceStageName.CONTRADICTION_DETECTION,
  DiligenceStageName.EVIDENCE_GRAPH_GENERATION,
  DiligenceStageName.EXECUTIVE_SUMMARY_GENERATION,
  DiligenceStageName.FINAL_REPORT_GENERATION,
];

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
