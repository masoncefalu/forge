"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function ModerationActions({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function setStatus(newStatus: "APPROVED" | "REJECTED") {
    await fetch(`/api/reports/${reportId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={() => setStatus("APPROVED")}
        disabled={pending || status === "APPROVED"}
        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
      >
        Approve
      </button>
      <button
        onClick={() => setStatus("REJECTED")}
        disabled={pending || status === "REJECTED"}
        className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
      >
        Reject
      </button>
    </div>
  );
}
