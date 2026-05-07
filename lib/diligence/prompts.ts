import {
  DiligenceCoreQuestion,
  DiligenceStageName,
} from "@/lib/generated/prisma/client";

export type StagePromptPlan = {
  systemInstruction: string;
  userInstruction: string;
  outputSchema: string;
  /** Whether the stage benefits from receiving full chunk text vs. only summaries from prior stages. */
  needsFullChunks: boolean;
};

const SYSTEM_BASE = [
  "You are a senior commercial due-diligence analyst working for a venture investor.",
  "Your job is structured truth discovery under uncertainty: every assertion you make MUST cite the chunk IDs that support it.",
  "If you cannot find evidence for something the investor would expect to see, output it as an evidence_gap entry — DO NOT INVENT.",
  "Calibrate confidence honestly: low confidence is more useful than false certainty.",
  "Chunk IDs in the input look like 'chunk_xxx' or 'cmou...'. When you cite, use the exact chunk ID strings from the source list.",
  "Prefer specific over generic. 'Founder Jane Doe was previously CTO at Stripe (per cap-table.pdf p.3)' beats 'experienced founder.'",
].join(" ");

const COMMON_GAP_INSTRUCTION = [
  "evidence_gaps: a JSON array of items the investor would expect that you could not find or confirm.",
  'Each gap: {"title": "what is missing", "description": "what you looked for and why it matters", "severity": "blocker|high|medium|low", "suggested_source": "where this would normally appear (e.g. cap table, audited financials)"}',
].join(" ");

export const QUESTION_DEFINITIONS: Record<
  DiligenceCoreQuestion,
  { title: string; subtitle: string }
> = {
  Q1_IDENTITY: {
    title: "Who are they?",
    subtitle: "Identity, ownership, credibility, key personnel, organisational structure",
  },
  Q2_PRODUCT: {
    title: "What are they building?",
    subtitle: "Product, technology, differentiation, defensibility, IP, architecture",
  },
  Q3_MARKET: {
    title: "Does anyone care?",
    subtitle: "Customer demand, traction, pilots, LOIs, revenue validation, market pull",
  },
  Q4_EXECUTION: {
    title: "Can they execute?",
    subtitle:
      "Founder capability, operational competence, scaling ability, hiring, customer management, delivery reliability",
  },
  Q5_BUSINESS_MODEL: {
    title: "Can the business work?",
    subtitle: "Business model, pricing plausibility, scalability, market realism, economic viability",
  },
  Q6_RISKS: {
    title: "What are the risks?",
    subtitle: "Technical, operational, financial, legal, compliance, security, key-person",
  },
  Q7_EVIDENCE: {
    title: "What evidence supports the claims?",
    subtitle: "Supporting evidence, corroboration, independent validation, source quality, confidence",
  },
  Q8_FAILURE_MODES: {
    title: "What could materially fail?",
    subtitle: "Fragility, contradictions, missing evidence, dependencies, systemic weaknesses, market blockers",
  },
};

