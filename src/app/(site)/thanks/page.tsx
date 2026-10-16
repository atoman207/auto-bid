import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/brand";
import { Container } from "@/components/container";
import { T } from "@/components/t";

export const metadata: Metadata = {
  title: "送信完了 / Terkirim",
  robots: { index: false },
};

export default function ThanksPage() {
  return (
    <>
      <main className="flex-1">
        <Container className="py-12 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-line bg-card p-6 text-center sm:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-ok" aria-hidden>
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 text-[26px] font-bold leading-snug">
                <T ja="送信が完了しました" id="Data Anda berhasil dikirim" />
              </h1>
              <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-muted">
                <T
                  ja="ありがとうございました。これから履歴書と面接練習の文章を作成し、担当者が確認します。準備ができたら、入力いただいた連絡先（WhatsApp・LINE・メール）にご連絡します。"
                  id="Terima kasih. Kami akan membuat CV dan bahan latihan wawancara Anda, lalu staf kami akan memeriksanya. Setelah siap, kami akan menghubungi Anda melalui kontak yang Anda isi (WhatsApp, LINE, atau email)."
                />
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-accent-soft p-5 text-[15px] leading-relaxed sm:p-6">
              <p className="font-bold">
                <T ja="待っている間に" id="Sambil menunggu" />
              </p>
              <p className="mt-1">
                <T
                  ja="面接では、はっきりした声とあいさつがとても大切です。「よろしくお願いいたします」を練習してみましょう。"
                  id="Dalam wawancara, suara yang jelas dan salam sangat penting. Coba latih kalimat「よろしくお願いいたします」(yoroshiku onegai itashimasu)."
                />
              </p>
            </div>

            <div className="mt-8 text-center">
              <Link href="/" className="inline-flex min-h-[52px] items-center rounded-xl border border-line-strong bg-card px-8 font-semibold hover:bg-bg">
                <T ja="トップへ戻る" id="Kembali ke beranda" />
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
