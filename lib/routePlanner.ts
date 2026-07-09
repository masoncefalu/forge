// Builds route-planner input from the DB for a given user, then ranks stores
// with the pure functions in lib/route.ts.

import { prisma } from "./db";
import { haversineMiles } from "./geo";
import { toLeadView } from "./leads";
import { isExpired } from "./reports";
import { rankStores, type RankedStore, type RouteStoreInput } from "./route";

// Fallback origin if the user has no home coordinates (downtown Atlanta).
const DEFAULT_ORIGIN = { lat: 33.749, lng: -84.388 };

export async function getRankedStoresForUser(user: {
  homeLat: number | null;
  homeLng: number | null;
}): Promise<RankedStore[]> {
  const origin = {
    lat: user.homeLat ?? DEFAULT_ORIGIN.lat,
    lng: user.homeLng ?? DEFAULT_ORIGIN.lng,
  };

  const stores = await prisma.store.findMany({
    include: {
      reports: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        include: {
          product: { include: { retailer: true } },
          store: true,
          user: true,
          votes: true,
        },
      },
    },
  });

  const inputs: RouteStoreInput[] = stores.map((s) => ({
    storeId: s.id,
    storeName: `${s.name} (${s.city}, ${s.state})`,
    distanceMiles: +haversineMiles(origin.lat, origin.lng, s.lat, s.lng).toFixed(1),
    leads: s.reports
      .map((r) => toLeadView(r))
      // Expired leads are derived, read-time-only (lib/reports.ts#isExpired)
      // and excluded here the same way suppressed reports are already
      // excluded by the status query above.
      .filter((view) => !isExpired(view.breakdown.effectiveAgeDays, view.dealType))
      .map((view) => ({
        // Estimated resale/retail value in dollars; falls back to paid price.
        estValue: (view.msrpCents ?? view.priceCents) / 100,
        confidence: view.score,
        suppressed: false, // suppressed reports are already filtered out above
      })),
  }));

  return rankStores(inputs);
}
