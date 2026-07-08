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
// The trustScore and status read-modify-write below run inside a single
// transaction. Two votes on the same report landing close together (e.g.
// two different users confirming within moments of each other) each need a
// fresh read of the reporter's trustScore and the report's status — reading
// those once up front and writing later would let concurrent requests
// interleave and silently lose one voter's trust delta or status flip (a
// classic lost-update race).

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

  const reportExists = await prisma.report.findUnique({ where: { id: reportId } });
  if (!reportExists) return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  if (reportExists.userId === user.id) {
    return NextResponse.json({ error: "You can't vote on your own report" }, { status: 403 });
  }

  const { confirms, deads, suppressed } = await prisma.$transaction(async (tx) => {
    const report = await tx.report.findUniqueOrThrow({
      where: { id: reportId },
      include: { user: true },
    });

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

  return NextResponse.json({ confirms, deads, suppressed });
}
