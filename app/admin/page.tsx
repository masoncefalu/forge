// Moderation queue — pending, suppressed, and rejected reports.
// Any ADMIN or CAPTAIN can approve/reject in the MVP (real role gating is a
// later phase; the mock-auth UserSwitcher lets you demo this as forge_admin).

import { getModerationQueue } from "@/lib/leads";
import { getCurrentUser } from "@/lib/currentUser";
import { centsToUSD, timeAgo } from "@/lib/format";
import { EVIDENCE_LABELS } from "@/lib/constants";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import ModerationActions from "@/components/ModerationActions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const canModerate = user?.role === "ADMIN" || user?.role === "CAPTAIN";
  const queue = canModerate ? await getModerationQueue() : [];

  if (!canModerate) {
    return (
      <div className="max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        You&apos;re acting as @{user?.handle ?? "…"} ({user?.role.toLowerCase() ?? "unknown"}).
        Switch to <strong>forge_admin</strong> or <strong>atl_captain</strong> in the header to
        access moderation.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Moderation queue</h1>
      <p className="mt-1 text-sm text-stone-600">
        Pending reports awaiting review, plus suppressed (dead-voted) and rejected reports.
      </p>
      <div className="mt-4 grid gap-3">
        {queue.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            Queue is empty.
          </p>
        )}
        {queue.map((lead) => (
          <div key={lead.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ConfidenceBadge score={lead.score} />
                  <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600">
                    {lead.status}
                  </span>
                </div>
                <h3 className="mt-1 font-semibold">{lead.productName}</h3>
                <p className="text-sm text-stone-600">
                  {lead.storeName} · {lead.city}, {lead.state} · {centsToUSD(lead.priceCents)} ·{" "}
                  {EVIDENCE_LABELS[lead.evidenceType]}
                </p>
                <p className="text-xs text-stone-500">
                  by @{lead.reporterHandle} · {timeAgo(lead.createdAt)} · ✓{lead.confirms} ✗{lead.deads}
                </p>
                {lead.notes && <p className="mt-1 text-sm text-stone-700">{lead.notes}</p>}
              </div>
              <ModerationActions reportId={lead.id} status={lead.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
