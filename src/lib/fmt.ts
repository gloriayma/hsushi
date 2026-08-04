/** Integer cents -> "1,234.5" pennies. */
export const pennies = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Probability -> "63%". */
export const pct = (p: number) => `${Math.round(p * 100)}%`;

export const DEPTH_LABELS: Record<number, string> = {
  50: "🌊 Casual",
  100: "⚖️ Standard",
  200: "🏔️ Deep",
};
