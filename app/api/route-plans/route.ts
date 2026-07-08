import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import { getRankedStoresForUser } from "@/lib/routePlanner";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No current user" }, { status: 401 });

  const { name } = await req.json();
  const ranked = await getRankedStoresForUser(user);
  const totalScore = ranked.reduce((sum, s) => sum + s.routeScore, 0);

  const plan = await prisma.routePlan.create({
    data: {
      userId: user.id,
      name: name || "My route",
      stopsJson: JSON.stringify(ranked),
      totalScore,
    },
  });

  return NextResponse.json({ id: plan.id }, { status: 201 });
}
