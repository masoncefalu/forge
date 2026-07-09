// Report helpers — same-day duplicate prevention and derived expiry.
//
// The DB enforces uniqueness on (productId, storeId, userId, reportDate) via
// @@unique in prisma/schema.prisma. SQLite prohibits expressions in UNIQUE
// constraints, so reportDate is a real column: the UTC calendar date at
// midnight. These helpers keep app-layer logic consistent with the schema.

import type { DealType } from "./constants";
import { HALF_LIFE_DAYS } from "./scoring";

/** Truncate a timestamp to its UTC calendar date at midnight. */
export function toReportDate(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** App-layer duplicate key, mirrors the DB unique constraint. */
export function makeDupKey(
  productId: string,
  storeId: string,
  userId: string,
  reportDate: Date
): string {
  return `${productId}|${storeId}|${userId}|${reportDate.toISOString().slice(0, 10)}`;
}

/** Detect Prisma's unique-constraint violation without importing Prisma here. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

// EXPIRED is a derived, read-time-only lifecycle state — never written to
// the DB (no background job in the MVP; see CLAUDE.md). A lead counts as
// expired once its effective age (post decay-refresh from confirms, see
// lib/scoring.ts#scoreBreakdown) reaches 4 half-lives of its deal type's
// decay clock: PENNY at 28 days, CLEARANCE at 56 days (<=6.25% of base decay
// factor remaining, i.e. effectively dead weight even before it hits 0).
export const EXPIRY_HALF_LIVES = 4;

export function isExpired(effectiveAgeDays: number, dealType: DealType): boolean {
  return effectiveAgeDays >= EXPIRY_HALF_LIVES * HALF_LIFE_DAYS[dealType];
}
