import { describe, it, expect } from "vitest";
import { toReportDate, makeDupKey, isUniqueViolation } from "@/lib/reports";

describe("same-day duplicate report prevention", () => {
  it("truncates a timestamp to its UTC calendar date", () => {
    const d = new Date("2026-07-08T23:59:59.999Z");
    expect(toReportDate(d).toISOString()).toBe("2026-07-08T00:00:00.000Z");
  });

  it("produces identical dup keys for the same product/store/user/day", () => {
    const morning = toReportDate(new Date("2026-07-08T08:00:00Z"));
    const night = toReportDate(new Date("2026-07-08T22:00:00Z"));
    expect(makeDupKey("p1", "s1", "u1", morning)).toBe(makeDupKey("p1", "s1", "u1", night));
  });

  it("produces different dup keys across a day boundary", () => {
    const day1 = toReportDate(new Date("2026-07-08T12:00:00Z"));
    const day2 = toReportDate(new Date("2026-07-09T01:00:00Z"));
    expect(makeDupKey("p1", "s1", "u1", day1)).not.toBe(makeDupKey("p1", "s1", "u1", day2));
  });

  it("produces different dup keys for different users on the same day", () => {
    const day = toReportDate(new Date("2026-07-08T12:00:00Z"));
    expect(makeDupKey("p1", "s1", "u1", day)).not.toBe(makeDupKey("p1", "s1", "u2", day));
  });

  it("recognizes Prisma's P2002 unique-constraint violation shape", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
