"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, CopyButton, Spinner } from "../../ui";

export type DetailItem = { key: string; label: string; ja: string; needsSync: boolean; hasAudio: boolean };

type Links = { sheet: string; pdfResume: string; pdfPractice: string; learner: string };
type Busy = null | "generate" | "sync" | "audio" | "all";
type Notice = { kind: "ok" | "error"; text: string } | null;

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) throw new Error(data.error ?? `エラーが発生しました（${res.status}）`);
  return data;
}

function phoneDigits(raw: string): string {
  let d = raw.replace(/[^\d]/g, "");
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  return d;
}

export function DetailPanel({
  id,
  name,
  status,
  hasSheet,
  contactMethod,
  contactValue,
  links,
  items,
  blobEnabled,
}: {
  id: string;
  name: string;
  status: string;
  hasSheet: boolean;
  contactMethod: string;
  contactValue: string;
  links: Links | null;
  items: DetailItem[];
  blobEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const base = `/api/admin/submissions/${encodeURIComponent(id)}`;

  const needSync = items.filter((i) => i.needsSync);
  const needAudio = items.filter((i) => i.ja && !i.hasAudio);

  const run = async (kind: Busy, fn: () => Promise<string>) => {
    setBusy(kind);
    setNotice(null);
    try {
      const text = await fn();
      setNotice({ kind: "ok", text });
      router.refresh();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    }
    setBusy(null);
    setProgress(null);
  };

  const doSync = async (all: boolean) => {
    const res = await post<{ updated: string[]; failed: string[] }>(`${base}/sync`, { all });
    const failed = res.failed.length ? `（${res.failed.length}件は失敗しました。もう一度お試しください）` : "";
    return res.updated.length ? `${res.updated.length}件の「ひらがな・インドネシア語」を更新しました。${failed}` : `更新が必要な項目はありませんでした。${failed}`;
  };

  const doAudio = async (targets: DetailItem[]) => {
    if (!blobEnabled) throw new Error("Vercel Blob が未設定のため、音声を保存できません（学習ページでは再生時に自動生成されます）。");
    if (targets.length === 0) return "作成が必要な音声はありませんでした。";
    let done = 0;
    let failed = 0;
    setProgress({ done, total: targets.length });
    const queue = [...targets];
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          await post(`${base}/audio`, { key: item.key, text: item.ja });
        } catch {
          failed++;
        }
        done++;
        setProgress({ done, total: targets.length });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (failed) throw new Error(`${targets.length - failed}件の音声を作成しました。${failed}件は失敗しました。もう一度「音声を作成」を押してください。`);
    return `${targets.length}件の模範音声を作成しました。`;
  };

  const regenerate = () => {
    const msg = hasSheet
      ? "AIで文章を作り直し、新しい履歴書シートを作成します。\n今のシートは残りますが、手で修正した内容は新しいシートには入りません。\nよろしいですか？"
      : "AIで文章を生成し、履歴書シートを作成します（30秒〜1分ほどかかります）。";
    if (!window.confirm(msg)) return;
    void run("generate", async () => {
      await post(`${base}/generate`, {});
      return "履歴書シートを作成しました。";
    });
  };

  const message = links
    ? `${name} さん\n\n履歴書と面接練習の模範音声ができました。\n下のリンクを開いて、音声を聞きながら練習してください。\n\nCV dan audio contoh untuk latihan wawancara Anda sudah siap.\nSilakan buka link di bawah ini, dengarkan, dan berlatihlah.\n\n${links.learner}`
    : "";
  const shareHref =
    contactMethod === "whatsapp"
      ? `https://wa.me/${phoneDigits(contactValue)}?text=${encodeURIComponent(message)}`
      : contactMethod === "line"
        ? `https://line.me/R/share?text=${encodeURIComponent(message)}`
        : `mailto:${encodeURIComponent(contactValue)}?subject=${encodeURIComponent("履歴書と模範音声 / CV & audio contoh")}&body=${encodeURIComponent(message)}`;
  const shareLabel = contactMethod === "whatsapp" ? "WhatsAppで送る" : contactMethod === "line" ? "LINEで送る" : "メールで送る";

  return (
    <div className="space-y-5">
      {notice && (
        <p
          role="status"
          className={`whitespace-pre-wrap rounded-xl px-4 py-3 text-[14px] font-medium ${
            notice.kind === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
          }`}
        >
          {notice.text}
        </p>
      )}

      {!hasSheet && (
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="font-bold">履歴書シート</h2>
          <p className="mt-1 text-[14px] text-muted">
            {status === "生成中" ? "現在AIが生成中です。1分ほどしてから画面を更新してください。" : "まだ履歴書シートがありません。"}
          </p>
          <div className="mt-4">
            <Button onClick={regenerate} disabled={busy !== null || status === "生成中"}>
              {busy === "generate" && <Spinner />}
              {busy === "generate" ? "生成中…（最大1分）" : "AIで生成する"}
            </Button>
          </div>
        </section>
      )}

      {links && (
        <>
          <section className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-bold">① スプレッドシートで確認・修正</h2>
            <p className="mt-1 text-[14px] text-muted">
              履歴書と回答例の「日本語」を直接修正してください。修正したら ② で反映します。PDFは Google にログインした状態で開くとダウンロードできます。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={links.sheet} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg bg-ink px-4 text-[14px] font-semibold text-white hover:bg-ink/90">
                シートを開く ↗
              </a>
              <a href={links.pdfResume} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg border border-line-strong bg-card px-4 text-[14px] font-semibold hover:bg-line/40">
                履歴書PDF ↓
              </a>
              <a href={links.pdfPractice} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg border border-line-strong bg-card px-4 text-[14px] font-semibold hover:bg-line/40">
                面接練習シートPDF ↓
              </a>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-bold">② 修正の反映と模範音声の作成</h2>
            <p className="mt-1 text-[14px] text-muted">
              日本語を修正した項目の「ひらがな・インドネシア語」をAIで作り直し、まだ作っていない模範音声（MP3）を作成します。
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${needSync.length ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                反映が必要：{needSync.length}件
              </span>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${needAudio.length ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                音声が未作成：{blobEnabled ? `${needAudio.length}件` : "（Blob未設定）"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                disabled={busy !== null}
                onClick={() =>
                  run("all", async () => {
                    const a = needSync.length ? await doSync(false) : "";
                    const b = blobEnabled ? await doAudio(needAudio) : "";
                    return [a, b].filter(Boolean).join("\n") || "すべて最新です。";
                  })
                }
              >
                {busy === "all" && <Spinner />}
                変更を反映して音声を作成
              </Button>
              <Button variant="secondary" disabled={busy !== null} onClick={() => run("sync", () => doSync(false))}>
                {busy === "sync" && <Spinner />}
                ひらがな・訳だけ反映
              </Button>
              <Button variant="secondary" disabled={busy !== null || !blobEnabled} onClick={() => run("audio", () => doAudio(needAudio))}>
                {busy === "audio" && <Spinner />}
                音声だけ作成
              </Button>
            </div>
            {progress && (
              <div className="mt-4">
                <div className="flex justify-between text-[12px] text-muted">
                  <span>音声を作成中…</span>
                  <span>
                    {progress.done} / {progress.total}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-ink transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <details className="mt-4 text-[13px]">
              <summary className="cursor-pointer text-muted">その他の操作</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm("すべての項目の「ひらがな・インドネシア語」を、今の日本語から作り直します。よろしいですか？")) {
                      void run("sync", () => doSync(true));
                    }
                  }}
                >
                  すべてのひらがな・訳を作り直す
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy !== null || !blobEnabled}
                  onClick={() => {
                    if (window.confirm("すべての模範音声を作り直します。よろしいですか？")) {
                      void run("audio", () => doAudio(items.filter((i) => i.ja)));
                    }
                  }}
                >
                  すべての音声を作り直す
                </Button>
                <Button variant="danger" disabled={busy !== null} onClick={regenerate}>
                  {busy === "generate" && <Spinner />}
                  AIで最初から再生成（新しいシート）
                </Button>
              </div>
            </details>
          </section>

          <section className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-bold">③ 本人に送る</h2>
            <p className="mt-1 text-[14px] text-muted">学習ページでは、本文（日本語・ひらがな・インドネシア語）と模範音声を確認できます。</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-bg px-3 py-2 text-[13px]">{links.learner}</code>
              <CopyButton text={links.learner} label="URLをコピー" />
              <a href={links.learner} target="_blank" rel="noreferrer" className="rounded-lg border border-line-strong bg-card px-3 py-2 text-[13px] font-medium hover:bg-line/40">
                開く ↗
              </a>
            </div>
            <textarea readOnly value={message} rows={9} className="mt-3 block w-full rounded-lg border border-line bg-bg px-3 py-2 text-[13px] leading-relaxed" />
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={message} label="メッセージをコピー" />
              <a href={shareHref} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center rounded-lg bg-ok px-4 text-[14px] font-semibold text-white hover:bg-ok/90">
                {shareLabel} ↗
              </a>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-card">
            <h2 className="border-b border-line px-5 py-3 font-bold">項目ごとの状態</h2>
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.key} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3">
                  <span className="w-16 shrink-0 text-[13px] font-semibold">{i.label}</span>
                  <p className="line-clamp-2 min-w-[12rem] flex-1 text-[13px] text-muted">{i.ja || "（空欄）"}</p>
                  <div className="flex gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${i.needsSync ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                      {i.needsSync ? "要反映" : "最新"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${i.hasAudio ? "bg-ok-soft text-ok" : "bg-line/70 text-muted"}`}>
                      {i.hasAudio ? "音声あり" : "音声なし"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
