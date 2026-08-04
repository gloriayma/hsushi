import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { price } from "@/lib/lmsr";
import { pennies, pct } from "@/lib/fmt";

export default async function PortfolioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const positions = await prisma.position.findMany({
    where: { userId: user.id, market: { status: "OPEN" } },
    include: { market: true },
  });

  const rows = positions
    .map((pos) => {
      const p = price(pos.market.qYes, pos.market.qNo, pos.market.b);
      const valueCents = Math.round(
        (pos.sharesYes * p + pos.sharesNo * (1 - p)) * 100
      );
      return { pos, p, valueCents, plCents: valueCents - pos.netSpentCents };
    })
    .filter((r) => r.pos.sharesYes > 0.001 || r.pos.sharesNo > 0.001)
    .sort((a, b) => b.valueCents - a.valueCents);

  const positionsValue = rows.reduce((s, r) => s + r.valueCents, 0);
  const netWorth = user.balanceCents + positionsValue;

  return (
    <div className="space-y-8">
      <h1>portfolio</h1>

      <dl className="grid grid-cols-3 gap-6 text-sm">
        {[
          ["cash", user.balanceCents],
          ["positions", positionsValue],
          ["net worth", netWorth],
        ].map(([label, cents]) => (
          <div key={label as string}>
            <dt className="text-[color:var(--muted)]">{label}</dt>
            <dd className="text-lg tabular-nums">{pennies(cents as number)}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="text-[color:var(--muted)]">
          no open positions.{" "}
          <Link href="/">find a market →</Link>
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
          {rows.map(({ pos, p, valueCents, plCents }) => (
            <li key={pos.marketId}>
              <Link
                href={`/market/${pos.marketId}`}
                className="block py-3 no-underline"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate">
                    {pos.market.question}
                  </span>
                  <span className="tabular-nums text-[color:var(--muted)]">
                    {pct(p)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-3 text-sm text-[color:var(--muted)]">
                  {pos.sharesYes > 0.001 && (
                    <span>{pos.sharesYes.toFixed(1)} yes</span>
                  )}
                  {pos.sharesNo > 0.001 && (
                    <span className="text-[color:var(--accent)]">
                      {pos.sharesNo.toFixed(1)} no
                    </span>
                  )}
                  <span className="ml-auto tabular-nums">
                    {pennies(valueCents)}
                  </span>
                  <span
                    className={`tabular-nums ${
                      plCents >= 0 ? "" : "text-[color:var(--accent)]"
                    }`}
                  >
                    {plCents >= 0 ? "+" : ""}
                    {pennies(plCents)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
