// Local feed — filter by state / retailer / store / minimum confidence.

import { prisma } from "@/lib/db";
import { getFeedLeads } from "@/lib/leads";
import LeadCard from "@/components/LeadCard";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; retailerId?: string; storeId?: string; minScore?: string }>;
}) {
  const params = await searchParams;
  const [stores, retailers] = await Promise.all([
    prisma.store.findMany({ orderBy: { name: "asc" } }),
    prisma.retailer.findMany({ orderBy: { name: "asc" } }),
  ]);
  const states = [...new Set(stores.map((s) => s.state))].sort();

  const leads = await getFeedLeads({
    state: params.state || undefined,
    retailerId: params.retailerId || undefined,
    storeId: params.storeId || undefined,
    minScore: params.minScore ? Number(params.minScore) : undefined,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Local deal feed</h1>
      <p className="mt-1 text-sm text-stone-600">
        Community-reported penny and hidden-clearance leads, ranked by receipt-verified confidence.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">State</span>
          <select name="state" defaultValue={params.state ?? ""} className="rounded border border-stone-300 px-2 py-1">
            <option value="">All</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Retailer</span>
          <select name="retailerId" defaultValue={params.retailerId ?? ""} className="rounded border border-stone-300 px-2 py-1">
            <option value="">All</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Store</span>
          <select name="storeId" defaultValue={params.storeId ?? ""} className="rounded border border-stone-300 px-2 py-1">
            <option value="">All</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.state})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Min confidence</span>
          <select name="minScore" defaultValue={params.minScore ?? ""} className="rounded border border-stone-300 px-2 py-1">
            <option value="">Any</option>
            <option value="25">25+</option>
            <option value="50">50+</option>
            <option value="75">75+</option>
          </select>
        </label>
        <button className="rounded bg-forge-600 px-3 py-1.5 font-semibold text-white hover:bg-forge-500">
          Filter
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        {leads.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            No visible leads match these filters. Suppressed and rejected leads are hidden.
          </p>
        )}
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}
