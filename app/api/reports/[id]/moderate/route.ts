import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { REPORT_STATUSES } from "@/lib/constants";

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

  const report = await prisma.report.update({ where: { id: reportId }, data: { status } });
  return NextResponse.json({ id: report.id, status: report.status });
}
