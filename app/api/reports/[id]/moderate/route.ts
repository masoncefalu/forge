import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { MODERATABLE_STATUSES } from "@/lib/constants";
import { isSuppressed } from "@/lib/scoring";
import { getLeadById } from "@/lib/leads";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params;
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "CAPTAIN")) {
    return NextResponse.json({ error: "Moderator role required" }, { status: 403 });
  }

  const { status } = await req.json();
  // PENDING is the pre-moderation default and SUPPRESSED is vote-driven only
  // (see the vote route) — a moderator can only approve or reject, never set
  // those two states directly through this endpoint.
  if (!MODERATABLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${MODERATABLE_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const lead = await getLeadById(reportId);
  if (!lead) return NextResponse.json({ error: "Unknown report" }, { status: 404 });

  // A report can still be community-suppressed (2+ dead votes outnumbering
  // confirms) or already past its expiry threshold even while sitting in
  // the moderation queue. Approving it anyway would make a dead-voted or
  // stale lead visible in the feed/search/route planner (or just silently
  // do nothing, since those surfaces filter it right back out) — block
  // both transitions explicitly. REJECTED remains allowed for either case
  // since it doesn't misrepresent the lead as live.
  if (status === "APPROVED") {
    if (isSuppressed({ confirms: lead.confirms, deads: lead.deads })) {
      return NextResponse.json(
        { error: "This report is community-suppressed by dead votes and can't be approved until votes change." },
        { status: 409 }
      );
    }
    if (lead.expired) {
      return NextResponse.json(
        { error: "This report has expired and can no longer be approved." },
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
