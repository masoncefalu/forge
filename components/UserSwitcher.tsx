"use client";

// Mock-auth user switcher: sets the pf_user_id cookie via /api/user.

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function UserSwitcher({
  users,
  currentId,
}: {
  users: { id: string; handle: string; role: string }[];
  currentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function switchUser(id: string) {
    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <label className="flex items-center gap-2 text-xs text-stone-500">
      Acting as
      <select
        className="rounded border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
        value={currentId}
        disabled={pending}
        onChange={(e) => switchUser(e.target.value)}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            @{u.handle} ({u.role.toLowerCase()})
          </option>
        ))}
      </select>
    </label>
  );
}
