import type { DiligenceClaimStatus } from "@/lib/generated/prisma/client";

export type RawClaim = {
  claim: string;
  category?: string;
  quantitative?: boolean;
  value?: string | number | null;
  unit?: string | null;
  period?: string | null;
  chunk_refs?: string[];
};

export type ChunkSourceMap = Map<string, string>; // chunkId -> documentPathname

export type CorroboratedClaim = {
  claim: string;
  category: string | null;
  quantitative: boolean;
  value: string | null;
  unit: string | null;
  period: string | null;
  chunkRefs: string[];
  sourceCount: number;
  status: DiligenceClaimStatus;
  confidence: number;
  contradictedBy: string[]; // claim texts that contradict this one (heuristic)
};

/**
 * Given a flat list of extracted claims (each with citations) plus a chunk → document map,
 * compute each claim's status and confidence by counting *distinct* corroborating documents.
 *
 * Rules (deliberately simple — these are the *truth-discovery* semantics):
 *   - sourceCount = number of distinct documents the claim's chunk_refs touch
 *   - status:
 *       SUPPORTED      if sourceCount >= 2 and no exact-quantitative contradiction is found
 *       CONTRADICTED   if a numeric peer claim in the same category/period exists with a different value
 *       INCONCLUSIVE   otherwise (single-source assertion or unverified)
 *   - confidence:
 *       starts at 0.4 for single-source assertions
 *       +0.2 per additional independent source, capped at 0.95
 *       -0.3 if there is a contradicting peer
 */
export function corroborateClaims(input: {
  claims: RawClaim[];
  chunkToDocument: ChunkSourceMap;
}): CorroboratedClaim[] {
  const peerIndex = buildPeerIndex(input.claims);

  return input.claims.map((claim) => {
    const chunkRefs = (claim.chunk_refs ?? []).filter(
      (ref): ref is string => typeof ref === "string"
    );
    const distinctSources = new Set<string>();
    for (const chunkId of chunkRefs) {
      const document = input.chunkToDocument.get(chunkId);
      if (document) {
        distinctSources.add(document);
      }
    }
    const sourceCount = distinctSources.size;

    const peerKey = peerKeyFor(claim);
    const peers = peerKey ? peerIndex.get(peerKey) ?? [] : [];
    const contradictors = findContradictors(claim, peers);

    let status: DiligenceClaimStatus = "INCONCLUSIVE";
    if (contradictors.length > 0) {
      status = "CONTRADICTED";
    } else if (sourceCount >= 2) {
      status = "SUPPORTED";
    }

    let confidence = 0.4 + Math.max(0, sourceCount - 1) * 0.2;
    if (contradictors.length > 0) {
      confidence -= 0.3;
    }
    confidence = Math.max(0.05, Math.min(0.95, confidence));

    return {
      claim: claim.claim,
      category: claim.category ?? null,
      quantitative: Boolean(claim.quantitative),
      value: normalizeValue(claim.value),
      unit: claim.unit ?? null,
      period: claim.period ?? null,
      chunkRefs,
      sourceCount,
      status,
      confidence,
      contradictedBy: contradictors.map((peer) => peer.claim),
    };
  });
}

function normalizeValue(value: RawClaim["value"]): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === "string" ? value : String(value);
}

function buildPeerIndex(claims: RawClaim[]): Map<string, RawClaim[]> {
  const index = new Map<string, RawClaim[]>();
  for (const claim of claims) {
    const key = peerKeyFor(claim);
    if (!key) {
      continue;
    }
    const existing = index.get(key);
    if (existing) {
      existing.push(claim);
    } else {
      index.set(key, [claim]);
    }
  }
  return index;
}

function peerKeyFor(claim: RawClaim): string | null {
  if (!claim.quantitative) {
    return null;
  }
  if (!claim.category) {
    return null;
  }
  const period = claim.period ?? "_";
  return `${claim.category}::${period}`;
}

function findContradictors(claim: RawClaim, peers: RawClaim[]): RawClaim[] {
  if (!claim.quantitative) {
    return [];
  }
  const claimValue = numericValueOf(claim.value);
  if (claimValue === null) {
    return [];
  }
  return peers.filter((peer) => {
    if (peer === claim) {
      return false;
    }
    const peerValue = numericValueOf(peer.value);
    if (peerValue === null) {
      return false;
    }
    if (peer.unit && claim.unit && peer.unit !== claim.unit) {
      return false;
    }
    if (peerValue === 0 && claimValue === 0) {
      return false;
    }
    const denominator = Math.max(Math.abs(claimValue), Math.abs(peerValue), 1);
    const drift = Math.abs(claimValue - peerValue) / denominator;
    return drift > 0.05;
  });
}

function numericValueOf(value: RawClaim["value"]): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.replace(/[$,\s]/g, "").replace(/%$/, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
