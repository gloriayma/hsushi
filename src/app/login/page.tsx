const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  domain: "Sign-in is restricted to a single email domain.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim() || null;

  return (
    <div className="max-w-sm space-y-6">
      <h1>hsushi</h1>

      <p className="text-sm text-[color:var(--muted)]">
        play-money prediction markets.
      </p>

      {error && (
        <p className="text-sm text-[color:var(--accent)]">
          {ERRORS[error] ?? "Login failed."}
        </p>
      )}

      <form action="/api/auth/login" method="POST" className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm text-[color:var(--muted)]">email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={
              allowedDomain ? `you@${allowedDomain}` : "you@example.com"
            }
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-[color:var(--muted)]">
            display name (optional)
          </span>
          <input name="name" maxLength={32} placeholder="how you show up" />
        </label>
        <button className="w-full">sign in →</button>
      </form>

      {allowedDomain && (
        <p className="text-xs text-[color:var(--muted)]">
          only <span className="tabular-nums">@{allowedDomain}</span> addresses
          can sign in.
        </p>
      )}
    </div>
  );
}
