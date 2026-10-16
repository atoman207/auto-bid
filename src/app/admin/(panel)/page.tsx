import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isAdmin } from "@/lib/auth";
import { CONTACT_METHODS, labelJa } from "@/lib/options";
import { isStaleProcessing } from "@/lib/pipeline";
import { listSubmissions } from "@/lib/sheets";
import { errorMessage } from "@/lib/text";
import { ErrorCard, StatusChip } from "./status";

export const metadata = { title: "受付一覧" };

export default function AdminHomePage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">受付一覧</h1>
          <p className="text-[13px] text-muted">新しい順。氏名をクリックすると、確認・修正の反映・音声作成ができます。</p>
        </div>
      </div>
      <Suspense fallback={<p className="mt-8 text-muted">読み込み中…</p>}>
        <SubmissionList />
      </Suspense>
    </>
  );
}

async function SubmissionList() {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");
  let rows;
  try {
    rows = await listSubmissions();
  } catch (e) {
    return (
      <div className="mt-6">
        <ErrorCard title="スプレッドシートを読み込めませんでした" message={errorMessage(e)} />
      </div>
    );
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-line bg-card p-8 text-center">
        <p className="font-semibold">まだ受付はありません</p>
        <p className="mt-1 text-[14px] text-muted">
          動作確認は <Link href="/admin/setup" className="font-semibold text-ink underline">初期設定・テスト</Link> の「テスト送信」から行えます。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-line bg-card">
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const status = isStaleProcessing(r) ? "中断" : r.status;
          return (
            <li key={r.id}>
              <Link href={`/admin/s/${encodeURIComponent(r.id)}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 hover:bg-bg">
                <div className="min-w-[11rem] flex-1">
                  <p className="font-semibold">{r.name || "（氏名なし）"}</p>
                  <p className="text-[12px] text-muted">
                    {r.id} · {r.createdAt}
                  </p>
                </div>
                <div className="min-w-[10rem] text-[13px] text-muted">
                  {labelJa(CONTACT_METHODS, r.contactMethod) || r.contactMethod}：{r.contactValue}
                  {r.desired && <span className="block truncate">{r.desired}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={status} />
                  {r.progress && <span className="rounded-full bg-bg px-2.5 py-0.5 text-[12px] text-muted ring-1 ring-line">{r.progress}</span>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
