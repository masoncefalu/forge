// POST /api/reports/:id/vote — confirm or mark a lead dead.
//
// One vote per (report, user); voting again overwrites the prior vote rather
// than double counting. Reporter trust adjusts by the NET change only
// (lib/scoring.ts#voteTrustDelta) — resubmitting the same vote is a no-op
// and switching CONFIRMED<->DEAD undoes the old delta before applying the
// new one, so repeatedly toggling one vote can't be used to inflate or
// crater a reporter's trust. Suppression
// (2+ dead votes outnumbering confirms) flips status to SUPPRESSED so the
// lead drops out of the feed, alerts, and route planner. The status held
// just before suppression is saved to previousStatus and restored verbatim
// if enough confirms arrive later — this is what lets an already-APPROVED
// report survive a suppress/unsuppress cycle instead of being reset to
// PENDING and reappearing in the moderation queue.
//
// The read (report + existing vote) → write (vote, trust, status) sequence
// runs inside a single prisma.$transaction so two concurrent votes on the
// SAME report can't interleave their reads and clobber each other's
// status write (lost update). That alone doesn't cover trustScore, though:
// a reporter can hold multiple reports, so two votes landing on two
// DIFFERENT reports by the same reporter run in two separate transactions
// that could each read the same starting trustScore and then both write a
// stale computed value. SQLite's single-writer locking serializes the
// WRITES but not the earlier READS each transaction based its computed
// value on. To close that gap, the trust update is a single atomic
// "UPDATE ... SET trustScore = trustScore + delta" (lib/scoring.ts#voteTrustDelta)
// instead of a read-then-absolute-write — atomic at the SQL statement level
// regardless of transaction isolation, with clamping done in the same
// statement so it can never observe a stale intermediate value.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { VOTE_TYPES } from "@/lib/constants";
import { isSuppressed, voteTrustDelta } from "@/lib/scoring";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No current user" }, { status: 401 });

  const { vote } = await req.json();
  if (!VOTE_TYPES.includes(vote)) {
    return NextResponse.json({ error: `vote must be one of ${VOTE_TYPES.join(", ")}` }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId } });
    if (!report) return { error: "Unknown report", status: 404 as const };
    if (report.userId === user.id) {
      return { error: "You can't vote on your own report", status: 403 as const };
    }

    const existingVote = await tx.reportVote.findUnique({
      where: { reportId_userId: { reportId, userId: user.id } },
    });

    await tx.reportVote.upsert({
      where: { reportId_userId: { reportId, userId: user.id } },
      create: { reportId, userId: user.id, vote },
      update: { vote, createdAt: new Date() },
    });

    const delta = voteTrustDelta(
      (existingVote?.vote as "CONFIRMED" | "DEAD" | undefined) ?? null,
      vote
    );
    if (delta !== 0) {
      await tx.$executeRaw`UPDATE "User" SET "trustScore" = MAX(0, MIN(100, "trustScore" + ${delta})) WHERE "id" = ${report.userId}`;
    }

    const confirms = await tx.reportVote.count({ where: { reportId, vote: "CONFIRMED" } });
    const deads = await tx.reportVote.count({ where: { reportId, vote: "DEAD" } });
    const suppressed = isSuppressed({ confirms, deads });

    if (suppressed && report.status !== "SUPPRESSED") {
      await tx.report.update({
        where: { id: reportId },
        data: { status: "SUPPRESSED", previousStatus: report.status },
      });
    } else if (!suppressed && report.status === "SUPPRESSED") {
      await tx.report.update({
        where: { id: reportId },
        data: { status: report.previousStatus ?? "PENDING", previousStatus: null },
      });
    }

    return { confirms, deads, suppressed };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
