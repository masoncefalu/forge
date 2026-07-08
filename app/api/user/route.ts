import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_COOKIE } from "@/lib/currentUser";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Unknown user" }, { status: 404 });

  const jar = await cookies();
  jar.set(USER_COOKIE, user.id, { path: "/" });
  return NextResponse.json({ ok: true });
}
