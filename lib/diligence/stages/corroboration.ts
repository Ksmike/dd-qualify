import { db } from "@/lib/db";
import {
  corroborateClaims,
  type RawClaim,
} from "@/lib/diligence/corroboration";
import {
  asNullableString,
  asStringArray,
  loadChunkSourceMap,
  toInputJson,
  type StageContext,
  type StageExecutionResult,
} from "@/lib/diligence/stage-helpers";

export async function runCorroboration(
  ctx: StageContext
): Promise<StageExecutionResult> {
  const claims = await db.diligenceClaim.findMany({
    where: { jobId: ctx.jobId },
    select: {
      id: true,
      claimText: true,
      chunkRefs: true,
      evidenceRefs: true,
    },
  });

  const chunkMap = await loadChunkSourceMap(ctx.jobId);

  const rawClaims: RawClaim[] = claims.map((claim) => {
    const evidence = claim.evidenceRefs as Record<string, unknown> | null;
    return {
      claim: claim.claimText,
      category: asNullableString(evidence?.category) ?? undefined,
      quantitative: Boolean(evidence?.quantitative),
      value: evidence?.value as string | number | null | undefined,
      unit: asNullableString(evidence?.unit) ?? undefined,
      period: asNullableString(evidence?.period) ?? undefined,
      chunk_refs: asStringArray(claim.chunkRefs),
    };
  });

  const corroborated = corroborateClaims({
    claims: rawClaims,
    chunkToDocument: chunkMap,
  });

  let supportedCount = 0;
  let contradictedCount = 0;
  let inconclusiveCount = 0;

  for (let index = 0; index < corroborated.length; index += 1) {
    const claim = corroborated[index];
    const claimRow = claims[index];
    if (!claim || !claimRow) {
      continue;
    }
    if (claim.status === "SUPPORTED") supportedCount += 1;
    else if (claim.status === "CONTRADICTED") contradictedCount += 1;
    else inconclusiveCount += 1;

    await db.diligenceClaim.update({
      where: { id: claimRow.id },
      data: {
        status: claim.status,
        confidence: claim.confidence,
        sourceCount: claim.sourceCount,
        contradictions:
          claim.contradictedBy.length > 0
            ? toInputJson(claim.contradictedBy)
            : undefined,
      },
    });
  }

  return {
    outputJson: {
      items: corroborated.map((c) => ({
        claim: c.claim,
        status: c.status,
        confidence: c.confidence,
        sourceCount: c.sourceCount,
        contradictedBy: c.contradictedBy,
      })),
      summary: `Corroborated ${corroborated.length} claims — supported: ${supportedCount}, contradicted: ${contradictedCount}, inconclusive: ${inconclusiveCount}.`,
      supportedCount,
      contradictedCount,
      inconclusiveCount,
    },
  };
}
