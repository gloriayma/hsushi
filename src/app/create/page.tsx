import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { createMarket } from "@/lib/actions";

const ERRORS: Record<string, string> = {
  question: "Question must be 5–200 characters.",
  criteria: "Resolution criteria must be 5–2000 characters.",
  b: "Pick a market depth.",
  closesAt: "Invalid close time.",
};

const DEPTHS = [
  { b: 50, name: "casual" },
  { b: 100, name: "standard" },
  { b: 200, name: "deep" },
];

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="max-w-xl space-y-6">
      <h1>new market</h1>

      {error && (
        <p className="text-sm text-[color:var(--accent)]">
          {ERRORS[error] ?? "Something went wrong."}
        </p>
      )}

      <form action={createMarket} className="space-y-5">
        <label className="block space-y-1.5">
          <span className="text-sm text-[color:var(--muted)]">question</span>
          <input
            name="question"
            required
            minLength={5}
            maxLength={200}
            placeholder="will the paper be on arxiv by friday?"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-[color:var(--muted)]">criteria</span>
          <textarea
            name="criteria"
            required
            minLength={5}
            maxLength={2000}
            rows={3}
            placeholder="resolves yes if the preprint is publicly listed on arxiv.org by 11:59pm PT this friday."
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm text-[color:var(--muted)]">depth</legend>
          <div className="flex gap-2">
            {DEPTHS.map((d) => (
              <label
                key={d.b}
                className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--line)] px-3 py-2 has-[:checked]:border-[color:var(--line-strong)]"
              >
                <input
                  type="radio"
                  name="b"
                  value={d.b}
                  defaultChecked={d.b === 100}
                  className="!w-auto"
                />
                <span>{d.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm text-[color:var(--muted)]">
            closes (optional)
          </span>
          <input type="datetime-local" name="closesAt" />
        </label>

        <button className="w-full">create</button>
      </form>
    </div>
  );
}
