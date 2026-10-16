"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        const next = params.get("next");
        router.replace(next && next.startsWith("/admin") ? next : "/admin");
        router.refresh();
        return;
      }
      setError(data.error ?? "ログインできませんでした");
    } catch {
      setError("通信エラーが発生しました");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[14px] font-semibold">パスワード</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-xl border border-line-strong bg-card px-3.5 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          required
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[14px] text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !password}
        className="min-h-[48px] w-full rounded-xl bg-ink font-semibold text-white disabled:opacity-50"
      >
        {busy ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
