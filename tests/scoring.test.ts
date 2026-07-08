import { describe, it, expect } from "vitest";
import { confidenceScore, isSuppressed, applyTrustDelta } from "@/lib/scoring";

describe("confidence scoring", () => {
  it("ranks evidence types receipt > shelf tag > product photo > text-only", () => {
    const receipt = confidenceScore({ evidenceType: "RECEIPT" });
    const shelf = confidenceScore({ evidenceType: "SHELF_TAG_PHOTO" });
    const photo = confidenceScore({ evidenceType: "PRODUCT_PHOTO" });
    const text = confidenceScore({ evidenceType: "TEXT_ONLY" });
    expect(receipt).toBeGreaterThan(shelf);
    expect(shelf).toBeGreaterThan(photo);
    expect(photo).toBeGreaterThan(text);
  });

  it("increases with confirmations, capped at 3 confirms", () => {
    const zero = confidenceScore({ evidenceType: "PRODUCT_PHOTO", confirms: 0 });
    const two = confidenceScore({ evidenceType: "PRODUCT_PHOTO", confirms: 2 });
    const three = confidenceScore({ evidenceType: "PRODUCT_PHOTO", confirms: 3 });
    const five = confidenceScore({ evidenceType: "PRODUCT_PHOTO", confirms: 5 });
    expect(two).toBeGreaterThan(zero);
    expect(three).toBe(five);
  });

  it("higher reporter trust raises score", () => {
    const lowTrust = confidenceScore({ evidenceType: "RECEIPT", reporterTrust: 10 });
    const highTrust = confidenceScore({ evidenceType: "RECEIPT", reporterTrust: 90 });
    expect(highTrust).toBeGreaterThan(lowTrust);
  });

  it("clamps final score to [0, 100]", () => {
    const maxed = confidenceScore({ evidenceType: "RECEIPT", reporterTrust: 100, confirms: 10 });
    expect(maxed).toBeLessThanOrEqual(100);
    const floored = confidenceScore({ evidenceType: "TEXT_ONLY", deads: 10, ageDays: 100 });
    expect(floored).toBeGreaterThanOrEqual(0);
  });
});

describe("stale lead decay", () => {
  it("halves a penny lead's score at its 7-day half-life", () => {
    const fresh = confidenceScore({ evidenceType: "RECEIPT", ageDays: 0, dealType: "PENNY" });
    const week = confidenceScore({ evidenceType: "RECEIPT", ageDays: 7, dealType: "PENNY" });
    expect(week).toBeLessThanOrEqual(Math.round(fresh * 0.5) + 1);
    expect(week).toBeGreaterThanOrEqual(Math.round(fresh * 0.5) - 1);
  });

  it("decays a 30-day-old penny lead to near zero", () => {
    const month = confidenceScore({ evidenceType: "RECEIPT", ageDays: 30, dealType: "PENNY" });
    expect(month).toBeLessThan(10);
  });

  it("decays clearance leads slower than penny leads at the same age", () => {
    const penny = confidenceScore({ evidenceType: "RECEIPT", ageDays: 14, dealType: "PENNY" });
    const clearance = confidenceScore({ evidenceType: "RECEIPT", ageDays: 14, dealType: "CLEARANCE" });
    expect(clearance).toBeGreaterThan(penny);
  });

  it("a recent confirmation refreshes freshness and raises the score", () => {
    const staleNoConfirm = confidenceScore({ evidenceType: "RECEIPT", ageDays: 14 });
    const staleButConfirmed = confidenceScore({
      evidenceType: "RECEIPT",
      ageDays: 14,
      confirms: 1,
      lastConfirmAgeDays: 1,
    });
    expect(staleButConfirmed).toBeGreaterThan(staleNoConfirm);
  });
});

describe("dead-vote penalty and suppression", () => {
  it("a single dead vote reduces the score", () => {
    const clean = confidenceScore({ evidenceType: "RECEIPT" });
    const oneDead = confidenceScore({ evidenceType: "RECEIPT", deads: 1 });
    expect(oneDead).toBeLessThan(clean);
  });

  it("suppresses a lead with 2+ dead votes outnumbering confirms", () => {
    expect(isSuppressed({ confirms: 0, deads: 2 })).toBe(true);
    expect(isSuppressed({ confirms: 1, deads: 3 })).toBe(true);
  });

  it("does not suppress when confirms keep pace with deads", () => {
    expect(isSuppressed({ confirms: 3, deads: 2 })).toBe(false);
    expect(isSuppressed({ confirms: 0, deads: 1 })).toBe(false);
  });
});

describe("reporter trust adjustments", () => {
  it("confirmed votes raise trust, dead votes lower it, clamped to [0, 100]", () => {
    expect(applyTrustDelta(50, "CONFIRMED")).toBe(52);
    expect(applyTrustDelta(50, "DEAD")).toBe(47);
    expect(applyTrustDelta(99, "CONFIRMED")).toBe(100);
    expect(applyTrustDelta(1, "DEAD")).toBe(0);
  });
});
