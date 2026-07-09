"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function VoteButtons({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function vote(v: "CONFIRMED" | "DEAD") {
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote: v }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(data?.error ?? "Vote failed");
        return;
      }
      setMessage(
        data.suppressed
          ? "Recorded. This lead is now suppressed as dead."
          : `Recorded — ${data.confirms} confirmed, ${data.deads} dead.`
      );
      startTransition(() => router.refresh());
    } catch {
      setMessage("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => vote("CONFIRMED")}
          disabled={pending || submitting}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          ✓ Still there
        </button>
        <button
          onClick={() => vote("DEAD")}
          disabled={pending || submitting}
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          ✗ Dead / gone
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
