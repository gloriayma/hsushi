# 🍣 hsushi

Play-money prediction markets. Kalshi's look, Manifold's engine: binary
Yes/No markets priced by an LMSR automated market maker, so there's always
a live price even with a small number of casual traders.

- Everyone signs in with **email** (no password) and gets **1,000
  LittleSky pennies** — no refills.
- **Anyone creates markets** (with written resolution criteria) and the
  **creator resolves** them: YES, NO, or VOID (refunds net spend).
- Creator picks market depth: 🌊 b=50 (swingy) / ⚖️ b=100 / 🏔️ b=200 (sticky).
  Max house subsidy per market = `b·ln2` (~69 LittleSky pennies at b=100).
- Money is integer cents in Postgres; every trade runs in a Serializable
  transaction — balances can't go negative or corrupt, even under
  concurrent trades.

## Run it locally

Needs a Postgres URL — grab a free one at [neon.tech](https://neon.tech)
(or `docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres`).

```bash
npm install
cp .env.example .env       # paste your DATABASE_URL
npx prisma db push         # creates the tables
npm run dev                # http://localhost:3000
```

Sign in on the login page by typing any email address — the first sign-in
creates the user, later sign-ins reuse it.

## Auth (~1 minute)

There's no OAuth to configure. Two optional env vars tighten sign-in:

- `ALLOWED_EMAIL_DOMAIN=example.com` — restricts sign-in to a single
  domain (rejects `@gmail.com`, etc). Leave blank to allow any email.
- `ADMIN_EMAILS=alice@example.com,bob@example.com` — these users can
  resolve **any** market (safety valve for disputes or absent creators).

> **Note:** email is trust-on-first-entry — we don't send a verification
> link. Fine for a small trusted group; don't expose this to the open web
> with real stakes.

## Deploy (Vercel + Neon, free)

1. **Neon** — [neon.tech](https://neon.tech) → create project → copy the
   connection string. Run `npx prisma db push` once locally against it to
   create the tables.
2. **Vercel** — [vercel.com/new](https://vercel.com/new) → import the
   `gloriayma/hsushi` GitHub repo (framework auto-detects Next.js).
3. **Env vars** (Vercel → Project → Settings → Environment Variables):
   `DATABASE_URL` (Neon string), `SESSION_SECRET` (`openssl rand -hex 32`),
   `APP_URL` (your `https://….vercel.app` URL — add it after the first
   deploy, then redeploy), plus the optional `ALLOWED_EMAIL_DOMAIN` and
   `ADMIN_EMAILS`.

Pushes to `main` auto-deploy. Neon keeps ~7 days of point-in-time restore
on the free tier — that's your ledger backup.

## How the market maker works

State per market: `qYes`, `qNo` (shares sold) and depth `b`.

```
price(YES) = sigmoid((qYes − qNo) / b)          — always in (0,1)
C(q)       = b · ln(e^(qYes/b) + e^(qNo/b))     — cost function
trade cost = C(after) − C(before)
```

Shares pay 1 LittleSky penny if their side wins. Buying pushes the price
toward your side; `b` controls how far each penny moves it. See
`src/lib/lmsr.ts` — the whole engine is ~60 lines.

## House rules

- Write resolution criteria you'd be comfortable being held to — the app
  shows them verbatim, and you resolve your own market in public.
- Every resolution is visible on the market page with the resolver's name.
- Going broke is real (no refills). Blowing 391 LittleSky pennies to push
  a b=100 market to 99% is a choice you get to explain in public.
