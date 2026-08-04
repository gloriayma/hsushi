import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { price } from "@/lib/lmsr";
import { pct } from "@/lib/fmt";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const markets = await prisma.market.findMany({
    orderBy: { createdAt: "desc" },
    include: { creator: true, _count: { select: { trades: true } } },
  });
  const open = markets.filter((m) => m.status === "OPEN");
  const closed = markets.filter((m) => m.status !== "OPEN");

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="mb-0">markets</h1>
          <Link href="/create" className="text-[color:var(--muted)]">
            + new
          </Link>
        </div>
        {open.length === 0 && (
          <p className="text-[color:var(--muted)]">nothing yet.</p>
        )}
        <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
          {open.map((m) => {
            const p = price(m.qYes, m.qNo, m.b);
            return (
              <li key={m.id}>
                <Link
                  href={`/market/${m.id}`}
                  className="flex items-baseline justify-between gap-4 py-3 no-underline"
                >
                  <span className="min-w-0 flex-1">{m.question}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">
                    {pct(p)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {closed.length > 0 && (
        <section>
          <h2 className="mb-3">resolved</h2>
          <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
            {closed.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/market/${m.id}`}
                  className="flex items-baseline justify-between gap-4 py-3 text-[color:var(--muted)] no-underline"
                >
                  <span className="min-w-0 flex-1">{m.question}</span>
                  <span
                    className={`tabular-nums ${
                      m.status === "YES"
                        ? "text-[color:var(--ink)]"
                        : m.status === "NO"
                          ? "text-[color:var(--accent)]"
                          : ""
                    }`}
                  >
                    {m.status.toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
