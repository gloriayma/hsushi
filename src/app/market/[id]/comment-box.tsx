"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postComment } from "@/lib/actions";

export default function CommentBox({ marketId }: { marketId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await postComment(marketId, body);
      if (!res.ok) setError(res.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="say something"
        maxLength={1000}
      />
      {error && <p className="text-sm text-[color:var(--accent)]">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={pending || !body.trim()}
          className="text-sm"
        >
          {pending ? "…" : "post"}
        </button>
      </div>
    </div>
  );
}
