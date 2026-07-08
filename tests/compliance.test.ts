import { describe, it, expect } from "vitest";
import {
  assertSafeSource,
  validateReportInput,
  ComplianceError,
  ALLOWED_SOURCE_TYPES,
  BLOCKED_SOURCE_TYPES,
} from "@/lib/compliance";

describe("compliance guardrails: unsafe source blocking", () => {
  it("allows every source type on the allowlist", () => {
    for (const source of ALLOWED_SOURCE_TYPES) {
      expect(() => assertSafeSource(source)).not.toThrow();
    }
  });

  it("blocks every known-unsafe source type with a ComplianceError", () => {
    for (const source of BLOCKED_SOURCE_TYPES) {
      expect(() => assertSafeSource(source)).toThrow(ComplianceError);
    }
  });

  it("rejects unknown/novel source strings by default (allowlist, not denylist)", () => {
    expect(() => assertSafeSource("TIKTOK_SCREENSHOT")).toThrow(ComplianceError);
    expect(() => assertSafeSource("")).toThrow(ComplianceError);
  });

  it("rejects a full report submission using a blocked source type", () => {
    expect(() =>
      validateReportInput({ priceCents: 1, sourceType: "SCRAPED_SITE" })
    ).toThrow(ComplianceError);
  });

  it("rejects out-of-range or non-integer prices", () => {
    expect(() =>
      validateReportInput({ priceCents: 0, sourceType: "RECEIPT_PURCHASE" })
    ).toThrow(ComplianceError);
    expect(() =>
      validateReportInput({ priceCents: 1.5, sourceType: "RECEIPT_PURCHASE" })
    ).toThrow(ComplianceError);
    expect(() =>
      validateReportInput({ priceCents: 10_000_000, sourceType: "RECEIPT_PURCHASE" })
    ).toThrow(ComplianceError);
  });

  it("rejects non-http(s) evidence URLs", () => {
    expect(() =>
      validateReportInput({ priceCents: 1, sourceType: "RECEIPT_PURCHASE", evidenceUrl: "javascript:alert(1)" })
    ).toThrow(ComplianceError);
  });

  it("accepts a valid, fully-compliant report input", () => {
    expect(() =>
      validateReportInput({
        priceCents: 1,
        sourceType: "SHELF_TAG",
        evidenceUrl: "https://example.com/photo.jpg",
      })
    ).not.toThrow();
  });
});
