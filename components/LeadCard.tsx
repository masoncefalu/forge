import Link from "next/link";
import type { LeadView } from "@/lib/leads";
import { centsToUSD, timeAgo } from "@/lib/format";
import { EVIDENCE_LABELS } from "@/lib/constants";
import ConfidenceBadge from "./ConfidenceBadge";

export default function LeadCard({ lead }: { lead: LeadView }) {
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-forge-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                lead.dealType === "PENNY"
                  ? "bg-forge-100 text-forge-900"
                  : "bg-sky-100 text-sky-900"
              }`}
            >
              {lead.dealType}
            </span>
            {lead.status === "PENDING" && (
              <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600">
                pending review
              </span>
            )}
          </div>
          <h3 className="mt-1 font-semibold">{lead.productName}</h3>
          <p className="text-sm text-stone-600">
            {lead.storeName} · {lead.city}, {lead.state} {lead.zip}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-forge-600">{centsToUSD(lead.priceCents)}</div>
          {lead.msrpCents ? (
            <div className="text-xs text-stone-400 line-through">{centsToUSD(lead.msrpCents)}</div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <ConfidenceBadge score={lead.score} />
        <span>{EVIDENCE_LABELS[lead.evidenceType]}</span>
        <span>
          ✓ {lead.confirms} · ✗ {lead.deads}
        </span>
        <span>
          by @{lead.reporterHandle} (trust {lead.reporterTrust})
        </span>
        <span>{timeAgo(lead.createdAt)}</span>
      </div>
    </Link>
  );
}
