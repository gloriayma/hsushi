"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trade } from "@/lib/actions";
import * as lmsr from "@/lib/lmsr";
import { pct } from "@/lib/fmt";

const QUICK_BUYS = [10, 25, 50, 100];

export default function TradePanel(props: {
  marketId: string;
  qYes: number;
  qNo: number;
  b: number;
  balanceCents: number;
  sharesYes: number;
  sharesNo: number;
}) {
  const { marketId, qYes, qNo, b, sharesYes, sharesNo } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"BUY" | "SELL">("BUY");
  const [side, setSide] = useState<lmsr.Side>("YES");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amt = parseFloat(amount);
  const held = side === "YES" ? sharesYes : sharesNo;

  let preview: string | null = null;
  if (Number.isFinite(amt) && amt > 0) {
    if (kind === "BUY") {
      const shares = lmsr.sharesForSpend(qYes, qNo, b, side, amt);
      const next = lmsr.applyShares(qYes, qNo, side, shares);
      preview = `${shares.toFixed(1)} shares → ${pct(lmsr.price(next.qYes, next.qNo, b))}`;
    } else if (amt <= held + 1e-6) {
      const proceeds = lmsr.proceedsForSale(qYes, qNo, b, side, Math.min(amt, held));
      const next = lmsr.applyShares(qYes, qNo, side, -Math.min(amt, held));
      preview = `${proceeds.toFixed(2)} pennies → ${pct(lmsr.price(next.qYes, next.qNo, b))}`;
    }
  }

  function submit() {
    if (!Number.isFinite(amt) || amt <= 0) return;
    setError(null);
    startTransition(async () => {
      const res = await trade(
        marketId,
        side,
        kind,
        kind === "BUY" ? Math.round(amt * 100) : amt
      );
      if (!res.ok) setError(res.error);
      else {
        setAmount("");
        router.refresh();
      }
    });
  }

  const tabCls = (active: boolean) =>
    `flex-1 border-0 border-b p-0 pb-1 !rounded-none ${
      active
        ? "border-[color:var(--ink)] text-[color:var(--ink)]"
        : "border-transparent text-[color:var(--muted)]"
    }`;

  const sideCls = (active: boolean, isNo: boolean) =>
    `flex-1 ${
      active
        ? isNo
          ? "border-[color:var(--accent)] text-[color:var(--accent)]"
          : "border-[color:var(--line-strong)]"
        : "text-[color:var(--muted)]"
    }`;

  return (
    <div className="space-y-3 border-y border-[color:var(--line)] py-5">
      <div className="flex gap-6 text-sm">
        <button className={tabCls(kind === "BUY")} onClick={() => setKind("BUY")}>
          buy
        </button>
        <button
          className={tabCls(kind === "SELL")}
          onClick={() => setKind("SELL")}
          disabled={sharesYes < 0.001 && sharesNo < 0.001}
        >
          sell
        </button>
      </div>

      <div className="flex gap-2">
        {(["YES", "NO"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={sideCls(side === s, s === "NO")}
          >
            {s.toLowerCase()}
            {kind === "SELL" && (
              <span className="ml-1 text-xs">
                ({(s === "YES" ? sharesYes : sharesNo).toFixed(1)})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={kind === "BUY" ? "pennies" : "shares"}
          className="tabular-nums"
        />
        {kind === "BUY" ? (
          QUICK_BUYS.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="text-sm text-[color:var(--muted)]"
            >
              {q}
            </button>
          ))
        ) : (
          <button
            onClick={() => setAmount(String(held))}
            className="text-sm text-[color:var(--muted)]"
          >
            max
          </button>
        )}
      </div>

      {preview && (
        <p className="text-sm text-[color:var(--muted)]">{preview}</p>
      )}
      {error && <p className="text-sm text-[color:var(--accent)]">{error}</p>}

      <button
        onClick={submit}
        disabled={pending || !Number.isFinite(amt) || amt <= 0}
        className="w-full"
      >
        {pending ? "…" : `${kind === "BUY" ? "buy" : "sell"} ${side.toLowerCase()}`}
      </button>
    </div>
  );
}
