import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { REPORT_STATUSES } from "@/lib/constants";
import { isSuppressed } from "@/lib/scoring";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "CAPTAIN")) {
    return NextResponse.json({ error: "Moderator role required" }, { status: 403 });
  }

  const { status } = await req.json();
  if (!REPORT_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${REPORT_STATUSES.join(", ")}` }, { status: 400 });
  }

  const existing = await prisma.report.findUnique({ where: { id: reportId }, include: { votes: true } });
  if (!existing) return NextResponse.json({ error: "Unknown report" }, { status: 404 });

  // A report can still be community-suppressed (2+ dead votes outnumbering
  // confirms) even while sitting in the moderation queue. Approving it
  // anyway would make a dead-voted lead visible in the feed/alerts/route
  // planner until the next vote happens to recompute status — silently
  // breaking dead-deal suppression. Block that transition explicitly;
  // REJECTED remains allowed since it doesn't misrepresent the lead as live.
  if (status === "APPROVED") {
    const confirms = existing.votes.filter((v) => v.vote === "CONFIRMED").length;
    const deads = existing.votes.filter((v) => v.vote === "DEAD").length;
    if (isSuppressed({ confirms, deads })) {
      return NextResponse.json(
        { error: "This report is community-suppressed by dead votes and can't be approved until votes change." },
        { status: 409 }
      );
    }
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: { status, previousStatus: null },
  });
  return NextResponse.json({ id: report.id, status: report.status });
}
