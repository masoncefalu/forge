// Confidence scoring — the heart of PennyForge.
//
// score = clamp( (evidenceBase + trustBonus + confirmBonus - deadPenalty) * decay, 0..100 )
//
// - Evidence hierarchy: receipt > shelf-tag photo > product photo > text-only.
// - Reporter trust (0..100) adds up to +15.
// - Distinct confirmed votes add +12 each, capped at +36 (3 confirms).
// - Distinct dead votes subtract -18 each (uncapped).
// - Freshness decays exponentially with a deal-type half-life (penny leads
//   rot faster than clearance). A recent CONFIRMED vote refreshes the decay
//   clock — community verification keeps a lead alive.
// - Suppression: 2+ dead votes AND more deads than confirms hides the lead
//   from the feed, alerts, and route planning.
//
// Full rationale + worked examples: docs/scoring.md

import type { DealType, EvidenceType } from "./constants";

export const EVIDENCE_BASE: Record<EvidenceType, number> = {
  RECEIPT: 45,
  SHELF_TAG_PHOTO: 32,
  PRODUCT_PHOTO: 22,
  TEXT_ONLY: 10,
};

export const CONFIRM_POINTS = 12;
export const CONFIRM_CAP = 36;
export const DEAD_PENALTY = 18;
export const TRUST_MAX_BONUS = 15;
export const ALERT_THRESHOLD = 60;

export const HALF_LIFE_DAYS: Record<DealType, number> = {
  PENNY: 7,
  CLEARANCE: 14,
};

export interface ScoreInput {
  evidenceType: EvidenceType;
  reporterTrust?: number; // 0..100, default 50
  confirms?: number;
  deads?: number;
  ageDays?: number; // days since report created
  dealType?: DealType;
  lastConfirmAgeDays?: number | null; // days since most recent CONFIRMED vote
}

export interface ScoreBreakdown {
  base: number;
  trustBonus: number;
  confirmBonus: number;
  deadPenalty: number;
  decayFactor: number; // 0..1
  effectiveAgeDays: number;
  final: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Freshness is anchored to the most recent positive signal: the report
// itself, or the latest confirmed vote if newer. Shared by scoreBreakdown
// (per-lead confidence decay) and storeFreshnessScore (store-level display
// metric) so the two never drift apart.
function effectiveAge(ageDays: number, lastConfirmAgeDays?: number | null): number {
  return lastConfirmAgeDays !== null && lastConfirmAgeDays !== undefined
    ? Math.min(ageDays, lastConfirmAgeDays)
    : ageDays;
}

// Same sharing rationale as effectiveAge: one decay curve for both
// per-lead confidence and store-level freshness.
function decayFactor(effectiveAgeDays: number, dealType: DealType): number {
  return Math.pow(0.5, effectiveAgeDays / HALF_LIFE_DAYS[dealType]);
}

/** Full component breakdown so the UI can explain WHY a lead is trusted. */
export function scoreBreakdown(input: ScoreInput): ScoreBreakdown {
  const {
    evidenceType,
    reporterTrust = 50,
    confirms = 0,
    deads = 0,
    ageDays = 0,
    dealType = "PENNY",
    lastConfirmAgeDays = null,
  } = input;

  const base = EVIDENCE_BASE[evidenceType] ?? EVIDENCE_BASE.TEXT_ONLY;
  const trustBonus = Math.round((clamp(reporterTrust, 0, 100) / 100) * TRUST_MAX_BONUS);
  const confirmBonus = Math.min(confirms * CONFIRM_POINTS, CONFIRM_CAP);
  const deadPenalty = deads * DEAD_PENALTY;

  const effectiveAgeDays = effectiveAge(ageDays, lastConfirmAgeDays);
  const decay = decayFactor(effectiveAgeDays, dealType);

  const raw = base + trustBonus + confirmBonus - deadPenalty;
  const final = clamp(Math.round(raw * decay), 0, 100);

  return { base, trustBonus, confirmBonus, deadPenalty, decayFactor: decay, effectiveAgeDays, final };
}

export interface FreshnessInput {
  evidenceType: EvidenceType;
  ageDays: number;
  dealType: DealType;
  lastConfirmAgeDays?: number | null;
}

/**
 * Store-level freshness (0..100): how recently the store's best-supported
 * lead was seen or reconfirmed. This is a feed/display metric, not a route
 * score input — lib/route.ts already discounts each lead's confidence by
 * age, so multiplying routeScore by this too would double-count decay.
 */
export function storeFreshnessScore(leads: FreshnessInput[]): number {
  if (leads.length === 0) return 0;

  const bestDecay = leads.reduce((max, lead) => {
    const effectiveAgeDays = effectiveAge(lead.ageDays, lead.lastConfirmAgeDays);
    return Math.max(max, decayFactor(effectiveAgeDays, lead.dealType));
  }, 0);

  return clamp(Math.round(100 * bestDecay), 0, 100);
}

export function confidenceScore(input: ScoreInput): number {
  return scoreBreakdown(input).final;
}

/** Dead-deal suppression rule. */
export function isSuppressed({ confirms = 0, deads = 0 }: { confirms?: number; deads?: number }): boolean {
  return deads >= 2 && deads > confirms;
}

export function ageInDays(from: Date, now: Date = new Date()): number {
  return Math.max(0, (now.getTime() - from.getTime()) / (24 * 3600 * 1000));
}

/** Reporter reputation adjustments applied when votes land on their reports. */
export const TRUST_DELTA = { CONFIRMED: 2, DEAD: -3 } as const;
type VoteKind = keyof typeof TRUST_DELTA;

export function applyTrustDelta(current: number, vote: VoteKind): number {
  return clamp(current + TRUST_DELTA[vote], 0, 100);
}

/**
 * Net, unclamped trust delta for a vote upsert: undoing the old vote (if
 * any) and applying the new one collapses to a single signed number because
 * revert and apply always move in the same direction for a 2-valued vote
 * (switching TO dead is a net decrease, switching TO confirmed is a net
 * increase) — so clamping once at the end is equivalent to the old
 * clamp-after-each-step logic, and this form is also safe to apply as an
 * atomic DB-level increment (see vote route) instead of a read-modify-write.
 */
export function voteTrustDelta(oldVote: VoteKind | null, newVote: VoteKind): number {
  if (oldVote === newVote) return 0;
  return (oldVote ? -TRUST_DELTA[oldVote] : 0) + TRUST_DELTA[newVote];
}

/**
 * Net trust adjustment for a vote upsert. A voter can change or resubmit
 * their vote on the same report at any time (ReportVote is one-per-user),
 * so naively re-applying applyTrustDelta on every vote call would let a
 * single user inflate or crater a reporter's trust by repeatedly toggling
 * their vote. This applies only the DIFFERENCE via voteTrustDelta, clamped
 * once to [0, 100].
 */
export function applyVoteChange(
  currentTrust: number,
  oldVote: VoteKind | null,
  newVote: VoteKind
): number {
  return clamp(currentTrust + voteTrustDelta(oldVote, newVote), 0, 100);
}
