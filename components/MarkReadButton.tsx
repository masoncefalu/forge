"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function MarkReadButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function markRead() {
    await fetch(`/api/alerts/${alertId}/read`, { method: "POST" });
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={markRead}
      disabled={pending}
      className="shrink-0 rounded border border-stone-300 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50"
    >
      Mark read
    </button>
  );
}
