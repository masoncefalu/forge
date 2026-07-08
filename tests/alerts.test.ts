import { describe, it, expect } from "vitest";
import { shouldCreateAlert, ALERT_THRESHOLD } from "@/lib/alerts";

describe("alert quality controls and dedupe", () => {
  const now = new Date("2026-07-08T12:00:00Z");

  it("does not alert below the confidence threshold", () => {
    expect(
      shouldCreateAlert([], { productId: "p1", storeId: "s1", score: ALERT_THRESHOLD - 1, now })
    ).toBe(false);
  });

  it("alerts at or above the confidence threshold with no prior alerts", () => {
    expect(
      shouldCreateAlert([], { productId: "p1", storeId: "s1", score: ALERT_THRESHOLD, now })
    ).toBe(true);
  });

  it("dedupes a second alert for the same product+store within 24 hours", () => {
    const existing = [{ productId: "p1", storeId: "s1", createdAt: now }];
    const oneHourLater = new Date(now.getTime() + 3600 * 1000);
    expect(
      shouldCreateAlert(existing, { productId: "p1", storeId: "s1", score: 80, now: oneHourLater })
    ).toBe(false);
  });

  it("allows a re-alert after the 24-hour window passes", () => {
    const existing = [{ productId: "p1", storeId: "s1", createdAt: now }];
    const nextDay = new Date(now.getTime() + 25 * 3600 * 1000);
    expect(
      shouldCreateAlert(existing, { productId: "p1", storeId: "s1", score: 80, now: nextDay })
    ).toBe(true);
  });

  it("does not dedupe across different products or stores", () => {
    const existing = [{ productId: "p1", storeId: "s1", createdAt: now }];
    expect(
      shouldCreateAlert(existing, { productId: "p2", storeId: "s1", score: 80, now })
    ).toBe(true);
    expect(
      shouldCreateAlert(existing, { productId: "p1", storeId: "s2", score: 80, now })
    ).toBe(true);
  });
});
