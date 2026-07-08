import { describe, it, expect } from "vitest";
import { rankStores, scoreStore } from "@/lib/route";

describe("route ROI scoring", () => {
  it("weights expected value by confidence, not raw item value", () => {
    const highConf = scoreStore({
      storeId: "a", storeName: "A", distanceMiles: 5,
      leads: [{ estValue: 100, confidence: 90, suppressed: false }],
    });
    const lowConf = scoreStore({
      storeId: "b", storeName: "B", distanceMiles: 5,
      leads: [{ estValue: 100, confidence: 10, suppressed: false }],
    });
    expect(highConf.routeScore).toBeGreaterThan(lowConf.routeScore);
  });

  it("excludes suppressed leads from expected value", () => {
    const store = scoreStore({
      storeId: "a", storeName: "A", distanceMiles: 1,
      leads: [{ estValue: 500, confidence: 90, suppressed: true }],
    });
    expect(store.expectedValue).toBe(0);
    expect(store.leadCount).toBe(0);
  });

  it("subtracts round-trip gas cost from expected value", () => {
    const store = scoreStore(
      { storeId: "a", storeName: "A", distanceMiles: 10, leads: [{ estValue: 50, confidence: 100, suppressed: false }] },
      0.15
    );
    expect(store.tripCost).toBeCloseTo(10 * 2 * 0.15, 5);
    expect(store.routeScore).toBeCloseTo(50 - 3, 5);
  });

  it("ranks a far but high-value store above a close but low-value one", () => {
    const ranked = rankStores([
      { storeId: "far", storeName: "Far", distanceMiles: 40, leads: [{ estValue: 300, confidence: 70, suppressed: false }] },
      { storeId: "close", storeName: "Close", distanceMiles: 3, leads: [{ estValue: 40, confidence: 85, suppressed: false }] },
    ]);
    expect(ranked[0].storeId).toBe("far");
  });

  it("excludes trips whose gas cost exceeds expected value", () => {
    const ranked = rankStores([
      { storeId: "notworth", storeName: "Not worth it", distanceMiles: 60, leads: [{ estValue: 10, confidence: 50, suppressed: false }] },
    ]);
    expect(ranked).toHaveLength(0);
  });
});
