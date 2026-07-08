import { describe, it, expect } from "vitest";
import { shouldCreateAlert, pickNearbyRecipients, ALERT_THRESHOLD, ALERT_RADIUS_MILES } from "@/lib/alerts";

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

describe("nearby recipient fan-out", () => {
  // Store in downtown Atlanta.
  const store = { lat: 33.7726, lng: -84.3663 };

  it("includes a user well within the alert radius", () => {
    const nearby = { id: "u-near", homeLat: 33.75, homeLng: -84.39 }; // a few miles away
    const result = pickNearbyRecipients([nearby], "reporter", store);
    expect(result.map((u) => u.id)).toContain("u-near");
  });

  it("excludes a user far outside the alert radius", () => {
    const farAway = { id: "u-far", homeLat: 40.7128, homeLng: -74.006 }; // New York, ~750mi away
    const result = pickNearbyRecipients([farAway], "reporter", store);
    expect(result.map((u) => u.id)).not.toContain("u-far");
  });

  it("excludes the reporter even if they're the closest user", () => {
    const reporter = { id: "reporter", homeLat: 33.7726, homeLng: -84.3663 };
    const result = pickNearbyRecipients([reporter], "reporter", store);
    expect(result).toHaveLength(0);
  });

  it("excludes users with no known home coordinates", () => {
    const noCoords = { id: "u-unknown", homeLat: null, homeLng: null };
    const result = pickNearbyRecipients([noCoords], "reporter", store);
    expect(result).toHaveLength(0);
  });

  it("respects a custom radius override", () => {
    const midDistance = { id: "u-mid", homeLat: 34.5, homeLng: -84.3663 }; // ~50mi north
    expect(pickNearbyRecipients([midDistance], "reporter", store, 10)).toHaveLength(0);
    expect(pickNearbyRecipients([midDistance], "reporter", store, 100)).toHaveLength(1);
  });

  it("exports a sane default radius", () => {
    expect(ALERT_RADIUS_MILES).toBeGreaterThan(0);
  });
});
