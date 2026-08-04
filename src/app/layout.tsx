import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/lib/session";
import { logout } from "@/lib/actions";
import { pennies } from "@/lib/fmt";

export const metadata: Metadata = {
  title: "hsushi",
  description: "play-money prediction markets",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-[720px] px-8 pt-[8vh] pb-16">
          <header className="mb-10 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[0.95rem]">
            <Link href="/" className="font-bold no-underline">
              hsushi
            </Link>
            <nav className="flex gap-4 text-[color:var(--muted)]">
              <Link href="/">markets</Link>
              <Link href="/create">create</Link>
              <Link href="/portfolio">portfolio</Link>
              <Link href="/leaderboard">leaders</Link>
            </nav>
            <div className="ml-auto flex items-baseline gap-3 text-[color:var(--muted)]">
              {user ? (
                <>
                  <span className="tabular-nums text-[color:var(--ink)]">
                    {pennies(user.balanceCents)} ✦
                  </span>
                  <form action={logout} className="inline">
                    <button className="border-0 p-0 text-[0.85rem] underline">
                      sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login">sign in</Link>
              )}
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
