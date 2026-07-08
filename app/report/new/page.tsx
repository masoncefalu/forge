import { prisma } from "@/lib/db";
import ReportForm from "@/components/ReportForm";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const [stores, products] = await Promise.all([
    prisma.store.findMany({ include: { retailer: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ include: { retailer: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Report a find</h1>
      <p className="mt-1 text-sm text-stone-600">
        First-hand, in-store finds only. Receipts score highest. One report per product, store, and
        day — re-confirm existing leads instead of re-posting them.
      </p>
      <ReportForm
        stores={stores.map((s) => ({
          id: s.id,
          label: `${s.name} — ${s.city}, ${s.state}`,
          retailerId: s.retailerId,
          retailerName: s.retailer.name,
        }))}
        products={products.map((p) => ({
          id: p.id,
          label: `${p.name} (${p.retailer.name})`,
          retailerId: p.retailerId,
        }))}
      />
    </div>
  );
}
