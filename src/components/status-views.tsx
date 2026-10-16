import Link from "next/link";
import { Container } from "./container";
import { T } from "./t";

export function NotFoundView() {
  return (
    <Container className="flex flex-1 flex-col items-center py-20 text-center">
      <p className="text-[56px] font-bold leading-none text-line-strong">404</p>
      <h1 className="mt-4 text-[22px] font-bold">
        <T ja="ページが見つかりません" id="Halaman tidak ditemukan" />
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        <T
          ja="URLが正しいか確認してください。リンクが開けない場合は、担当者にご連絡ください。"
          id="Periksa kembali URL-nya. Jika link tidak bisa dibuka, silakan hubungi staf kami."
        />
      </p>
      <Link href="/" className="mt-8 inline-flex min-h-[48px] items-center rounded-xl border border-line-strong bg-card px-6 font-semibold hover:bg-bg">
        <T ja="トップへ戻る" id="Kembali ke beranda" />
      </Link>
    </Container>
  );
}

export function ErrorContent({ onRetry }: { onRetry: () => void }) {
  return (
    <Container className="flex flex-1 flex-col items-center py-20 text-center">
      <h1 className="text-[22px] font-bold">
        <T ja="一時的なエラーが発生しました" id="Terjadi kesalahan sementara" />
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        <T ja="少し時間をおいてから、もう一度お試しください。" id="Silakan coba lagi beberapa saat lagi." />
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRetry} className="min-h-[48px] rounded-xl bg-ink px-6 font-semibold text-white hover:bg-ink/90">
          <T ja="再読み込み" id="Muat ulang" />
        </button>
        <Link href="/" className="inline-flex min-h-[48px] items-center rounded-xl border border-line-strong bg-card px-6 font-semibold hover:bg-bg">
          <T ja="トップへ" id="Beranda" />
        </Link>
      </div>
    </Container>
  );
}
