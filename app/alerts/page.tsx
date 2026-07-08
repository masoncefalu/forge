// Mock alerts inbox — Alert rows are created at report time (fan-out to
// nearby users) with 24h per-(product, store) dedupe. Real push/email later.

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { timeAgo } from "@/lib/format";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import MarkReadButton from "@/components/MarkReadButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const user = await getCurrentUser();
  const alerts = user
    ? await prisma.alert.findMany({
        where: { userId: user.id },
        include: { product: true, store: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Alerts</h1>
      <p className="mt-1 text-sm text-stone-600">
        High-signal only: leads must clear a confidence threshold, and each product+store pair
        alerts at most once per 24 hours. (Mock inbox — push/email arrive in a later phase.)
      </p>
      <div className="mt-4 grid gap-3">
        {alerts.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            No alerts for @{user?.handle ?? "…"} yet. Submit a strong report to trigger the fan-out.
          </p>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-4 ${
              a.readAt ? "border-stone-200 bg-stone-50 opacity-70" : "border-forge-500 bg-white"
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <ConfidenceBadge score={a.score} />
                <span className="text-xs text-stone-500">{timeAgo(a.createdAt)}</span>
                {!a.readAt && (
                  <span className="rounded bg-forge-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-forge-900">
                    new
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm">{a.message}</p>
              {a.reportId && (
                <Link href={`/leads/${a.reportId}`} className="text-xs text-forge-600 underline">
                  View lead
                </Link>
              )}
            </div>
            {!a.readAt && <MarkReadButton alertId={a.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
