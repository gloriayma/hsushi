// LMSR (Logarithmic Market Scoring Rule) for binary markets.
//
// State: qYes, qNo = shares sold so far on each side; b = liquidity parameter.
// Cost function: C(qYes, qNo) = b * ln(e^(qYes/b) + e^(qNo/b))
// A trade costs C(after) - C(before). Each share pays 1 penny if its side wins.
// YES price (= implied probability) = sigmoid((qYes - qNo) / b).
// Max market-maker loss per market = b * ln(2).
//
// All math here is in float pennies; callers convert to integer cents.

export type Side = "YES" | "NO";

/** YES probability in (0, 1). */
export function price(qYes: number, qNo: number, b: number): number {
  return 1 / (1 + Math.exp((qNo - qYes) / b));
}

/** C(qYes, qNo), computed via log-sum-exp so large q/b never overflows. */
export function cost(qYes: number, qNo: number, b: number): number {
  const m = Math.max(qYes, qNo);
  return m + b * Math.log(Math.exp((qYes - m) / b) + Math.exp((qNo - m) / b));
}

/**
 * Shares received when spending `spend` pennies buying `side`.
 * Solves C(q + delta) - C(q) = spend for delta, in shifted log space:
 * with a = qSide/b, c = qOther/b, L = logsumexp(a, c), x = L + spend/b - c,
 * the new side quantity is a' = c + ln(e^x - 1), stable for all x > 0.
 */
export function sharesForSpend(
  qYes: number,
  qNo: number,
  b: number,
  side: Side,
  spend: number
): number {
  if (spend <= 0) return 0;
  const a = (side === "YES" ? qYes : qNo) / b;
  const c = (side === "YES" ? qNo : qYes) / b;
  const m = Math.max(a, c);
  const L = m + Math.log(Math.exp(a - m) + Math.exp(c - m));
  const x = L + spend / b - c; // > 0 always
  // ln(e^x - 1) = x + ln(1 - e^-x); log1p keeps small-x accurate, large-x safe.
  const aNew = c + x + Math.log1p(-Math.exp(-x));
  return b * (aNew - a);
}

/** Pennies received for selling `shares` of `side`. */
export function proceedsForSale(
  qYes: number,
  qNo: number,
  b: number,
  side: Side,
  shares: number
): number {
  if (shares <= 0) return 0;
  const [nYes, nNo] =
    side === "YES" ? [qYes - shares, qNo] : [qYes, qNo - shares];
  return cost(qYes, qNo, b) - cost(nYes, nNo, b);
}

/** Market state after buying `shares` of `side` (positive) or selling (negative). */
export function applyShares(
  qYes: number,
  qNo: number,
  side: Side,
  shares: number
): { qYes: number; qNo: number } {
  return side === "YES"
    ? { qYes: qYes + shares, qNo }
    : { qYes, qNo: qNo + shares };
}
