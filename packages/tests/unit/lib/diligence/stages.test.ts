import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/generated/prisma/client", () => ({
  DiligenceStageName: {
    DOCUMENT_EXTRACTION: "DOCUMENT_EXTRACTION",
    DOCUMENT_CLASSIFICATION: "DOCUMENT_CLASSIFICATION",
    EVIDENCE_INDEXING: "EVIDENCE_INDEXING",
    ENTITY_EXTRACTION: "ENTITY_EXTRACTION",
    CLAIM_EXTRACTION: "CLAIM_EXTRACTION",
    CORROBORATION: "CORROBORATION",
    Q1_IDENTITY_AND_OWNERSHIP: "Q1_IDENTITY_AND_OWNERSHIP",
    Q2_PRODUCT_AND_TECHNOLOGY: "Q2_PRODUCT_AND_TECHNOLOGY",
    Q3_MARKET_AND_TRACTION: "Q3_MARKET_AND_TRACTION",
    Q4_EXECUTION_CAPABILITY: "Q4_EXECUTION_CAPABILITY",
    Q5_BUSINESS_MODEL_VIABILITY: "Q5_BUSINESS_MODEL_VIABILITY",
    Q6_RISK_ANALYSIS: "Q6_RISK_ANALYSIS",
    Q8_FAILURE_MODES_AND_FRAGILITY: "Q8_FAILURE_MODES_AND_FRAGILITY",
    OPEN_QUESTIONS: "OPEN_QUESTIONS",
    EXECUTIVE_SUMMARY: "EXECUTIVE_SUMMARY",
    FINAL_REPORT: "FINAL_REPORT",
  },
  DiligenceCoreQuestion: {
    Q1_IDENTITY: "Q1_IDENTITY",
    Q2_PRODUCT: "Q2_PRODUCT",
    Q3_MARKET: "Q3_MARKET",
    Q4_EXECUTION: "Q4_EXECUTION",
    Q5_BUSINESS_MODEL: "Q5_BUSINESS_MODEL",
    Q6_RISKS: "Q6_RISKS",
    Q7_EVIDENCE: "Q7_EVIDENCE",
    Q8_FAILURE_MODES: "Q8_FAILURE_MODES",
  },
}));

const {
  DILIGENCE_STAGE_SEQUENCE,
  STAGE_TO_QUESTION,
  getStageProgressPercent,
  getNextStage,
} = await import("@/lib/diligence/stages");

describe("DILIGENCE_STAGE_SEQUENCE", () => {
  it("contains 16 stages", () => {
    expect(DILIGENCE_STAGE_SEQUENCE).toHaveLength(16);
  });

  it("starts with DOCUMENT_EXTRACTION", () => {
    expect(DILIGENCE_STAGE_SEQUENCE[0]).toBe("DOCUMENT_EXTRACTION");
  });

  it("ends with FINAL_REPORT", () => {
    expect(DILIGENCE_STAGE_SEQUENCE[DILIGENCE_STAGE_SEQUENCE.length - 1]).toBe(
      "FINAL_REPORT"
    );
  });

  it("places CORROBORATION after CLAIM_EXTRACTION", () => {
    const claimIdx = DILIGENCE_STAGE_SEQUENCE.indexOf("CLAIM_EXTRACTION");
    const corrobIdx = DILIGENCE_STAGE_SEQUENCE.indexOf("CORROBORATION");
    expect(corrobIdx).toBeGreaterThan(claimIdx);
  });
});

describe("STAGE_TO_QUESTION", () => {
  it("maps each Q-stage to its core question", () => {
    expect(STAGE_TO_QUESTION.Q1_IDENTITY_AND_OWNERSHIP).toBe("Q1_IDENTITY");
    expect(STAGE_TO_QUESTION.Q3_MARKET_AND_TRACTION).toBe("Q3_MARKET");
    expect(STAGE_TO_QUESTION.Q8_FAILURE_MODES_AND_FRAGILITY).toBe(
      "Q8_FAILURE_MODES"
    );
  });

  it("does not map substrate stages", () => {
    expect(STAGE_TO_QUESTION.DOCUMENT_EXTRACTION).toBeUndefined();
    expect(STAGE_TO_QUESTION.CORROBORATION).toBeUndefined();
  });
});

describe("getStageProgressPercent", () => {
  it("returns ~6 for the first stage", () => {
    expect(getStageProgressPercent("DOCUMENT_EXTRACTION")).toBe(6);
  });

  it("returns 100 for the last stage", () => {
    expect(getStageProgressPercent("FINAL_REPORT")).toBe(100);
  });

  it("returns 0 for an unknown stage", () => {
    expect(getStageProgressPercent("UNKNOWN_STAGE" as never)).toBe(0);
  });
});

describe("getNextStage", () => {
  it("returns the first stage when current is null", () => {
    expect(getNextStage(null)).toBe("DOCUMENT_EXTRACTION");
  });

  it("returns the next stage in sequence", () => {
    expect(getNextStage("DOCUMENT_EXTRACTION")).toBe("DOCUMENT_CLASSIFICATION");
    expect(getNextStage("CLAIM_EXTRACTION")).toBe("CORROBORATION");
    expect(getNextStage("Q5_BUSINESS_MODEL_VIABILITY")).toBe("Q6_RISK_ANALYSIS");
  });

  it("returns null after the last stage", () => {
    expect(getNextStage("FINAL_REPORT")).toBeNull();
  });

  it("returns the first stage for an unknown stage", () => {
    expect(getNextStage("UNKNOWN" as never)).toBe("DOCUMENT_EXTRACTION");
  });
});
