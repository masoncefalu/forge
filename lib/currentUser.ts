// Mock auth for the local MVP: the "current user" is a seeded user selected
// via the header UserSwitcher and stored in a cookie. Real auth (NextAuth or
// similar) replaces this in a later phase — keep the same interface.

import { cookies } from "next/headers";
import { prisma } from "./db";

export const USER_COOKIE = "pf_user_id";

export async function getCurrentUser() {
  const jar = await cookies();
  const id = jar.get(USER_COOKIE)?.value;
  if (id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  }
  // Default to the first seeded regular user.
  return prisma.user.findFirst({
    where: { role: "USER" },
    orderBy: { createdAt: "asc" },
  });
}
