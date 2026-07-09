import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { MODERATABLE_STATUSES } from "@/lib/constants";
import type { DealType, EvidenceType } from "@/lib/constants";
import { isSuppressed, scoreBreakdown, ageInDays } from "@/lib/scoring";
import { isExpired } from "@/lib/reports";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "CAPTAIN")) {
    return NextResponse.json({ error: "Moderator role required" }, { status: 403 });
  }

  // A malformed or non-object body is the caller's error, not a 500.
  const body = await req.json().catch(() => null);
  const status = body?.status;
  // PENDING is the pre-moderation default and SUPPRESSED/EXPIRED are derived
  // (see the vote route and lib/reports.ts#isExpired) — a moderator can only
  // approve or reject, never set those states directly through this endpoint.
  if (!MODERATABLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${MODERATABLE_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Same transaction discipline as the vote route: the suppression/expiry
  // check and the status write must not interleave with a concurrent vote's
  // suppress/unsuppress transition, or an Approve racing a dead vote would
  // overwrite SUPPRESSED (and null out previousStatus), re-surfacing a lead
  // the community just killed.
  const run = () => prisma.$transaction(async (tx) => {
    const existing = await tx.report.findUnique({
      where: { id: reportId },
      include: { votes: true, user: true },
    });
    if (!existing) return { error: "Unknown report", status: 404 as const };

    // A report can still be community-suppressed (2+ dead votes outnumbering
    // confirms) or already past its expiry threshold even while sitting in
    // the moderation queue. Approving it anyway would make a dead-voted or
    // stale lead visible in the feed/search/route planner until the next
    // vote happens to recompute status — silently breaking suppression and
    // expiry. Block both transitions explicitly; REJECTED remains allowed
    // for either case since it doesn't misrepresent the lead as live.
    if (status === "APPROVED") {
      const confirms = existing.votes.filter((v) => v.vote === "CONFIRMED").length;
      const deads = existing.votes.filter((v) => v.vote === "DEAD").length;
      if (isSuppressed({ confirms, deads })) {
        return {
          error: "This report is community-suppressed by dead votes and can't be approved until votes change.",
          status: 409 as const,
        };
      }

      // Mirrors lib/leads.ts#toLeadView's expiry computation, but reads
      // inside this same transaction rather than via getLeadById's separate
      // query — that read must see the same snapshot as the suppression
      // check above, or a concurrent vote could slip through between them.
      const confirmDates = existing.votes
        .filter((v) => v.vote === "CONFIRMED")
        .map((v) => v.createdAt.getTime());
      const lastConfirmAgeDays = confirmDates.length
        ? ageInDays(new Date(Math.max(...confirmDates)))
        : null;
      const { effectiveAgeDays } = scoreBreakdown({
        evidenceType: existing.evidenceType as EvidenceType,
        reporterTrust: existing.user.trustScore,
        confirms,
        deads,
        ageDays: ageInDays(existing.createdAt),
        dealType: existing.dealType as DealType,
        lastConfirmAgeDays,
      });
      if (isExpired(effectiveAgeDays, existing.dealType as DealType)) {
        return {
          error: "This report has expired and can no longer be approved.",
          status: 409 as const,
        };
      }
    }

    const report = await tx.report.update({
      where: { id: reportId },
      data: { status, previousStatus: null },
    });
    return { id: report.id, reportStatus: report.status };
  });

  let result: Awaited<ReturnType<typeof run>>;
  try {
    result = await run();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return NextResponse.json(
        { error: "A vote landed at the same time — please retry." },
        { status: 409 }
      );
    }
    throw e;
  }

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ id: result.id, status: result.reportStatus });
}
