// Compliance guardrails — the hard boundary of PennyForge.
//
// PennyForge only accepts FIRST-HAND, IN-STORE, USER-GENERATED evidence.
// It never ingests scraped sites, private/undocumented retailer endpoints,
// competitor communities, or automated tooling output. These guardrails are
// enforced at the API layer on every report submission and are covered by
// unit tests (tests/compliance.test.ts). Do not weaken them.

export const ALLOWED_SOURCE_TYPES = [
  "IN_STORE_OBSERVATION", // shopper saw it on the shelf / at register
  "RECEIPT_PURCHASE", // shopper bought it and has the receipt
  "SHELF_TAG", // shopper photographed the shelf/clearance tag
  "STORE_FLYER_PUBLIC", // public printed/posted store flyer or signage
] as const;
export type SourceType = (typeof ALLOWED_SOURCE_TYPES)[number];

export const BLOCKED_SOURCE_TYPES = [
  "SCRAPED_SITE", // scraping retailer or competitor sites
  "PRIVATE_API", // undocumented/private retailer endpoints
  "COMPETITOR_REPOST", // reposting paid competitor feeds/lists
  "AUTOMATED_TOOL", // bot-generated inventory probes
  "EMPLOYEE_INTERNAL_SYSTEM", // data pulled from internal retailer systems
] as const;

export const SOURCE_LABELS: Record<SourceType, string> = {
  IN_STORE_OBSERVATION: "Saw it in store",
  RECEIPT_PURCHASE: "Bought it (have receipt)",
  SHELF_TAG: "Photographed shelf tag",
  STORE_FLYER_PUBLIC: "Public store flyer/signage",
};

export class ComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComplianceError";
  }
}

/**
 * Allowlist enforcement: anything not explicitly allowed is rejected,
 * including unknown/novel source strings. Blocked types get a specific
 * message so the UI can explain the policy.
 */
export function assertSafeSource(sourceType: string): asserts sourceType is SourceType {
  if ((BLOCKED_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    throw new ComplianceError(
      `Blocked source type "${sourceType}". PennyForge only accepts first-hand, in-store, user-generated evidence — never scraped sites, private endpoints, competitor feeds, or automated tools.`
    );
  }
  if (!(ALLOWED_SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    throw new ComplianceError(
      `Unknown source type "${sourceType}". Allowed: ${ALLOWED_SOURCE_TYPES.join(", ")}.`
    );
  }
}

const MIN_PRICE_CENTS = 1; // a penny
const MAX_PRICE_CENTS = 500_000; // $5,000 sanity cap

export function validateReportInput(input: {
  priceCents: number;
  sourceType: string;
  evidenceUrl?: string | null;
}): void {
  assertSafeSource(input.sourceType);

  if (
    !Number.isInteger(input.priceCents) ||
    input.priceCents < MIN_PRICE_CENTS ||
    input.priceCents > MAX_PRICE_CENTS
  ) {
    throw new ComplianceError(
      `Price must be an integer between ${MIN_PRICE_CENTS} and ${MAX_PRICE_CENTS} cents.`
    );
  }

  if (input.evidenceUrl) {
    let url: URL;
    try {
      url = new URL(input.evidenceUrl);
    } catch {
      throw new ComplianceError("Evidence URL must be a valid URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ComplianceError("Evidence URL must use http(s).");
    }
  }
}
