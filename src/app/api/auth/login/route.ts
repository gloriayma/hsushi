import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

const STARTING_BALANCE_CENTS = Number(
  process.env.STARTING_BALANCE_CENTS ?? 100000
);

// RFC-5322-ish email check — good enough to reject obvious garbage.
// We're not verifying deliverability; login is trust-on-first-entry.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(url: URL, error: string) {
  const dest = new URL("/login", url);
  dest.searchParams.set("error", error);
  return NextResponse.redirect(dest);
}

// Default display name from an email: "alice.smith@arc.org" -> "alice smith".
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").trim().slice(0, 32) || local.slice(0, 32);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  const nameRaw = String(form.get("name") ?? "").trim().slice(0, 32);

  if (!EMAIL_RE.test(emailRaw)) return back(req.nextUrl, "email");

  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim();
  if (allowedDomain && !emailRaw.endsWith(`@${allowedDomain}`)) {
    return back(req.nextUrl, "domain");
  }

  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = admins.includes(emailRaw);

  const name = nameRaw || nameFromEmail(emailRaw);

  const user = await prisma.user.upsert({
    where: { email: emailRaw },
    create: {
      email: emailRaw,
      name,
      balanceCents: STARTING_BALANCE_CENTS,
      isAdmin,
    },
    // Don't overwrite the user's chosen display name on re-login.
    update: { isAdmin },
  });

  await createSession(user.id);
  return NextResponse.redirect(new URL("/", req.nextUrl));
}
