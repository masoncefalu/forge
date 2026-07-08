// Enum-like constants. SQLite (via Prisma) does not support native enums,
// so these are the single source of truth for string fields in the schema.

export const ROLES = ["USER", "CAPTAIN", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const DEAL_TYPES = ["PENNY", "CLEARANCE"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const EVIDENCE_TYPES = [
  "RECEIPT",
  "SHELF_TAG_PHOTO",
  "PRODUCT_PHOTO",
  "TEXT_ONLY",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const REPORT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUPPRESSED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// PENDING is the default on creation and SUPPRESSED is vote-driven only
// (lib/scoring.ts#isSuppressed via the vote route) — moderators can only
// ever move a report to APPROVED or REJECTED, never set those two directly.
export const MODERATABLE_STATUSES = ["APPROVED", "REJECTED"] as const;
export type ModeratableStatus = (typeof MODERATABLE_STATUSES)[number];

export const VOTE_TYPES = ["CONFIRMED", "DEAD"] as const;
export type VoteType = (typeof VOTE_TYPES)[number];

export const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  RECEIPT: "Receipt",
  SHELF_TAG_PHOTO: "Shelf tag photo",
  PRODUCT_PHOTO: "Product photo",
  TEXT_ONLY: "Text only",
};
