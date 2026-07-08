// Alert quality controls — high-signal alerts only.
//
// Rules:
// 1. Only leads at or above ALERT_THRESHOLD confidence fire alerts.
// 2. Fan-out targets users within ALERT_RADIUS_MILES of the store (excluding
//    the reporter); users with no home coordinates are skipped rather than
//    alerted indiscriminately.
// 3. Dedupe is per RECIPIENT: each user gets at most one alert for a given
//    (productId, storeId) pair per 24h window, no matter how many reports
//    land on it — duplicate suppression keeps channels quiet without
//    silently dropping other qualifying recipients. Callers must pass only
//    that recipient's own prior alerts into shouldCreateAlert.
// 4. Fan-out is mock in the MVP: Alert rows rendered on /alerts. Real
//    push/email is a later phase.

import { ALERT_THRESHOLD } from "./scoring";
import { haversineMiles } from "./geo";

export { ALERT_THRESHOLD };

export const ALERT_DEDUPE_WINDOW_MS = 24 * 3600 * 1000;
export const ALERT_RADIUS_MILES = 75;

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

export interface AlertCandidateUser {
  id: string;
  homeLat: number | null;
  homeLng: number | null;
}

/** Nearby-user fan-out: excludes the reporter and anyone without known home coordinates. */
export function pickNearbyRecipients(
  users: AlertCandidateUser[],
  reporterId: string,
  store: { lat: number; lng: number },
  radiusMiles: number = ALERT_RADIUS_MILES
): AlertCandidateUser[] {
  return users.filter((u) => {
    if (u.id === reporterId) return false;
    if (u.homeLat == null || u.homeLng == null) return false;
    return haversineMiles(u.homeLat, u.homeLng, store.lat, store.lng) <= radiusMiles;
  });
}
