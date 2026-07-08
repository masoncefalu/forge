// Alert quality controls — high-signal alerts only.
//
// Rules:
// 1. Only leads at or above ALERT_THRESHOLD confidence fire alerts.
// 2. One alert per (productId, storeId) per 24h window, no matter how many
//    reports land — duplicate suppression keeps channels quiet.
// 3. Fan-out is mock in the MVP: Alert rows for nearby (same-state) users,
//    rendered on /alerts. Real push/email is a later phase.

import { ALERT_THRESHOLD } from "./scoring";

export { ALERT_THRESHOLD };

export const ALERT_DEDUPE_WINDOW_MS = 24 * 3600 * 1000;

export interface ExistingAlert {
  productId: string;
  storeId: string;
  createdAt: Date;
}

export function shouldCreateAlert(
  existing: ExistingAlert[],
  candidate: { productId: string; storeId: string; score: number; now?: Date }
): boolean {
  const now = candidate.now ?? new Date();
  if (candidate.score < ALERT_THRESHOLD) return false;
  return !existing.some(
    (a) =>
      a.productId === candidate.productId &&
      a.storeId === candidate.storeId &&
      now.getTime() - a.createdAt.getTime() < ALERT_DEDUPE_WINDOW_MS
  );
}
