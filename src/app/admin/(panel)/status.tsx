const STYLES: Record<string, string> = {
  受付済み: "bg-line/70 text-ink",
  生成中: "bg-warn-soft text-warn",
  完了: "bg-ok-soft text-ok",
  エラー: "bg-danger-soft text-danger",
  中断: "bg-danger-soft text-danger",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STYLES[status] ?? "bg-line/70 text-ink"}`}>
      {status || "—"}
    </span>
  );
}

export function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft p-5">
      <p className="font-semibold text-danger">{title}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[14px] text-danger/90">{message}</p>
      <a href="/admin/setup" className="mt-3 inline-block text-[14px] font-semibold text-ink underline">
        初期設定・接続テストを開く
      </a>
    </div>
  );
}
