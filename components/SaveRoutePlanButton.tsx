"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function SaveRoutePlanButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    const res = await fetch("/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "My route" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Save failed");
      return;
    }
    setMessage("Plan saved.");
    setName("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Plan name (e.g. Saturday run)"
        className="rounded border border-stone-300 px-3 py-1.5 text-sm"
      />
      <button
        onClick={save}
        disabled={pending}
        className="rounded bg-forge-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-forge-500 disabled:opacity-50"
      >
        Save this route
      </button>
      {message && <span className="text-sm text-stone-600">{message}</span>}
    </div>
  );
}
