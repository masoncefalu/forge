// Contract tests: pin the exact numeric/string literals behind PennyForge's
// scoring, alert, route, compliance, and enum constants. The rest of the
// suite only asserts *relative* behavior (receipt > shelf tag, etc.), which
// would not catch a silent literal change (e.g. RECEIPT 45 -> 40). These
// tests exist so any such drift fails loudly and must be a deliberate,
// reviewed change.

import { describe, it, expect } from "vitest";
import {
  EVIDENCE_BASE,
  CONFIRM_POINTS,
  CONFIRM_CAP,
  DEAD_PENALTY,
  TRUST_MAX_BONUS,
  ALERT_THRESHOLD,
  HALF_LIFE_DAYS,
  TRUST_DELTA,
  confidenceScore,
} from "@/lib/scoring";
import { ALERT_DEDUPE_WINDOW_MS, ALERT_RADIUS_MILES } from "@/lib/alerts";
import { DEFAULT_COST_PER_MILE } from "@/lib/route";
import {
  ALLOWED_SOURCE_TYPES,
  BLOCKED_SOURCE_TYPES,
  ComplianceError,
  validateReportInput,
} from "@/lib/compliance";
import {
  ROLES,
  DEAL_TYPES,
  EVIDENCE_TYPES,
  REPORT_STATUSES,
  MODERATABLE_STATUSES,
  VOTE_TYPES,
} from "@/lib/constants";

describe("scoring constants", () => {
  it("pins EVIDENCE_BASE for every evidence type", () => {
    expect(EVIDENCE_BASE).toEqual({
      RECEIPT: 45,
      SHELF_TAG_PHOTO: 32,
      PRODUCT_PHOTO: 22,
      TEXT_ONLY: 10,
    });
  });

  it("pins CONFIRM_POINTS", () => {
    expect(CONFIRM_POINTS).toBe(12);
  });

  it("pins CONFIRM_CAP", () => {
    expect(CONFIRM_CAP).toBe(36);
  });

  it("pins DEAD_PENALTY", () => {
    expect(DEAD_PENALTY).toBe(18);
  });

  it("pins TRUST_MAX_BONUS", () => {
    expect(TRUST_MAX_BONUS).toBe(15);
  });

  it("pins ALERT_THRESHOLD", () => {
    expect(ALERT_THRESHOLD).toBe(60);
  });

  it("pins HALF_LIFE_DAYS for every deal type", () => {
    expect(HALF_LIFE_DAYS).toEqual({ PENNY: 7, CLEARANCE: 14 });
  });

  it("pins TRUST_DELTA for every vote kind", () => {
    expect(TRUST_DELTA).toEqual({ CONFIRMED: 2, DEAD: -3 });
  });
});

describe("alert constants", () => {
  it("pins ALERT_DEDUPE_WINDOW_MS to a 24-hour window", () => {
    expect(ALERT_DEDUPE_WINDOW_MS).toBe(86_400_000);
  });

  it("pins ALERT_RADIUS_MILES", () => {
    expect(ALERT_RADIUS_MILES).toBe(75);
  });
});

describe("route constants", () => {
  it("pins DEFAULT_COST_PER_MILE", () => {
    expect(DEFAULT_COST_PER_MILE).toBe(0.15);
  });
});

describe("compliance constants", () => {
  // MIN_PRICE_CENTS/MAX_PRICE_CENTS are module-private in lib/compliance.ts
  // (not exported), so the exact bounds are pinned via the public
  // validateReportInput boundary instead of a direct import.
  it("pins the minimum price bound at 1 cent", () => {
    expect(() =>
      validateReportInput({ priceCents: 1, sourceType: "RECEIPT_PURCHASE" })
    ).not.toThrow();
    expect(() =>
      validateReportInput({ priceCents: 0, sourceType: "RECEIPT_PURCHASE" })
    ).toThrow(ComplianceError);
  });

  it("pins the maximum price bound at 500,000 cents ($5,000)", () => {
    expect(() =>
      validateReportInput({ priceCents: 500_000, sourceType: "RECEIPT_PURCHASE" })
    ).not.toThrow();
    expect(() =>
      validateReportInput({ priceCents: 500_001, sourceType: "RECEIPT_PURCHASE" })
    ).toThrow(ComplianceError);
  });

  it("pins ALLOWED_SOURCE_TYPES to its exact current array", () => {
    expect(ALLOWED_SOURCE_TYPES).toEqual([
      "IN_STORE_OBSERVATION",
      "RECEIPT_PURCHASE",
      "SHELF_TAG",
      "STORE_FLYER_PUBLIC",
    ]);
  });

  it("pins BLOCKED_SOURCE_TYPES to its exact current array", () => {
    expect(BLOCKED_SOURCE_TYPES).toEqual([
      "SCRAPED_SITE",
      "PRIVATE_API",
      "COMPETITOR_REPOST",
      "AUTOMATED_TOOL",
      "EMPLOYEE_INTERNAL_SYSTEM",
    ]);
  });

  it("keeps the allowlist and blocklist disjoint", () => {
    const overlap = ALLOWED_SOURCE_TYPES.filter((s) =>
      (BLOCKED_SOURCE_TYPES as readonly string[]).includes(s)
    );
    expect(overlap).toEqual([]);
  });
});

