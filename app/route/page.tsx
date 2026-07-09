// Route ROI planner — "which trip is worth the gas today?"
// Ranks stores by expected haul value (est. value × confidence) minus a
// round-trip gas estimate from the current user's home point.

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { getRankedStoresForUser } from "@/lib/routePlanner";
import { DEFAULT_COST_PER_MILE } from "@/lib/route";
import SaveRoutePlanButton from "@/components/SaveRoutePlanButton";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RoutePage() {
  const user = await getCurrentUser();
  if (!user) return <p>No users seeded yet — run npm run db:seed.</p>;

  const ranked = await getRankedStoresForUser(user);
  const savedPlans = await prisma.routePlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Route planner</h1>
      <p className="mt-1 text-sm text-stone-600">
        Stores ranked for @{user.handle} (home {user.homeZip ?? "unset"}) by expected value of
        active leads minus round-trip gas at ${DEFAULT_COST_PER_MILE.toFixed(2)}/mile. Trips that
        cost more than the expected haul are hidden.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Store</th>
              <th className="px-3 py-2 text-right">Distance</th>
              <th className="px-3 py-2 text-right">Leads</th>
              <th className="px-3 py-2 text-right">Expected value</th>
              <th className="px-3 py-2 text-right">Trip cost</th>
              <th className="px-3 py-2 text-right">Route score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {ranked.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-stone-500">
                  No trips currently beat their gas cost.
                </td>
              </tr>
            )}
            {ranked.map((s, i) => (
              <tr key={s.storeId}>
                <td className="px-3 py-2 font-mono text-stone-400">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{s.storeName}</td>
                <td className="px-3 py-2 text-right">{s.distanceMiles} mi</td>
                <td className="px-3 py-2 text-right">{s.leadCount}</td>
                <td className="px-3 py-2 text-right">${s.expectedValue.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-stone-500">−${s.tripCost.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold text-forge-600">
                  {s.routeScore.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ranked.length > 0 && <SaveRoutePlanButton />}

      <section className="mt-8">
        <h2 className="font-semibold">Saved plans</h2>
        <div className="mt-2 grid gap-2">
          {savedPlans.length === 0 && (
            <p className="text-sm text-stone-500">No saved plans yet.</p>
          )}
          {savedPlans.map((p) => {
            const stops = JSON.parse(p.stopsJson) as { storeName: string; routeScore: number }[];
            return (
              <div key={p.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-stone-500">
                    {timeAgo(p.createdAt)} · total {p.totalScore.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-stone-600">
                  {stops.map((s) => s.storeName).join(" → ")}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