export function getStagePromptPlan(stage: DiligenceStageName): StagePromptPlan {
  switch (stage) {
    case DiligenceStageName.DOCUMENT_CLASSIFICATION:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction: [
          "Classify each source document. For each document return:",
          "- type: financial | legal | operational | pitch | customer | hiring | technical | reference | other",
          "- vintage: the period the document covers, in ISO 8601 month/quarter form when possible (e.g. 2025-Q3, 2024-2025) — null if unknowable",
          "- authoritativeness: primary | secondary | derivative — primary = source-of-truth (audited financials, signed contracts), secondary = company-prepared (pitch deck, internal memo), derivative = third-party derived",
          "- relevance: high | medium | low — relevance to commercial diligence",
          "- topics_covered: short array of topics (e.g. revenue, cap_table, gtm, hiring, ip, security)",
          "- confidence: 0.0 - 1.0",
          "- chunk_refs: list of chunk IDs from this document that informed your classification",
        ].join("\n"),
        outputSchema: [
          'items: JSON array.',
          'Each item: {"document_pathname": "...", "filename": "...", "type": "...", "vintage": "..."|null, "authoritativeness": "primary|secondary|derivative", "relevance": "high|medium|low", "topics_covered": ["..."], "confidence": 0.0, "chunk_refs": ["chunk_id"], "rationale": "why this classification"}',
        ].join("\n"),
        needsFullChunks: true,
      };

    case DiligenceStageName.ENTITY_EXTRACTION:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction: [
          "Extract entities relevant to commercial diligence. For each entity, name, kind, and chunk-level citations are MANDATORY.",
          "",
          "Entity kinds to look for:",
          "- person (founders, executives, board, key engineers, investors, advisors) — include role/title",
          "- company (the target, competitors, customers, suppliers, partners, prior employers of founders)",
          "- product (the target's products, key competitor products)",
          "- market (named markets / segments)",
          "- financial_metric (named recurring metrics — ARR, NRR, GRR, CAC, LTV, gross margin)",
          "- regulation (named regulatory regimes — GDPR, HIPAA, SOC2, PCI-DSS, CCPA, sanctions)",
          "- technology (key technical components — model, framework, cloud, datastore)",
          "- ip_asset (patents, trademarks, copyrights, trade secrets, registered software)",
          "- contract (named MSAs, key customer contracts, leases, debt instruments)",
          "- location (key offices, jurisdictions of incorporation)",
          "",
          "If you find duplicate references to the same entity across documents, list it ONCE and put all source chunk IDs in chunk_refs.",
        ].join("\n"),
        outputSchema: [
          'items: JSON array.',
          'Each item: {"name": "...", "kind": "person|company|product|market|financial_metric|regulation|technology|ip_asset|contract|location", "details": "role, title, value, jurisdiction, etc.", "confidence": 0.0, "chunk_refs": ["chunk_id"]}',
          COMMON_GAP_INSTRUCTION,
        ].join("\n"),
        needsFullChunks: true,
      };

    case DiligenceStageName.CLAIM_EXTRACTION:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction: [
          "Extract specific, testable factual claims made in the documents. Do NOT assign a status — that is a later stage.",
          "Claims to capture (when present):",
          "- Revenue: ARR, MRR, growth rate, revenue by segment, revenue by geography",
          "- Retention: churn, NRR, GRR, expansion revenue",
          "- Unit economics: CAC, LTV, payback period, gross margin, contribution margin",
          "- Customers: total customer count, % top-5 / top-10 concentration, named anchor customers",
          "- Pipeline: pipeline value, coverage ratio, win rate",
          "- Burn / runway: monthly burn, cash on hand, runway months",
          "- Headcount: total, engineering, sales, growth",
          "- Market: TAM / SAM / SOM with stated methodology",
          "- Funding: rounds raised, valuation, dilution, debt",
          "- Product: claimed differentiators, technical performance numbers, benchmarks",
          "- IP: patent counts, registrations, exclusivity, ownership chain",
          "- Founder/team: prior exits, prior roles with stated tenure",
          "",
          "Each claim must quote or closely paraphrase the source language. Do not generalize.",
        ].join("\n"),
        outputSchema: [
          'items: JSON array.',
          'Each item: {"claim": "exact or close paraphrase", "category": "revenue|retention|unit_economics|customers|pipeline|burn|headcount|market|funding|product|ip|team|other", "quantitative": true|false, "value": "..."|null, "unit": "..."|null, "period": "..."|null, "chunk_refs": ["chunk_id"]}',
          COMMON_GAP_INSTRUCTION,
        ].join("\n"),
        needsFullChunks: true,
      };

    case DiligenceStageName.Q1_IDENTITY_AND_OWNERSHIP:
      return questionPlan({
        question: "Q1: Who are they?",
        checklist: [
          "Legal entity name, jurisdiction of incorporation, founding date.",
          "Cap table: founder equity %, investor equity %, ESOP, debt holders, convertible notes / SAFEs outstanding.",
          "Key personnel: founders + roles, CEO/CTO/CFO/Head of Sales/etc., any independent board members, advisors.",
          "Organisational structure: number of subsidiaries, parent/child relations, where IP is held vs. where employees are employed.",
          "Founder credibility signals: prior exits, prior senior roles, technical credentials, public reputation indicators.",
          "Change-of-control terms in major contracts (if visible).",
        ],
        deliverables: [
          'identity: {"legal_name": "...", "jurisdictions": ["..."], "founded": "..."|null, "structure": "..."}',
          'ownership: {"founders": [{"name": "...", "title": "...", "stake_percent": null|number, "chunk_refs": []}], "investors": [...], "debt_holders": [...], "esop_pool_percent": null|number, "convertible_outstanding_usd": null|number}',
          'key_personnel: array of {"name", "role", "background", "credibility_signals", "chunk_refs"}',
          'credibility: {"score": "high|medium|low|insufficient_evidence", "reasoning": "...", "chunk_refs": []}',
        ],
      });

    case DiligenceStageName.Q2_PRODUCT_AND_TECHNOLOGY:
      return questionPlan({
        question: "Q2: What are they building?",
        checklist: [
          "Product: what it does, who it is for, current development stage (concept / alpha / beta / GA), platform availability.",
          "Technology: core technical approach, architecture (high-level), key cloud/infra dependencies, AI/ML model dependencies.",
          "Differentiation: what specifically distinguishes the product vs. named competitors.",
          "Defensibility: moats (network effects, data, patents, switching costs, regulatory barriers, brand). Be specific — 'AI' is not a moat.",
          "IP: patents (filed/granted), trademarks, copyrights, key trade secrets. Ownership chain — was IP assigned by all employees/contractors?",
          "Architecture risk: single-vendor dependencies, key third-party services, data ownership/portability.",
        ],
        deliverables: [
          'product: {"description": "...", "stage": "concept|alpha|beta|ga", "platforms": ["..."], "chunk_refs": []}',
          'technology: {"core_stack": ["..."], "key_dependencies": ["..."], "ai_ml_components": ["..."], "chunk_refs": []}',
          'differentiation: array of {"vs": "competitor name or generic", "claim": "...", "evidence_strength": "strong|moderate|weak|asserted_only", "chunk_refs": []}',
          'defensibility: {"moats": [{"kind": "network|data|patent|switching|regulatory|brand|other", "explanation": "...", "chunk_refs": []}], "score": "high|medium|low|insufficient_evidence"}',
          'ip: {"patents_filed": null|number, "patents_granted": null|number, "trademarks": [...], "ownership_chain_clean": true|false|"unverified", "chunk_refs": []}',
          'architecture_risks: array of {"risk": "...", "severity": "high|medium|low", "chunk_refs": []}',
        ],
      });

    case DiligenceStageName.Q3_MARKET_AND_TRACTION:
      return questionPlan({
        question: "Q3: Does anyone care?",
        checklist: [
          "Customer demand evidence: named customers, paying vs. free, average contract value.",
          "Traction metrics: ARR/MRR with explicit period, growth rate, retention/NRR, logo growth.",
          "Pilots & LOIs: count, named, signed status, conversion to paid.",
          "Revenue validation: invoiced vs. recognized vs. announced — flag gaps.",
          "Pipeline & coverage: pipeline value relative to next-period target, win rate.",
          "Market pull signals: inbound vs. outbound source mix, repeat customers, expansion revenue.",
          "Geographic / segment distribution.",
        ],
        deliverables: [
          'customers: {"named_paying": [...], "named_pilots": [...], "named_lois": [...], "concentration_top_5_percent": null|number, "chunk_refs": []}',
          'revenue_validation: {"arr_usd": null|number, "arr_period": "..."|null, "growth_rate_pct": null|number, "retention_nrr_pct": null|number, "evidence_basis": "audited|invoiced|signed_contracts|pitch_deck_only|insufficient_evidence", "chunk_refs": []}',
          'pipeline: {"value_usd": null|number, "coverage_ratio": null|number, "win_rate_pct": null|number, "chunk_refs": []}',
          'demand_signals: array of {"signal": "...", "strength": "strong|moderate|weak", "chunk_refs": []}',
          'market_pull_score: {"score": "strong|moderate|weak|absent|insufficient_evidence", "reasoning": "..."}',
        ],
      });

    case DiligenceStageName.Q4_EXECUTION_CAPABILITY:
      return questionPlan({
        question: "Q4: Can they execute?",
        checklist: [
          "Founder/team track record: prior exits, scaled-team experience, domain credibility.",
          "Operational competence: stated processes, ops headcount, tooling references.",
          "Scaling readiness: prior experience at scale, system capacity claims, hiring plan vs. recent hire pace.",
          "Hiring quality: notable hires, executive recruitment, source of recent hires.",
          "Customer management: named CSM/AM motions, NPS, named reference customers.",
          "Delivery reliability: stated SLA / uptime numbers, incident history, on-time release record (if mentioned).",
        ],
        deliverables: [
          'founder_capability: {"assessment": "strong|adequate|weak|insufficient_evidence", "evidence": [{"point": "...", "chunk_refs": []}]}',
          'operational_competence: {"assessment": "...", "evidence": [...]}',
          'scaling_readiness: {"assessment": "...", "hiring_pace_vs_plan": "ahead|on_track|behind|unknown", "evidence": [...]}',
          'hiring_quality: {"notable_hires": [...], "assessment": "...", "evidence": [...]}',
          'customer_management: {"motion_described": true|false, "named_references": [...], "evidence": [...]}',
          'delivery_reliability: {"sla_stated_pct": null|number, "incidents_disclosed": null|number, "evidence": [...]}',
        ],
      });

    case DiligenceStageName.Q5_BUSINESS_MODEL_VIABILITY:
      return questionPlan({
        question: "Q5: Can the business work?",
        checklist: [
          "Business model: how revenue is earned (subscription / usage / license / one-time / services). Who pays? When?",
          "Pricing plausibility: list price vs. acceptable willingness-to-pay; are discounts disclosed; is contract length disclosed.",
          "Unit economics: CAC, LTV, payback, gross margin, contribution margin — *with stated derivation*. If derivation is missing, flag as a gap.",
          "Scalability: COGS structure (variable vs. fixed), GTM scalability (founder-led vs. repeatable motion).",
          "Market realism: TAM / SAM / SOM with stated methodology — flag top-down-only TAMs as low-rigor evidence.",
          "Economic viability: at stated growth, when does the business reach profitability under stated burn?",
        ],
        deliverables: [
          'business_model: {"revenue_type": "subscription|usage|license|one_time|services|hybrid", "billing_cadence": "...", "chunk_refs": []}',
          'pricing: {"list_price_disclosed": true|false, "discount_disclosed": true|false, "contract_length_disclosed": true|false, "plausibility": "consistent|inconsistent|unverifiable", "evidence": [...]}',
          'unit_economics: {"cac_usd": null|number, "ltv_usd": null|number, "payback_months": null|number, "gross_margin_pct": null|number, "derivation_disclosed": true|false, "chunk_refs": []}',
          'scalability: {"cogs_structure": "mostly_variable|mostly_fixed|mixed|unclear", "gtm_motion": "founder_led|repeatable|enterprise_complex|unclear", "score": "high|medium|low|insufficient_evidence"}',
          'market_realism: {"tam_methodology": "bottom_up|top_down|mixed|undisclosed", "tam_usd": null|number, "sam_usd": null|number, "som_usd": null|number, "score": "rigorous|adequate|weak|insufficient_evidence", "chunk_refs": []}',
          'economic_viability: {"path_to_profitability_described": true|false, "estimated_runway_months": null|number, "score": "viable|tight|unviable|insufficient_evidence", "chunk_refs": []}',
        ],
      });

    case DiligenceStageName.Q6_RISK_ANALYSIS:
      return questionPlan({
        question: "Q6: What are the risks?",
        checklist: [
          "Technical: architecture single-points-of-failure, dependency on a single model/cloud, data fragility.",
          "Operational: key-person dependency, single-customer concentration, single-supplier concentration, hiring shortfalls.",
          "Financial: burn vs. runway, undisclosed liabilities, debt covenants, customer concentration revenue risk.",
          "Legal: open litigation, IP ownership disputes, contract change-of-control, non-competes.",
          "Compliance: GDPR / HIPAA / SOC2 / PCI / CCPA / sanctions exposure — what regimes apply, what's certified vs. claimed.",
          "Security: prior incidents disclosed, data residency, secrets handling, vulnerability disclosure record.",
          "Key-person: who, why, what happens if they leave.",
        ],
        deliverables: [
          'risks: array of {"category": "technical|operational|financial|legal|compliance|security|key_person", "title": "...", "description": "...", "severity": "blocker|critical|high|medium|low", "evidence_strength": "strong|moderate|weak|asserted_only", "mitigation_disclosed": true|false, "chunk_refs": []}',
          COMMON_GAP_INSTRUCTION,
        ],
      });

    case DiligenceStageName.Q7_EVIDENCE_QUALITY:
      return questionPlan({
        question: "Q7: What evidence supports the claims?",
        checklist: [
          "Evidence basis: for each major claim (revenue, customers, growth, IP), what is the source — audited financials, signed contracts, pitch deck assertion, verbal statement?",
          "Source quality: independent/third-party vs. self-reported. Audited vs. unaudited. Signed vs. unsigned.",
          "Corroboration: which claims are supported by multiple independent sources? Which rest on a single assertion?",
          "Recency: how current is the evidence? Flag stale data (>12 months old for fast-moving metrics).",
          "Completeness: what evidence would a reasonable investor expect to see at this stage that is absent?",
          "Confidence assessment: for each core question (Q1–Q6), rate the overall evidence quality.",
        ],
        deliverables: [
          'evidence_assessment: array of {"question": "Q1_IDENTITY|Q2_PRODUCT|Q3_MARKET|Q4_EXECUTION|Q5_BUSINESS_MODEL|Q6_RISKS", "evidence_quality": "strong|adequate|weak|absent", "basis": "audited|signed_contracts|third_party|self_reported|pitch_deck_only|verbal", "corroborated": true|false, "staleness_risk": true|false, "reasoning": "...", "chunk_refs": []}',
          'uncorroborated_claims: array of {"claim": "...", "source": "single_document|verbal|pitch_deck", "severity": "blocker|high|medium|low", "chunk_refs": []}',
          'missing_evidence: array of {"expected": "what a reasonable investor would expect", "impact": "blocker|high|medium|low", "chunk_refs": []}',
          COMMON_GAP_INSTRUCTION,
        ],
      });

    case DiligenceStageName.Q8_FAILURE_MODES_AND_FRAGILITY:
      return questionPlan({
        question: "Q8: What could materially fail?",
        checklist: [
          "Fragility: dependencies that, if removed, materially change the company's value proposition (single LLM provider, single channel partner, single customer).",
          "Contradictions you have observed across documents (numbers that don't reconcile, claims that conflict).",
          "Missing evidence in places where the investor would expect to see it (no audited financials when the company is series B+, no signed contracts behind named customers, no IP assignment for a technical founder).",
          "Systemic weaknesses: GTM that hasn't been tested without founder selling, technology stack with limited domain depth.",
          "Market blockers: regulatory shifts, dominant incumbent moves, structural buyer reluctance.",
          "What scenario would make this a 'no'?",
        ],
        deliverables: [
          'fragility: array of {"dependency": "...", "what_breaks": "...", "severity": "blocker|critical|high|medium|low", "chunk_refs": []}',
          'contradictions: array of {"statement_a": "...", "statement_b": "...", "chunk_refs_a": [], "chunk_refs_b": [], "severity": "blocker|critical|high|medium|low"}',
          'systemic_weaknesses: array of {"weakness": "...", "evidence": "...", "chunk_refs": []}',
          'market_blockers: array of {"blocker": "...", "likelihood": "high|medium|low", "chunk_refs": []}',
          'no_scenario: "if X happened the deal would be dead — describe the scenario in 1 sentence"',
        ],
      });

    case DiligenceStageName.OPEN_QUESTIONS:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction: [
          "Generate the open questions a partner should ask the founder before this deal can move forward.",
          "Each question must be:",
          "- Specific enough to be answerable with one document or one number, NOT 'tell me more about your moat'",
          "- Categorized into one of: Q1_IDENTITY, Q2_PRODUCT, Q3_MARKET, Q4_EXECUTION, Q5_BUSINESS_MODEL, Q6_RISKS, Q7_EVIDENCE, Q8_FAILURE_MODES",
          "- Prioritized: blocker (deal cannot proceed without this) | high | medium | low",
          "- Tied to what evidence would resolve it (e.g. 'cap table', 'audited 2024 financials', 'signed MSA with [customer]')",
          "Group similar questions; do not return more than 25 total. Top-of-list should be blockers.",
        ].join("\n"),
        outputSchema: [
          'items: JSON array of questions.',
          'Each item: {"category": "Q1_IDENTITY|Q2_PRODUCT|Q3_MARKET|Q4_EXECUTION|Q5_BUSINESS_MODEL|Q6_RISKS|Q7_EVIDENCE|Q8_FAILURE_MODES", "question": "...", "rationale": "why this matters", "priority": "blocker|high|medium|low", "resolved_by": "specific document or data that would resolve it", "chunk_refs": ["chunk_ids that motivated this question"]}',
        ].join("\n"),
        needsFullChunks: false,
      };

    case DiligenceStageName.EXECUTIVE_SUMMARY:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction: [
          "Generate the executive summary that an investment partner reads first. It must:",
          "- Open with a 1-sentence investment thesis (or 'thesis cannot be formed at this stage' if evidence is too thin)",
          "- List top 3 reasons to invest, each with a chunk-cited supporting fact (not a vibe)",
          "- List top 3 reasons not to invest, each with a chunk-cited risk or gap",
          "- Surface the single biggest unresolved question as a 'gating item'",
          "- Recommend next-step diligence actions tied to evidence gaps",
          "Be terse. Investor partners read in 90 seconds.",
        ].join("\n"),
        outputSchema: [
          'summary: 4-paragraph executive summary text.',
          'items: JSON array of structured sections.',
          'Each item: {"section": "thesis|pros|cons|gating_item|recommended_next_steps|valuation_note", "content": "...", "chunk_refs": []}',
        ].join("\n"),
        needsFullChunks: false,
      };

    case DiligenceStageName.FINAL_REPORT:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction: [
          "Synthesize the final due diligence report that goes to the investment committee.",
          "Structure: Executive Summary → For each of Q1-Q8: answer + evidence + open gaps → Open Questions → Recommendation.",
          "Pull from prior stage outputs verbatim where they are already structured. Do not duplicate effort.",
          "Where evidence is thin, say so explicitly: 'Insufficient evidence to assess X — see open questions.'",
        ].join("\n"),
        outputSchema: [
          'summary: comprehensive synthesis paragraph (3-5 paragraphs).',
          'items: JSON array of report sections in this exact order: thesis, q1_identity, q2_product, q3_market, q4_execution, q5_business_model, q6_risks, q7_evidence, q8_failure_modes, open_questions_summary, recommendation.',
          'Each item: {"section": "...", "content": "...", "chunk_refs": []}',
        ].join("\n"),
        needsFullChunks: false,
      };

    default:
      return {
        systemInstruction: SYSTEM_BASE,
        userInstruction:
          "Run this diligence stage and return structured outputs with chunk citations.",
        outputSchema:
          'summary: brief paragraph. items: JSON array with relevant structured fields per item.',
        needsFullChunks: true,
      };
  }
}

function questionPlan(input: {
  question: string;
  checklist: string[];
  deliverables: string[];
}): StagePromptPlan {
  return {
    systemInstruction: SYSTEM_BASE,
    userInstruction: [
      `Answer this diligence question: ${input.question}`,
      "",
      "Checklist of things to look for (every applicable item must be present in your output, or in evidence_gaps):",
      ...input.checklist.map((item) => `- ${item}`),
      "",
      "Cite chunk IDs for every assertion. If a checklist item has no evidence, output it under evidence_gaps — do not fabricate.",
    ].join("\n"),
    outputSchema: [
      "structured: a JSON object with these top-level fields:",
      ...input.deliverables.map((deliverable) => `- ${deliverable}`),
      `- chunk_refs_overall: array of all chunk IDs cited in any field`,
      `- confidence: 0.0 - 1.0 — your overall confidence on this question, calibrated by evidence strength`,
      "",
      COMMON_GAP_INSTRUCTION,
      "",
      "Also output items: a flat JSON array of finding objects suitable for a UI list, each:",
      '{"key": "human-readable label", "value": "...", "severity": "blocker|critical|high|medium|low|info", "chunk_refs": []}',
    ].join("\n"),
    needsFullChunks: true,
  };
}
