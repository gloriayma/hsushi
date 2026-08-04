"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getSessionUser } from "./session";
import * as lmsr from "./lmsr";

const LIQUIDITY_PRESETS = [50, 100, 200];
const MIN_TRADE_CENTS = 100; // 1 penny

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

// Run a read-modify-write transaction at Serializable isolation so two
// concurrent trades can't both act on the same market snapshot. On a
// serialization conflict (P2034) Postgres aborts one — just retry it.
async function serializableTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (e) {
      if (
        attempt < 3 &&
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034"
      )
        continue;
      throw e;
    }
  }
}

function revalidateMarket(marketId: string) {
  revalidatePath("/");
  revalidatePath(`/market/${marketId}`);
  revalidatePath("/portfolio");
  revalidatePath("/leaderboard");
}

export async function createMarket(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const question = String(formData.get("question") ?? "").trim();
  const criteria = String(formData.get("criteria") ?? "").trim();
  const b = Number(formData.get("b"));
  const closesAtRaw = String(formData.get("closesAt") ?? "").trim();

  if (question.length < 5 || question.length > 200) redirect("/create?error=question");
  if (criteria.length < 5 || criteria.length > 2000) redirect("/create?error=criteria");
  if (!LIQUIDITY_PRESETS.includes(b)) redirect("/create?error=b");
  const closesAt = closesAtRaw ? new Date(closesAtRaw) : null;
  if (closesAt && isNaN(closesAt.getTime())) redirect("/create?error=closesAt");

  const market = await prisma.market.create({
    data: { question, criteria, b, creatorId: user.id, closesAt },
  });

  revalidateMarket(market.id);
  redirect(`/market/${market.id}`);
}

export async function trade(
  marketId: string,
  side: lmsr.Side,
  kind: "BUY" | "SELL",
  amount: number // BUY: cents to spend; SELL: shares to sell
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("Not logged in.");
  if (side !== "YES" && side !== "NO") return fail("Bad side.");
  if (!Number.isFinite(amount) || amount <= 0) return fail("Bad amount.");

  try {
    await serializableTx(async (tx) => {
      const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } });
      if (market.status !== "OPEN") throw new Error("Market is closed.");
      if (market.closesAt && market.closesAt < new Date())
        throw new Error("Trading has closed on this market.");

      const me = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const pos = await tx.position.upsert({
        where: { userId_marketId: { userId: me.id, marketId } },
        create: { userId: me.id, marketId },
        update: {},
      });

      let deltaShares: number; // signed change to the side's q
      let costCents: number; // positive = user pays

      if (kind === "BUY") {
        const spendCents = Math.floor(amount);
        if (spendCents < MIN_TRADE_CENTS) throw new Error("Minimum trade is 1 LittleSky penny.");
        if (spendCents > me.balanceCents) throw new Error("Insufficient balance.");
        deltaShares = lmsr.sharesForSpend(
          market.qYes, market.qNo, market.b, side, spendCents / 100
        );
        costCents = spendCents;
      } else {
        const held = side === "YES" ? pos.sharesYes : pos.sharesNo;
        // Tolerate float dust so "sell all" always works.
        const shares = amount > held ? (amount - held < 1e-6 ? held : NaN) : amount;
        if (!Number.isFinite(shares) || shares <= 0)
          throw new Error("You don't hold that many shares.");
        const proceeds = lmsr.proceedsForSale(
          market.qYes, market.qNo, market.b, side, shares
        );
        deltaShares = -shares;
        costCents = -Math.floor(proceeds * 100); // rounding dust goes to the house
      }

      const next = lmsr.applyShares(market.qYes, market.qNo, side, deltaShares);
      const priceAfter = lmsr.price(next.qYes, next.qNo, market.b);

      await tx.market.update({
        where: { id: marketId },
        data: { qYes: next.qYes, qNo: next.qNo },
      });
      await tx.user.update({
        where: { id: me.id },
        data: { balanceCents: { decrement: costCents } },
      });
      await tx.position.update({
        where: { userId_marketId: { userId: me.id, marketId } },
        data: {
          [side === "YES" ? "sharesYes" : "sharesNo"]: { increment: deltaShares },
          netSpentCents: { increment: costCents },
        },
      });
      await tx.trade.create({
        data: {
          userId: me.id,
          marketId,
          side,
          kind,
          shares: Math.abs(deltaShares),
          costCents,
          priceAfter,
        },
      });
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Trade failed.");
  }

  revalidateMarket(marketId);
  return { ok: true };
}

export async function resolveMarket(
  marketId: string,
  outcome: "YES" | "NO" | "VOID"
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("Not logged in.");
  if (!["YES", "NO", "VOID"].includes(outcome)) return fail("Bad outcome.");

  try {
    await serializableTx(async (tx) => {
      const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } });
      if (market.status !== "OPEN") throw new Error("Already resolved.");
      if (market.creatorId !== user.id && !user.isAdmin)
        throw new Error("Only the market creator can resolve.");

      const positions = await tx.position.findMany({ where: { marketId } });
      for (const p of positions) {
        const payout =
          outcome === "YES"
            ? Math.floor(p.sharesYes * 100)
            : outcome === "NO"
              ? Math.floor(p.sharesNo * 100)
              : Math.max(0, p.netSpentCents); // VOID: refund net money put in
        if (payout > 0) {
          await tx.user.update({
            where: { id: p.userId },
            data: { balanceCents: { increment: payout } },
          });
        }
      }

      await tx.market.update({
        where: { id: marketId },
        data: { status: outcome, resolvedAt: new Date() },
      });
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Resolution failed.");
  }

  revalidateMarket(marketId);
  return { ok: true };
}

export async function logout(): Promise<void> {
  const { destroySession } = await import("./session");
  await destroySession();
  redirect("/login");
}
