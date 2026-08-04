type ChartTrade = { createdAt: Date; priceAfter: number };

export default function PriceChart({
  createdAt,
  trades,
  currentPrice,
  resolvedAt,
  resolvedTo,
}: {
  createdAt: Date;
  trades: ChartTrade[];
  currentPrice: number;
  resolvedAt: Date | null;
  resolvedTo: "YES" | "NO" | "VOID" | null;
}) {
  const startMs = createdAt.getTime();
  const endDate = resolvedAt ?? new Date();
  const endMs = Math.max(endDate.getTime(), startMs + 1);
  const span = endMs - startMs;

  const finalPrice =
    resolvedTo === "YES" ? 1 : resolvedTo === "NO" ? 0 : currentPrice;

  const points: [number, number][] = [[0, 0.5]];
  for (const t of trades) {
    const x = (t.createdAt.getTime() - startMs) / span;
    points.push([Math.min(1, Math.max(0, x)), t.priceAfter]);
  }
  points.push([1, finalPrice]);

  const W = 100;
  const H = 40;
  const toX = (x: number) => x * W;
  const toY = (p: number) => (1 - p) * H;

  const path = points
    .map(([x, p], i) => `${i === 0 ? "M" : "L"}${toX(x).toFixed(3)},${toY(p).toFixed(3)}`)
    .join(" ");

  const lastX = toX(points[points.length - 1][0]);
  const lastY = toY(points[points.length - 1][1]);
  const areaPath = `${path} L${lastX.toFixed(3)},${H} L0,${H} Z`;

  const now = new Date();
  const fmtDate = (d: Date) => {
    const sameYear = d.getFullYear() === now.getFullYear();
    return d
      .toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        ...(sameYear ? {} : { year: "2-digit" }),
      })
      .toLowerCase();
  };

  const isResolved = resolvedTo != null;
  const lineColor = "var(--ink)";

  return (
    <section>
      <h2 className="mb-3">price history</h2>
      <div className="flex gap-3">
        <div className="flex h-[160px] w-6 flex-col justify-between py-[2px] text-right text-[10px] tabular-nums text-[color:var(--muted)]">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-[160px] w-full"
          >
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.14" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0.25, 0.75].map((g) => (
              <line
                key={g}
                x1="0"
                y1={toY(g)}
                x2={W}
                y2={toY(g)}
                stroke="var(--line)"
                strokeDasharray="0.6 1.2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1="0"
              y1={toY(0.5)}
              x2={W}
              y2={toY(0.5)}
              stroke="var(--line-strong)"
              strokeOpacity="0.55"
              vectorEffect="non-scaling-stroke"
            />

            <path d={areaPath} fill="url(#priceFill)" />

            <path
              d={path}
              fill="none"
              stroke={lineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            <circle
              cx={lastX}
              cy={lastY}
              r="3"
              fill={lineColor}
              fillOpacity="0.18"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={lastX}
              cy={lastY}
              r="1.4"
              fill="var(--bg)"
              stroke={lineColor}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[color:var(--muted)]">
            <span>{fmtDate(createdAt)}</span>
            <span>{isResolved ? fmtDate(endDate) : "now"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
