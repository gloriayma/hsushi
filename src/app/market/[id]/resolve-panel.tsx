"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveMarket } from "@/lib/actions";

const LABELS = {
  YES: "Resolves YES — YES shares pay 1 LittleSky penny each.",
  NO: "Resolves NO — NO shares pay 1 LittleSky penny each.",
  VOID: "Void — everyone's net spend is refunded.",
} as const;

export default function ResolvePanel({ marketId }: { marketId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve(outcome: "YES" | "NO" | "VOID") {
    if (!window.confirm(`${LABELS[outcome]}\n\nThis cannot be undone. Sure?`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await resolveMarket(marketId, outcome);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-y border-[color:var(--line)] py-4">
      <p className="text-sm text-[color:var(--muted)]">resolve</p>
      <div className="flex gap-2">
        <button
          onClick={() => resolve("YES")}
          disabled={pending}
          className="flex-1"
        >
          yes
        </button>
        <button
          onClick={() => resolve("NO")}
          disabled={pending}
          className="flex-1 text-[color:var(--accent)]"
        >
          no
        </button>
        <button
          onClick={() => resolve("VOID")}
          disabled={pending}
          className="text-[color:var(--muted)]"
        >
          void
        </button>
      </div>
      {error && <p className="text-sm text-[color:var(--accent)]">{error}</p>}
    </div>
  );
}
