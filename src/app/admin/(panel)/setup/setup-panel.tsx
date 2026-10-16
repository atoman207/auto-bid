"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, CopyButton, Spinner } from "../ui";

type Config = {
  openai: boolean;
  openaiModel: string;
  ttsModel: string;
  ttsVoice: string;
  google: boolean;
  googleError: string;
  serviceAccountEmail: string;
  spreadsheet: boolean;
  adminPassword: boolean;
  appSecret: boolean;
  blob: boolean;
  blobAccess: string;
  baseUrl: string;
  allowDuplicates: boolean;
  demo: boolean;
};
type Status = { config: Config; spreadsheet: { ok: boolean; title?: string; sheets?: string[]; error?: string } };

function Row({ ok, warn, title, children }: { ok: boolean; warn?: boolean; title: string; children?: React.ReactNode }) {
  const state = ok ? "ok" : warn ? "warn" : "ng";
  return (
    <li className="flex gap-3 px-5 py-3.5">
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
          state === "ok" ? "bg-ok-soft text-ok" : state === "warn" ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger"
        }`}
      >
        {state === "ok" ? "✓" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 break-words text-[13px] text-muted">{children}</div>}
      </div>
    </li>
  );
}

export function SetupPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<null | "setup" | "template" | "test">(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string; link?: string } | null>(null);

  const fetchStatus = useCallback(async (): Promise<Status> => {
    const res = await fetch("/api/admin/setup", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data as Status;
  }, []);

  const load = useCallback(
    () =>
      fetchStatus().then(
        (data) => {
          setStatus(data);
          setLoadError("");
        },
        (e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)),
      ),
    [fetchStatus],
  );

  useEffect(() => {
    let active = true;
    fetchStatus().then(
      (data) => active && setStatus(data),
      (e: unknown) => active && setLoadError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      active = false;
    };
  }, [fetchStatus]);

  const call = async (kind: "setup" | "template" | "test") => {
    if (kind === "template" && !window.confirm("「履歴書テンプレート」シートを削除して作り直します。テンプレートに加えた変更は消えます。よろしいですか？")) return;
    setBusy(kind);
    setNotice(null);
    try {
      const url = kind === "test" ? "/api/admin/test-submission" : "/api/admin/setup";
      const body = kind === "template" ? { recreateTemplate: true } : {};
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setNotice({ kind: "error", text: data.error ?? `エラー（${res.status}）`, link: data.id ? `/admin/s/${data.id}` : undefined });
      } else if (kind === "test") {
        setNotice({ kind: "ok", text: `テスト送信が完了し、履歴書シートを作成しました（受付ID: ${data.id}）。`, link: `/admin/s/${data.id}` });
      } else {
        const created = (data.created as string[]) ?? [];
        setNotice({ kind: "ok", text: created.length ? `作成しました：${created.join("、")}` : "必要なシートはすべてそろっています。" });
      }
      await load();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    }
    setBusy(null);
  };

  if (loadError) return <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-danger">{loadError}</p>;
  if (!status) return <p className="mt-6 text-muted">確認中…</p>;
  const c = status.config;
  const ready = c.openai && c.google && c.spreadsheet && status.spreadsheet.ok;
  const hasLog = status.spreadsheet.sheets?.includes("回答一覧");
  const hasTemplate = status.spreadsheet.sheets?.includes("履歴書テンプレート");

  return (
    <div className="mt-6 space-y-5">
      <section className="overflow-hidden rounded-xl border border-line bg-card">
        <h2 className="border-b border-line px-5 py-3 font-bold">環境変数と接続</h2>
        <ul className="divide-y divide-line">
          <Row ok={c.openai} title="OpenAI API キー（OPENAI_API_KEY）">
            文章: {c.openaiModel} ／ 音声: {c.ttsModel}（声: {c.ttsVoice}）
          </Row>
          <Row ok={c.google} title="Google サービスアカウント">
            {c.google ? (
              <span className="flex flex-wrap items-center gap-2">
                <span>
                  このメールアドレスをスプレッドシートの「共有」に<b>編集者</b>として追加してください：
                </span>
                <code className="rounded bg-bg px-2 py-0.5 text-ink">{c.serviceAccountEmail}</code>
                <CopyButton text={c.serviceAccountEmail} className="!px-2 !py-1" />
              </span>
            ) : (
              c.googleError
            )}
          </Row>
          <Row ok={c.spreadsheet} title="スプレッドシート ID（GOOGLE_SPREADSHEET_ID）" />
          <Row ok={status.spreadsheet.ok} title="スプレッドシートへの接続">
            {status.spreadsheet.ok
              ? `「${status.spreadsheet.title}」に接続できました（シート: ${(status.spreadsheet.sheets ?? []).join("、")}）`
              : status.spreadsheet.error ?? "上の項目を設定すると確認できます"}
          </Row>
          <Row ok={c.adminPassword} title="管理パスワード（ADMIN_PASSWORD）" />
          <Row ok={c.appSecret} warn title="署名用シークレット（APP_SECRET）">
            {c.appSecret ? "設定済み" : "未設定です。仮の値で動作していますが、本番では必ず32文字以上のランダムな値を設定してください。"}
          </Row>
          <Row ok={c.blob} warn title="模範音声の保存先（Vercel Blob）">
            {c.blob
              ? `接続済み（${c.blobAccess}）`
              : "未設定です。学習ページでは再生時に毎回音声を生成します（動作はしますが、費用と待ち時間が増えます）。Vercel の Storage → Blob を作成して接続してください。"}
          </Row>
          <Row ok warn={c.demo} title="デモモード（DEMO_MODE）">
            {c.demo
              ? "オン：送信するとその場でAIが作成し、結果をモーダルで表示します（音声・CSVつき）。Google スプレッドシートが設定済みなら、結果はシートにも保存されます。"
              : "オフ：通常の運用です。送信内容はスプレッドシートに保存され、利用者には完了メッセージだけが表示されます。"}
          </Row>
          <Row ok={!c.allowDuplicates} warn title="1人1回の制限">
            {c.allowDuplicates ? "ALLOW_DUPLICATE_SUBMISSIONS=true のため、同じ連絡先から何度でも送信できます（テスト用）。" : "有効（同じ連絡先・メールからは1回のみ）"}
          </Row>
          <Row ok warn title="公開URL（APP_BASE_URL）">
            {c.baseUrl || "未設定（アクセス中のURLを使います）"}
          </Row>
        </ul>
      </section>

      {notice && (
        <div className={`rounded-xl px-4 py-3 text-[14px] font-medium ${notice.kind === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
          <p className="whitespace-pre-wrap break-words">{notice.text}</p>
          {notice.link && (
            <Link href={notice.link} className="mt-2 inline-block font-semibold text-ink underline">
              受付詳細を開く →
            </Link>
          )}
        </div>
      )}

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-bold">スプレッドシートの初期設定</h2>
        <p className="mt-1 text-[14px] text-muted">
          「回答一覧」と「履歴書テンプレート」シートを作成します。最初の送信時にも自動で作成されますが、先に実行しておくとテンプレートの見た目を確認・調整できます。
        </p>
        <p className="mt-2 text-[13px] text-muted">
          状態：回答一覧 {hasLog ? "✓ あり" : "— なし"} ／ 履歴書テンプレート {hasTemplate ? "✓ あり" : "— なし"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy !== null || !(c.google && c.spreadsheet)} onClick={() => call("setup")}>
            {busy === "setup" && <Spinner />}
            初期設定を実行
          </Button>
          <Button variant="secondary" disabled={busy !== null || !(c.google && c.spreadsheet)} onClick={() => call("template")}>
            {busy === "template" && <Spinner />}
            テンプレートを作り直す
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-5">
        <h2 className="font-bold">テスト送信</h2>
        <p className="mt-1 text-[14px] text-muted">
          サンプルの回答（TEST Siti Nurhaliza）で、AI生成からシート作成までを実際に実行します。OpenAI の利用料金が少し発生します。30秒〜1分ほどかかります。
        </p>
        <div className="mt-4">
          <Button disabled={busy !== null || !ready} onClick={() => call("test")}>
            {busy === "test" && <Spinner />}
            {busy === "test" ? "生成中…" : "テスト送信を実行"}
          </Button>
          {!ready && <p className="mt-2 text-[13px] text-warn">OpenAI とスプレッドシートの接続が完了すると実行できます。</p>}
        </div>
      </section>
    </div>
  );
}