describe("enum contracts", () => {
  it("pins ROLES", () => {
    expect(ROLES).toEqual(["USER", "CAPTAIN", "ADMIN"]);
  });

  it("pins DEAL_TYPES", () => {
    expect(DEAL_TYPES).toEqual(["PENNY", "CLEARANCE"]);
  });

  it("pins EVIDENCE_TYPES", () => {
    expect(EVIDENCE_TYPES).toEqual([
      "RECEIPT",
      "SHELF_TAG_PHOTO",
      "PRODUCT_PHOTO",
      "TEXT_ONLY",
    ]);
  });

  it("pins REPORT_STATUSES", () => {
    expect(REPORT_STATUSES).toEqual([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "SUPPRESSED",
      "EXPIRED",
    ]);
  });

  it("pins MODERATABLE_STATUSES", () => {
    expect(MODERATABLE_STATUSES).toEqual(["APPROVED", "REJECTED"]);
  });

  it("pins VOTE_TYPES", () => {
    expect(VOTE_TYPES).toEqual(["CONFIRMED", "DEAD"]);
  });
});

describe("worked-example confidence scores", () => {
  it("baseline receipt report: default trust, no confirms/deads, brand new", () => {
    // base=45(RECEIPT) + trustBonus=round(50/100*15)=round(7.5)=8
    // + confirmBonus=min(0*12,36)=0 - deadPenalty=0*18=0 => raw=53
    // decay=0.5^(0/7)=1 => round(53*1)=53
    const score = confidenceScore({ evidenceType: "RECEIPT" });
    expect(score).toBe(53);
  });

  it("confirm-cap saturation: 5 confirms clamp to the 3-confirm cap", () => {
    // base=32(SHELF_TAG_PHOTO) + trustBonus=round(70/100*15)=round(10.5)=11
    // + confirmBonus=min(5*12,36)=min(60,36)=36 - deadPenalty=1*18=18
    // => raw=32+11+36-18=61
    // decay=0.5^(0/7)=1 => round(61*1)=61
    const score = confidenceScore({
      evidenceType: "SHELF_TAG_PHOTO",
      reporterTrust: 70,
      confirms: 5,
      deads: 1,
    });
    expect(score).toBe(61);
  });

  it("non-trivial decay: 3-day-old penny lead with 2 confirms", () => {
    // base=45(RECEIPT) + trustBonus=round(50/100*15)=8
    // + confirmBonus=min(2*12,36)=24 - deadPenalty=0 => raw=77
    // decay=0.5^(3/7)=0.7429971445684742 (non-integer factor, PENNY half-life=7)
    // raw*decay=77*0.7429971445684742=57.2107... => round=>57
    const score = confidenceScore({
      evidenceType: "RECEIPT",
      confirms: 2,
      ageDays: 3,
    });
    expect(score).toBe(57);
  });

  it("dead-penalty dominance clamps a negative raw score to zero", () => {
    // base=10(TEXT_ONLY) + trustBonus=round(20/100*15)=round(3)=3
    // + confirmBonus=0 - deadPenalty=3*18=54 => raw=10+3+0-54=-41
    // decay=0.5^(0/7)=1 => round(-41*1)=-41, clamped to [0,100] => 0
    const score = confidenceScore({
      evidenceType: "TEXT_ONLY",
      reporterTrust: 20,
      deads: 3,
    });
    expect(score).toBe(0);
  });
});
