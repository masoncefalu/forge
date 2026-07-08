// Report helpers — same-day duplicate prevention.
//
// The DB enforces uniqueness on (productId, storeId, userId, reportDate) via
// @@unique in prisma/schema.prisma. SQLite prohibits expressions in UNIQUE
// constraints, so reportDate is a real column: the UTC calendar date at
// midnight. These helpers keep app-layer logic consistent with the schema.

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
