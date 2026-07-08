import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No current user" }, { status: 401 });

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert || alert.userId !== user.id) {
    return NextResponse.json({ error: "Unknown alert" }, { status: 404 });
  }

  await prisma.alert.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
