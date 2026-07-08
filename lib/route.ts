// Route ROI scoring — "is this trip worth the gas?"
//
// expectedValue(store) = Σ over active leads of estValue × (confidence / 100)
// tripCost             = roundTripMiles × costPerMile (gas-only default)
// routeScore           = expectedValue − tripCost
//
// Stores are ranked by routeScore descending; non-positive scores are
// excluded (the trip costs more than the expected haul). Suppressed leads
// contribute nothing. This is deliberately a single-store ranking for the
// MVP — multi-stop TSP ordering is a later phase.

export const DEFAULT_COST_PER_MILE = 0.15; // gas-only estimate, user-tunable later

export interface RouteLead {
  estValue: number; // dollars (e.g. product msrp)
  confidence: number; // 0..100
  suppressed: boolean;
}

export interface RouteStoreInput {
  storeId: string;
  storeName: string;
  distanceMiles: number; // one-way from user's home point
  leads: RouteLead[];
}

export interface RankedStore {
  storeId: string;
  storeName: string;
  distanceMiles: number;
  expectedValue: number;
  tripCost: number;
  routeScore: number;
  leadCount: number;
}

export function expectedStoreValue(leads: RouteLead[]): number {
  return leads
    .filter((l) => !l.suppressed)
    .reduce((sum, l) => sum + l.estValue * (l.confidence / 100), 0);
}

export function scoreStore(
  store: RouteStoreInput,
  costPerMile: number = DEFAULT_COST_PER_MILE
): RankedStore {
  const expectedValue = expectedStoreValue(store.leads);
  const tripCost = store.distanceMiles * 2 * costPerMile;
  return {
    storeId: store.storeId,
    storeName: store.storeName,
    distanceMiles: store.distanceMiles,
    expectedValue: +expectedValue.toFixed(2),
    tripCost: +tripCost.toFixed(2),
    routeScore: +(expectedValue - tripCost).toFixed(2),
    leadCount: store.leads.filter((l) => !l.suppressed).length,
  };
}

export function rankStores(
  stores: RouteStoreInput[],
  costPerMile: number = DEFAULT_COST_PER_MILE
): RankedStore[] {
  return stores
    .map((s) => scoreStore(s, costPerMile))
    .filter((s) => s.routeScore > 0)
    .sort((a, b) => b.routeScore - a.routeScore);
}
