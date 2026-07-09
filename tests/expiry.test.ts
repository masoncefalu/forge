import { describe, it, expect } from "vitest";
import { isExpired } from "@/lib/reports";
import { REPORT_STATUSES, MODERATABLE_STATUSES } from "@/lib/constants";

describe("derived EXPIRED lifecycle state", () => {
  it("is not expired for a fresh PENNY lead", () => {
    expect(isExpired(0, "PENNY")).toBe(false);
  });

  it("is not expired just under the PENNY threshold (27 days)", () => {
    expect(isExpired(27, "PENNY")).toBe(false);
  });

  it("is expired at exactly the PENNY threshold (28 days) and beyond", () => {
    expect(isExpired(28, "PENNY")).toBe(true);
    expect(isExpired(29, "PENNY")).toBe(true);
  });

  it("is not expired just under the CLEARANCE threshold (55 days)", () => {
    expect(isExpired(55, "CLEARANCE")).toBe(false);
  });

  it("is expired at exactly the CLEARANCE threshold (56 days) and beyond", () => {
    expect(isExpired(56, "CLEARANCE")).toBe(true);
    expect(isExpired(57, "CLEARANCE")).toBe(true);
  });

  it("is a documented, valid status but not moderator-settable", () => {
    expect(REPORT_STATUSES).toContain("EXPIRED");
    expect(MODERATABLE_STATUSES).not.toContain("EXPIRED");
  });
});
