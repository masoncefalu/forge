import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/currentUser";
import UserSwitcher from "@/components/UserSwitcher";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PennyForge",
  description:
    "Receipt-verified local deal intelligence for penny items and hidden clearance.",
};

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/search", label: "Search" },
  { href: "/report/new", label: "Report a find" },
  { href: "/route", label: "Route" },
  { href: "/alerts", label: "Alerts" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/admin", label: "Admin" },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [users, current] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrentUser(),
  ]);

  return (
    <html lang="en">
      <body>
        <header className="border-b border-stone-300 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-forge-600">
              Penny<span className="text-stone-900">Forge</span>
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-stone-600 hover:text-forge-600">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <UserSwitcher
                users={users.map((u) => ({ id: u.id, handle: u.handle, role: u.role }))}
                currentId={current?.id ?? ""}
              />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 pt-4 text-xs text-stone-500">
          Community-reported deals. Prices vary by store and change fast — availability is never
          guaranteed. PennyForge is not affiliated with any retailer. Be kind to store employees.
        </footer>
      </body>
    </html>
  );
}
