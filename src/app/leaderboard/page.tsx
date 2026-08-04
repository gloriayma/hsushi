import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { price } from "@/lib/lmsr";
import { pennies } from "@/lib/fmt";

export default async function LeaderboardPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const users = await prisma.user.findMany({
    include: {
      positions: { where: { market: { status: "OPEN" } }, include: { market: true } },
    },
  });

  const ranked = users
    .map((u) => {
      const positionsCents = u.positions.reduce((s, pos) => {
        const p = price(pos.market.qYes, pos.market.qNo, pos.market.b);
        return s + Math.round((pos.sharesYes * p + pos.sharesNo * (1 - p)) * 100);
      }, 0);
      return { u, netWorthCents: u.balanceCents + positionsCents };
    })
    .sort((a, b) => b.netWorthCents - a.netWorthCents);

  return (
    <div className="space-y-4">
      <h1>leaderboard</h1>
      <ol className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
        {ranked.map(({ u, netWorthCents }, i) => {
          const delta = netWorthCents - 100000;
          const isMe = u.id === me.id;
          return (
            <li
              key={u.id}
              className="flex items-baseline gap-3 py-2.5"
            >
              <span className="w-6 text-right tabular-nums text-[color:var(--muted)]">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {u.name}
                {isMe && (
                  <span className="ml-1 text-[color:var(--muted)]">(you)</span>
                )}
              </span>
              <span className="tabular-nums">{pennies(netWorthCents)}</span>
              <span
                className={`w-16 text-right text-sm tabular-nums ${
                  delta >= 0 ? "text-[color:var(--muted)]" : "text-[color:var(--accent)]"
                }`}
              >
                {delta >= 0 ? "+" : ""}
                {pennies(delta)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
