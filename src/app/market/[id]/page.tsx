import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { price } from "@/lib/lmsr";
import { pennies, pct } from "@/lib/fmt";
import TradePanel from "./trade-panel";
import ResolvePanel from "./resolve-panel";
import PriceChart from "./price-chart";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const market = await prisma.market.findUnique({
    where: { id },
    include: { creator: true },
  });
  if (!market) notFound();

  const [position, trades, historyTrades] = await Promise.all([
    prisma.position.findUnique({
      where: { userId_marketId: { userId: user.id, marketId: id } },
    }),
    prisma.trade.findMany({
      where: { marketId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: true },
    }),
    prisma.trade.findMany({
      where: { marketId: id },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, priceAfter: true },
    }),
  ]);

  const p = price(market.qYes, market.qNo, market.b);
  const tradingOpen =
    market.status === "OPEN" &&
    (!market.closesAt || market.closesAt > new Date());
  const canResolve =
    market.status === "OPEN" && (market.creatorId === user.id || user.isAdmin);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-6">
          <h1 className="mb-0 flex-1">{market.question}</h1>
          <span
            className={`text-3xl font-bold tabular-nums ${
              market.status === "NO" ? "text-[color:var(--accent)]" : ""
            }`}
          >
            {market.status === "OPEN" || market.status === "VOID"
              ? pct(p)
              : market.status.toLowerCase()}
          </span>
        </div>

        <p className="text-sm text-[color:var(--muted)]">
          by {market.creator.name}
          {market.closesAt &&
            ` · ${market.closesAt > new Date() ? "closes" : "closed"} ${market.closesAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
        </p>

        <p className="pt-2">{market.criteria}</p>

        {position && (position.sharesYes > 0.001 || position.sharesNo > 0.001) && (
          <p className="text-sm text-[color:var(--muted)]">
            you hold{" "}
            {position.sharesYes > 0.001 && (
              <span>{position.sharesYes.toFixed(1)} yes</span>
            )}
            {position.sharesYes > 0.001 && position.sharesNo > 0.001 && ", "}
            {position.sharesNo > 0.001 && (
              <span className="text-[color:var(--accent)]">
                {position.sharesNo.toFixed(1)} no
              </span>
            )}
          </p>
        )}
      </section>

      <PriceChart
        createdAt={market.createdAt}
        trades={historyTrades}
        currentPrice={p}
        resolvedAt={market.resolvedAt}
        resolvedTo={
          market.status === "YES" || market.status === "NO" || market.status === "VOID"
            ? (market.status as "YES" | "NO" | "VOID")
            : null
        }
      />

      {tradingOpen && (
        <TradePanel
          marketId={market.id}
          qYes={market.qYes}
          qNo={market.qNo}
          b={market.b}
          balanceCents={user.balanceCents}
          sharesYes={position?.sharesYes ?? 0}
          sharesNo={position?.sharesNo ?? 0}
        />
      )}

      {canResolve && <ResolvePanel marketId={market.id} />}

      {trades.length > 0 && (
        <section>
          <h2 className="mb-3">recent trades</h2>
          <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)] text-sm">
            {trades.map((t) => (
              <li key={t.id} className="flex items-baseline gap-2 py-2">
                <span>{t.user.name}</span>
                <span className="text-[color:var(--muted)]">
                  {t.kind === "BUY" ? "bought" : "sold"}{" "}
                  {t.shares.toFixed(1)}{" "}
                  <span
                    className={
                      t.side === "NO" ? "text-[color:var(--accent)]" : ""
                    }
                  >
                    {t.side.toLowerCase()}
                  </span>{" "}
                  · {pennies(Math.abs(t.costCents))}
                </span>
                <span className="ml-auto tabular-nums text-[color:var(--muted)]">
                  → {pct(t.priceAfter)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
