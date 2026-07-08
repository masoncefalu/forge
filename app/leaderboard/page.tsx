// Contributor leaderboard — trust score, approved reports, and confirmations
// received. This is the visible face of the reputation system that makes
// contributor incentives real.

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    include: {
      reports: { include: { votes: true } },
    },
  });

  const rows = users
    .map((u) => {
      const approved = u.reports.filter((r) => r.status === "APPROVED").length;
      const confirmsReceived = u.reports.reduce(
        (sum, r) => sum + r.votes.filter((v) => v.vote === "CONFIRMED").length,
        0
      );
      return {
        id: u.id,
        handle: u.handle,
        role: u.role,
        trustScore: u.trustScore,
        approved,
        confirmsReceived,
        totalReports: u.reports.length,
      };
    })
    .sort((a, b) => b.trustScore - a.trustScore || b.approved - a.approved);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Contributor leaderboard</h1>
      <p className="mt-1 text-sm text-stone-600">
        Trust rises with confirmed reports, falls with dead votes. High-trust contributors carry
        more weight in the confidence score and unlock captain moderation.
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Contributor</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-right">Trust</th>
              <th className="px-3 py-2 text-right">Reports</th>
              <th className="px-3 py-2 text-right">Approved</th>
              <th className="px-3 py-2 text-right">Confirms received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-mono text-stone-400">{i + 1}</td>
                <td className="px-3 py-2 font-medium">@{r.handle}</td>
                <td className="px-3 py-2 text-stone-500">{r.role.toLowerCase()}</td>
                <td className="px-3 py-2 text-right font-semibold text-forge-600">{r.trustScore}</td>
                <td className="px-3 py-2 text-right">{r.totalReports}</td>
                <td className="px-3 py-2 text-right">{r.approved}</td>
                <td className="px-3 py-2 text-right">{r.confirmsReceived}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
