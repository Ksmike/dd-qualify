import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/generated/prisma/client", () => ({
  DiligenceStageName: {
    DOCUMENT_EXTRACTION: "DOCUMENT_EXTRACTION",
    DOCUMENT_CLASSIFICATION: "DOCUMENT_CLASSIFICATION",
    ENTITY_EXTRACTION: "ENTITY_EXTRACTION",
    CLAIM_EXTRACTION: "CLAIM_EXTRACTION",
    RISK_EXTRACTION: "RISK_EXTRACTION",
    CROSS_DOCUMENT_VALIDATION: "CROSS_DOCUMENT_VALIDATION",
    CONTRADICTION_DETECTION: "CONTRADICTION_DETECTION",
    EVIDENCE_GRAPH_GENERATION: "EVIDENCE_GRAPH_GENERATION",
    EXECUTIVE_SUMMARY_GENERATION: "EXECUTIVE_SUMMARY_GENERATION",
    FINAL_REPORT_GENERATION: "FINAL_REPORT_GENERATION",
  },
}));

const { DILIGENCE_STAGE_SEQUENCE, getStageProgressPercent, getNextStage } =
  await import("@/lib/diligence/stages");

describe("DILIGENCE_STAGE_SEQUENCE", () => {
  it("contains 10 stages", () => {
    expect(DILIGENCE_STAGE_SEQUENCE).toHaveLength(10);
  });

  it("starts with DOCUMENT_EXTRACTION", () => {
    expect(DILIGENCE_STAGE_SEQUENCE[0]).toBe("DOCUMENT_EXTRACTION");
  });

  it("ends with FINAL_REPORT_GENERATION", () => {
    expect(DILIGENCE_STAGE_SEQUENCE[9]).toBe("FINAL_REPORT_GENERATION");
  });
});

describe("getStageProgressPercent", () => {
  it("returns 10 for the first stage", () => {
    expect(getStageProgressPercent("DOCUMENT_EXTRACTION")).toBe(10);
  });

  it("returns 100 for the last stage", () => {
    expect(getStageProgressPercent("FINAL_REPORT_GENERATION")).toBe(100);
  });

  it("returns 50 for the fifth stage", () => {
    expect(getStageProgressPercent("RISK_EXTRACTION")).toBe(50);
  });

  it("returns 0 for an unknown stage", () => {
    expect(getStageProgressPercent("UNKNOWN_STAGE" as any)).toBe(0);
  });
});

describe("getNextStage", () => {
  it("returns the first stage when current is null", () => {
    expect(getNextStage(null)).toBe("DOCUMENT_EXTRACTION");
  });

  it("returns the next stage in sequence", () => {
    expect(getNextStage("DOCUMENT_EXTRACTION")).toBe("DOCUMENT_CLASSIFICATION");
    expect(getNextStage("ENTITY_EXTRACTION")).toBe("CLAIM_EXTRACTION");
  });

  it("returns null after the last stage", () => {
    expect(getNextStage("FINAL_REPORT_GENERATION")).toBeNull();
  });

  it("returns the first stage for an unknown stage", () => {
    expect(getNextStage("UNKNOWN" as any)).toBe("DOCUMENT_EXTRACTION");
  });
});
