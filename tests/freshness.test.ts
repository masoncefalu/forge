import { describe, it, expect } from "vitest";
import { storeFreshnessScore, type FreshnessInput } from "@/lib/scoring";

describe("store freshness score", () => {
  it("returns 0 for a store with no active leads", () => {
    expect(storeFreshnessScore([])).toBe(0);
  });

  it("returns 100 for a single fresh PENNY lead", () => {
    const leads: FreshnessInput[] = [{ evidenceType: "RECEIPT", ageDays: 0, dealType: "PENNY" }];
    expect(storeFreshnessScore(leads)).toBe(100);
  });

  it("returns 50 for a single PENNY lead at exactly its 7-day half-life", () => {
    const leads: FreshnessInput[] = [{ evidenceType: "RECEIPT", ageDays: 7, dealType: "PENNY" }];
    expect(storeFreshnessScore(leads)).toBe(50);
  });

  it("reflects the freshest lead (max), not an average, across differing ages", () => {
    const leads: FreshnessInput[] = [
      { evidenceType: "RECEIPT", ageDays: 21, dealType: "PENNY" }, // decay 0.125 -> 13
      { evidenceType: "RECEIPT", ageDays: 0, dealType: "PENNY" }, // decay 1 -> 100
      { evidenceType: "TEXT_ONLY", ageDays: 3.5, dealType: "PENNY" }, // decay ~0.707 -> 71
    ];
    expect(storeFreshnessScore(leads)).toBe(100);
  });

  it("picks the higher decay factor across different half-lives, not just the youngest age", () => {
    const stalePenny: FreshnessInput = { evidenceType: "RECEIPT", ageDays: 30, dealType: "PENNY" };
    const freshClearance: FreshnessInput = {
      evidenceType: "RECEIPT",
      ageDays: 10,
      dealType: "CLEARANCE",
    };
    const pennyOnly = storeFreshnessScore([stalePenny]);
    const clearanceOnly = storeFreshnessScore([freshClearance]);
    const combined = storeFreshnessScore([stalePenny, freshClearance]);

    expect(pennyOnly).toBeLessThan(clearanceOnly);
    expect(combined).toBe(clearanceOnly);
  });

  it("uses the confirm-refreshed age when lastConfirmAgeDays is lower than ageDays", () => {
    const staleNoConfirm: FreshnessInput = { evidenceType: "RECEIPT", ageDays: 14, dealType: "PENNY" };
    const staleButConfirmed: FreshnessInput = {
      evidenceType: "RECEIPT",
      ageDays: 14,
      dealType: "PENNY",
      lastConfirmAgeDays: 1,
    };
    const noConfirmScore = storeFreshnessScore([staleNoConfirm]);
    const confirmedScore = storeFreshnessScore([staleButConfirmed]);
    expect(confirmedScore).toBeGreaterThan(noConfirmScore);
  });

  it("keeps the result within [0, 100] for a wide range of ages", () => {
    const ages = [0, 0.001, 1, 7, 14, 30, 90, 365, 10000];
    for (const ageDays of ages) {
      const score = storeFreshnessScore([{ evidenceType: "RECEIPT", ageDays, dealType: "PENNY" }]);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("decays a very old lead close to but never below 0", () => {
    const score = storeFreshnessScore([{ evidenceType: "RECEIPT", ageDays: 10000, dealType: "PENNY" }]);
    expect(score).toBe(0);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("rounds correctly at a known fractional half-life", () => {
    // ageDays = 14 with a 7-day half-life => decayFactor = 0.25 => 25.
    const leads: FreshnessInput[] = [{ evidenceType: "RECEIPT", ageDays: 14, dealType: "PENNY" }];
    expect(storeFreshnessScore(leads)).toBe(25);
  });
});
