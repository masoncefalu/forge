"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function ModerationActions({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(newStatus: "APPROVED" | "REJECTED") {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Failed (${res.status})`);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => setStatus("APPROVED")}
          disabled={pending || submitting || status === "APPROVED"}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          Approve
        </button>
        <button
          onClick={() => setStatus("REJECTED")}
          disabled={pending || submitting || status === "REJECTED"}
          className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
