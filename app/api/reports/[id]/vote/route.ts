// POST /api/reports/:id/vote — confirm or mark a lead dead.
//
// One vote per (report, user); voting again overwrites the prior vote rather
// than double counting. Reporter trust adjusts by the NET change only
// (lib/scoring.ts#applyVoteChange) — resubmitting the same vote is a no-op
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
// The read (report + existing vote + trust) → write (vote, trust, status)
// sequence runs inside a single prisma.$transaction so two concurrent votes
// on the same report can't interleave their reads and clobber each other's
// trust/status write (lost update).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { VOTE_TYPES } from "@/lib/constants";
import { isSuppressed, applyVoteChange } from "@/lib/scoring";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No current user" }, { status: 401 });

  const { vote } = await req.json();
  if (!VOTE_TYPES.includes(vote)) {
    return NextResponse.json({ error: `vote must be one of ${VOTE_TYPES.join(", ")}` }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUnique({ where: { id: reportId }, include: { user: true } });
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

    await tx.user.update({
      where: { id: report.userId },
      data: {
        trustScore: applyVoteChange(
          report.user.trustScore,
          (existingVote?.vote as "CONFIRMED" | "DEAD" | undefined) ?? null,
          vote
        ),
      },
    });

    const votes = await tx.reportVote.findMany({ where: { reportId } });
    const confirms = votes.filter((v) => v.vote === "CONFIRMED").length;
    const deads = votes.filter((v) => v.vote === "DEAD").length;
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
