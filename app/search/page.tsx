// Manual UPC / SKU / name search. Barcode-camera scanning is a later phase —
// this input is the same code path a scanner will feed into.

import { prisma } from "@/lib/db";
import { toLeadView } from "@/lib/leads";
import LeadCard from "@/components/LeadCard";
import { centsToUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const products = query
    ? await prisma.product.findMany({
        where: {
          OR: [
            { upc: { contains: query } },
            { sku: { contains: query } },
            { name: { contains: query } },
          ],
        },
        include: {
          retailer: true,
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
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">UPC / SKU search</h1>
      <p className="mt-1 text-sm text-stone-600">
        Type or paste a UPC, SKU, or product name. Camera barcode scanning lands in a later phase.
      </p>
      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="e.g. 192115000101 or 1001-483-392"
          className="w-full max-w-md rounded border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="rounded bg-forge-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forge-500">
          Search
        </button>
      </form>

      {query && (
        <div className="mt-6 grid gap-6">
          {products.length === 0 && (
            <p className="text-sm text-stone-500">
              No products match &ldquo;{query}&rdquo;. Try a partial UPC or the product name.
            </p>
          )}
          {products.map((p) => (
            <section key={p.id}>
              <h2 className="font-semibold">
                {p.name}{" "}
                <span className="text-sm font-normal text-stone-500">
                  · {p.retailer.name} · UPC {p.upc ?? "—"} · SKU {p.sku ?? "—"}
                  {p.msrpCents ? ` · retail ${centsToUSD(p.msrpCents)}` : ""}
                </span>
              </h2>
              <div className="mt-2 grid gap-3">
                {p.reports.length === 0 ? (
                  <p className="text-sm text-stone-500">No active leads for this product yet.</p>
                ) : (
                  p.reports.map((r) => <LeadCard key={r.id} lead={toLeadView(r)} />)
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
