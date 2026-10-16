import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { pdfUrl, sheetUrl } from "@/lib/google";
import { itemViews } from "@/lib/learner";
import { CONTACT_METHODS, labelJa } from "@/lib/options";
import { isStaleProcessing, listenUrl, parseStoredProfile } from "@/lib/pipeline";
import { SheetNotFoundError, findSubmission, readResume, type ResumeContent } from "@/lib/sheets";
import { PRACTICE_RANGE, RESUME_RANGE } from "@/lib/sheet-template";
import { errorMessage } from "@/lib/text";
import { blobEnabled, listStoredAudio } from "@/lib/tts";
import { headers } from "next/headers";
import { connection } from "next/server";
import { ErrorCard, StatusChip } from "../../status";
import { DetailPanel, type DetailItem } from "./detail-panel";

export const metadata = { title: "受付詳細" };

export default function SubmissionPage({ params }: PageProps<"/admin/s/[id]">) {
  return (
    <>
      <Link href="/admin" className="text-[13px] font-medium text-muted hover:underline">
        ← 受付一覧
      </Link>
      <Suspense fallback={<p className="mt-8 text-muted">読み込み中…</p>}>
        <Detail params={params} />
      </Suspense>
    </>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  let found;
  try {
    found = await findSubmission(id);
  } catch (e) {
    return (
      <div className="mt-6">
        <ErrorCard title="スプレッドシートを読み込めませんでした" message={errorMessage(e)} />
      </div>
    );
  }
  if (!found) notFound();
  const r = found.record;

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"}`;

  let profileSummary: { label: string; value: string }[] = [];
  try {
    const p = parseStoredProfile(r);
    profileSummary = [
      { label: "連絡先", value: `${labelJa(CONTACT_METHODS, p.contactMethod)}：${p.contactValue}` },
      { label: "メール", value: p.email },
      { label: "希望分野", value: r.desired },
      { label: "日本語", value: r.jlpt },
    ].filter((x) => x.value);
  } catch {
    profileSummary = [{ label: "連絡先", value: `${r.contactMethod}：${r.contactValue}` }];
  }

  const sheetId = r.sheetId ? Number(r.sheetId) : null;
  let content: ResumeContent | null = null;
  let sheetMissing = false;
  let loadError = "";
  let stored = new Set<string>();
  if (sheetId !== null && Number.isSafeInteger(sheetId)) {
    try {
      content = await readResume(sheetId);
    } catch (e) {
      if (e instanceof SheetNotFoundError) sheetMissing = true;
      else loadError = errorMessage(e);
    }
    try {
      stored = new Set((await listStoredAudio(sheetId)).map((b) => b.pathname));
    } catch (e) {
      loadError ||= `音声の保存先（Vercel Blob）を読み込めませんでした: ${errorMessage(e)}`;
    }
  }

  const items: DetailItem[] =
    content && sheetId !== null
      ? itemViews(sheetId, content).map((i) => ({
          key: i.key,
          label: i.label,
          ja: i.ja,
          needsSync: i.needsSync,
          hasAudio: stored.has(i.audioPath),
        }))
      : [];

  const status = isStaleProcessing(r) ? "中断" : r.status;
  const learnerUrl = sheetId !== null && content ? listenUrl(env.baseUrl() || origin, sheetId) : "";

  return (
    <div className="mt-3 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">{r.name || "（氏名なし）"}</h1>
          <p className="text-[13px] text-muted">
            {r.id} · 受付 {r.createdAt}
            {r.updatedAt && ` · 更新 ${r.updatedAt}`}
          </p>
        </div>
        <StatusChip status={status} />
      </div>

      <dl className="grid gap-x-6 gap-y-1 rounded-xl border border-line bg-card p-4 text-[14px] sm:grid-cols-2">
        {profileSummary.map((x) => (
          <div key={x.label} className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted">{x.label}</dt>
            <dd className="min-w-0 break-words">{x.value}</dd>
          </div>
        ))}
      </dl>

      {r.error && status !== "完了" && <ErrorCard title="生成エラー" message={r.error} />}
      {sheetMissing && (
        <ErrorCard title="履歴書シートが見つかりません" message="シートが削除された可能性があります。「AIで再生成」で新しいシートを作成できます。" />
      )}
      {loadError && <ErrorCard title="読み込みエラー" message={loadError} />}

      <DetailPanel
        id={r.id}
        name={content?.kana || r.name}
        status={status}
        hasSheet={Boolean(content)}
        contactMethod={r.contactMethod}
        contactValue={r.contactValue}
        links={
          content && sheetId !== null
            ? {
                sheet: sheetUrl(sheetId),
                pdfResume: pdfUrl(sheetId, RESUME_RANGE),
                pdfPractice: pdfUrl(sheetId, PRACTICE_RANGE),
                learner: learnerUrl,
              }
            : null
        }
        items={items}
        blobEnabled={blobEnabled()}
      />
    </div>
  );
}
