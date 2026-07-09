// Lead views — reports joined with votes and scored for display.

import { prisma } from "./db";
import type { DealType, EvidenceType } from "./constants";
import { ageInDays, scoreBreakdown, type ScoreBreakdown } from "./scoring";
import { isExpired } from "./reports";

export interface LeadView {
  id: string;
  productId: string;
  productName: string;
  upc: string | null;
  sku: string | null;
  msrpCents: number | null;
  storeId: string;
  storeName: string;
  retailerName: string;
  city: string;
  state: string;
  zip: string;
  priceCents: number;
  dealType: DealType;
  evidenceType: EvidenceType;
  evidenceUrl: string | null;
  status: string;
  notes: string | null;
  reporterHandle: string;
  reporterTrust: number;
  confirms: number;
  deads: number;
  createdAt: Date;
  score: number;
  breakdown: ScoreBreakdown;
  expired: boolean;
}

type ReportWithRelations = Awaited<ReturnType<typeof fetchReports>>[number];

function fetchReports(where: object) {
  return prisma.report.findMany({
    where,
    include: {
      product: { include: { retailer: true } },
      store: true,
      user: true,
      votes: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function toLeadView(r: ReportWithRelations, now: Date = new Date()): LeadView {
  const confirms = r.votes.filter((v) => v.vote === "CONFIRMED").length;
  const deads = r.votes.filter((v) => v.vote === "DEAD").length;
  const confirmDates = r.votes
    .filter((v) => v.vote === "CONFIRMED")
    .map((v) => v.createdAt.getTime());
  const lastConfirmAgeDays = confirmDates.length
    ? ageInDays(new Date(Math.max(...confirmDates)), now)
    : null;

  const breakdown = scoreBreakdown({
    evidenceType: r.evidenceType as EvidenceType,
    reporterTrust: r.user.trustScore,
    confirms,
    deads,
    ageDays: ageInDays(r.createdAt, now),
    dealType: r.dealType as DealType,
    lastConfirmAgeDays,
  });
  const expired = isExpired(breakdown.effectiveAgeDays, r.dealType as DealType);

  return {
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    upc: r.product.upc,
    sku: r.product.sku,
    msrpCents: r.product.msrpCents,
    storeId: r.storeId,
    storeName: r.store.name,
    retailerName: r.product.retailer.name,
    city: r.store.city,
    state: r.store.state,
    zip: r.store.zip,
    priceCents: r.priceCents,
    dealType: r.dealType as DealType,
    evidenceType: r.evidenceType as EvidenceType,
    evidenceUrl: r.evidenceUrl,
    status: r.status,
    notes: r.notes,
    reporterHandle: r.user.handle,
    reporterTrust: r.user.trustScore,
    confirms,
    deads,
    createdAt: r.createdAt,
    score: breakdown.final,
    breakdown,
    expired,
  };
}

/**
 * Feed: visible leads (PENDING + APPROVED), filterable, sorted by score.
 * Leads past 4 half-lives of effective age are excluded as expired — a
 * derived, read-time check (lib/reports.ts#isExpired), not a stored status.
 */
export async function getFeedLeads(filter: {
  state?: string;
  storeId?: string;
  retailerId?: string;
  minScore?: number;
}): Promise<LeadView[]> {
  const where: Record<string, unknown> = {
    status: { in: ["PENDING", "APPROVED"] },
  };
  if (filter.storeId) where.storeId = filter.storeId;
  if (filter.state || filter.retailerId) {
    where.store = {
      ...(filter.state ? { state: filter.state } : {}),
      ...(filter.retailerId ? { retailerId: filter.retailerId } : {}),
    };
  }
  const reports = await fetchReports(where);
  return reports
    .map((r) => toLeadView(r))
    .filter((l) => !l.expired && l.score >= (filter.minScore ?? 0))
    .sort((a, b) => b.score - a.score);
}

export async function getLeadById(id: string): Promise<LeadView | null> {
  const reports = await fetchReports({ id });
  return reports.length ? toLeadView(reports[0]) : null;
}

/** Admin queue: pending, suppressed, and rejected reports. */
export async function getModerationQueue(): Promise<LeadView[]> {
  const reports = await fetchReports({
    status: { in: ["PENDING", "SUPPRESSED", "REJECTED"] },
  });
  return reports.map((r) => toLeadView(r));
}
