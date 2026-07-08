// POST /api/reports/:id/vote — confirm or mark a lead dead.
//
// One vote per (report, user); voting again overwrites the prior vote rather
// than double counting. Reporter trust adjusts with each vote. Suppression
// (2+ dead votes outnumbering confirms) flips status to SUPPRESSED so the
// lead drops out of the feed, alerts, and route planner.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { VOTE_TYPES } from "@/lib/constants";
import { isSuppressed, applyTrustDelta } from "@/lib/scoring";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No current user" }, { status: 401 });

  const { vote } = await req.json();
  if (!VOTE_TYPES.includes(vote)) {
    return NextResponse.json({ error: `vote must be one of ${VOTE_TYPES.join(", ")}` }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { user: true } });
  if (!report) return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  if (report.userId === user.id) {
    return NextResponse.json({ error: "You can't vote on your own report" }, { status: 403 });
  }

  await prisma.reportVote.upsert({
    where: { reportId_userId: { reportId, userId: user.id } },
    create: { reportId, userId: user.id, vote },
    update: { vote, createdAt: new Date() },
  });

  await prisma.user.update({
    where: { id: report.userId },
    data: { trustScore: applyTrustDelta(report.user.trustScore, vote) },
  });

  const votes = await prisma.reportVote.findMany({ where: { reportId } });
  const confirms = votes.filter((v) => v.vote === "CONFIRMED").length;
  const deads = votes.filter((v) => v.vote === "DEAD").length;
  const suppressed = isSuppressed({ confirms, deads });

  if (suppressed && report.status !== "SUPPRESSED") {
    await prisma.report.update({ where: { id: reportId }, data: { status: "SUPPRESSED" } });
  } else if (!suppressed && report.status === "SUPPRESSED") {
    await prisma.report.update({ where: { id: reportId }, data: { status: "APPROVED" } });
  }

  return NextResponse.json({ confirms, deads, suppressed });
}
