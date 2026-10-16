"use client";

import { useEffect, useState } from "react";
import { T } from "./t";

/** Shown on the landing page while the site runs in demo mode. */
export function DemoBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ demo: boolean }>) : null))
      .then((s) => active && s?.demo && setDemo(true))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!demo) return null;
  return (
    <div className="mb-5">
      <p className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-card px-3 py-2 text-[13px] leading-snug shadow-sm">
        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">DEMO</span>
        <T
          ja="デモ版：入力が終わると、その場でAIの作成結果を表示します（音声再生・CSVダウンロードつき）"
          id="Versi demo: hasil AI langsung ditampilkan setelah selesai mengisi (bisa putar audio & unduh CSV)"
        />
      </p>
    </div>
  );
}
