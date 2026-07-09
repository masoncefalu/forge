// Lead detail — shows the full confidence breakdown ("why is this trusted?"),
// evidence, votes, and confirm/dead voting.

import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/leads";
import { centsToUSD, timeAgo } from "@/lib/format";
import { EVIDENCE_LABELS } from "@/lib/constants";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import VoteButtons from "@/components/VoteButtons";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();
  const b = lead.breakdown;

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{lead.productName}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {lead.retailerName} · {lead.storeName} · {lead.city}, {lead.state} {lead.zip}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            UPC {lead.upc ?? "—"} · SKU {lead.sku ?? "—"} · reported {timeAgo(lead.createdAt)} by @
            {lead.reporterHandle} · status {lead.status}
            {lead.expired && (
              <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 font-medium text-stone-600">
                Expired
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-forge-600">{centsToUSD(lead.priceCents)}</div>
          {lead.msrpCents ? (
            <div className="text-sm text-stone-400 line-through">{centsToUSD(lead.msrpCents)}</div>
          ) : null}
        </div>
      </div>

      {lead.notes && (
        <p className="mt-4 rounded-lg border border-stone-200 bg-white p-3 text-sm">{lead.notes}</p>
      )}

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          Why this lead scores <ConfidenceBadge score={lead.score} />
        </h2>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-stone-100">
            <tr>
              <td className="py-1.5 text-stone-600">
                Evidence: {EVIDENCE_LABELS[lead.evidenceType]}
                {lead.evidenceUrl && (
                  <>
                    {" "}
                    · <a className="text-forge-600 underline" href={lead.evidenceUrl}>view</a>
                  </>
                )}
              </td>
              <td className="py-1.5 text-right font-mono">+{b.base}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-stone-600">
                Reporter trust (@{lead.reporterHandle}, {lead.reporterTrust}/100)
              </td>
              <td className="py-1.5 text-right font-mono">+{b.trustBonus}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-stone-600">
                Community confirmations ({lead.confirms}, capped at 3)
              </td>
              <td className="py-1.5 text-right font-mono">+{b.confirmBonus}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-stone-600">Dead votes ({lead.deads})</td>
              <td className="py-1.5 text-right font-mono">−{b.deadPenalty}</td>
            </tr>
            <tr>
              <td className="py-1.5 text-stone-600">
                Freshness decay ({b.effectiveAgeDays.toFixed(1)}d old,{" "}
                {lead.dealType === "PENNY" ? "7" : "14"}-day half-life; confirmations refresh it)
              </td>
              <td className="py-1.5 text-right font-mono">×{b.decayFactor.toFixed(2)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1.5">Confidence</td>
              <td className="py-1.5 text-right font-mono">{b.final}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">Been to this store?</h2>
        <p className="mb-2 mt-1 text-sm text-stone-600">
          Confirm if it rang up at this price, or mark it dead if it&apos;s gone. Votes update the
          reporter&apos;s trust and can suppress dead leads. You can&apos;t vote on your own report.
        </p>
        <VoteButtons reportId={lead.id} />
      </section>
    </div>
  );
}
