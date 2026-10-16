import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/brand";
import { Container } from "@/components/container";
import { T } from "@/components/t";

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

const DELIVERABLES = [
  {
    icon: icon(
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5M10 12h6M10 16h6" />
      </>,
    ),
    title: { ja: "日本の履歴書", id: "Rirekisho (CV Jepang)" },
    body: {
      ja: "日本の会社に出せる、一般的な書式の履歴書を作ります。",
      id: "CV dengan format standar yang dipakai perusahaan Jepang.",
    },
  },
  {
    icon: icon(
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" />
      </>,
    ),
    title: { ja: "自己紹介文", id: "Teks perkenalan diri" },
    body: {
      ja: "日本語・ひらがな・インドネシア語の3つの版でお渡しします。",
      id: "Dalam 3 versi: bahasa Jepang, hiragana, dan bahasa Indonesia.",
    },
  },
  {
    icon: icon(
      <>
        <path d="M4 5h11v8H8l-4 3z" />
        <path d="M15 9h5v8l-3-2h-6v-2" />
      </>,
    ),
    title: { ja: "面接の質問10問と回答例", id: "10 pertanyaan wawancara & contoh jawaban" },
    body: {
      ja: "面接でよく聞かれる質問に、あなたに合った回答例を作ります。",
      id: "Contoh jawaban yang cocok dengan diri Anda untuk pertanyaan yang sering muncul.",
    },
  },
  {
    icon: icon(<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />),
    title: { ja: "模範音声（MP3）", id: "Audio contoh (MP3)" },
    body: {
      ja: "正しい発音とイントネーションを、聞いて練習できます。",
      id: "Latih pengucapan dan intonasi yang benar dengan mendengarkan.",
    },
  },
];

const STEPS = [
  { title: { ja: "質問に答える", id: "Jawab pertanyaan" }, body: { ja: "約10分。ほとんど選ぶだけです。", id: "± 10 menit, hampir semuanya pilihan." } },
  { title: { ja: "AIが文章を作る", id: "AI membuat teks" }, body: { ja: "あなたの答えをもとに作成します。", id: "Berdasarkan jawaban Anda." } },
  { title: { ja: "担当者が確認・修正", id: "Staf memeriksa & memperbaiki" }, body: { ja: "日本人スタッフがチェックします。", id: "Diperiksa oleh staf kami." } },
  {
    title: { ja: "WhatsApp・LINEでお届け", id: "Dikirim lewat WhatsApp / LINE" },
    body: { ja: "履歴書PDFと模範音声をお送りします。", id: "PDF CV dan audio contoh dikirim ke Anda." },
  },
];

const NOTES = [
  { ja: "ご利用はお一人様1回までです。", id: "Layanan ini hanya bisa digunakan 1 kali per orang." },
  { ja: "連絡先（WhatsApp・LINE・メールのどれか）の入力が必要です。", id: "Wajib mengisi kontak (WhatsApp, LINE, atau email)." },
  {
    ja: "送信後、結果はその場では表示されません。担当者が確認してからご連絡します。",
    id: "Hasil tidak langsung ditampilkan. Staf kami akan menghubungi Anda setelah memeriksanya.",
  },
];

const PREPARE = [
  { ja: "学校に入学・卒業した年", id: "Tahun masuk & lulus sekolah" },
  { ja: "仕事を始めた年・やめた年", id: "Tahun mulai & berhenti bekerja" },
  { ja: "日本語の試験（JLPT・JFT-Basic）に合格した年", id: "Tahun lulus JLPT / JFT-Basic" },
];

function StartButton({ size = "lg" }: { size?: "lg" | "md" }) {
  return (
    <Link
      href="/apply"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-accent font-bold text-accent-ink shadow-sm transition-colors hover:bg-accent-hover ${
        size === "lg" ? "min-h-[60px] w-full px-10 text-[17px] sm:w-auto" : "min-h-[52px] px-8 text-[16px]"
      }`}
    >
      <T ja="はじめる" id="Mulai sekarang" />
      <span aria-hidden>→</span>
    </Link>
  );
}

function SampleCard() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]" aria-hidden>
      {/* résumé sheet behind */}
      <div className="absolute -right-2 -top-6 hidden h-[340px] w-[78%] rotate-[4deg] rounded-2xl border border-line bg-card p-5 shadow-sm sm:block">
        <p className="text-[18px] font-bold tracking-[0.4em]">履歴書</p>
        <div className="mt-4 grid grid-cols-[1fr_72px] gap-3">
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-5 rounded border border-line" />
            ))}
          </div>
          <div className="h-24 rounded border border-dashed border-line-strong" />
        </div>
        <div className="mt-4 space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="grid grid-cols-[44px_28px_1fr] gap-1.5">
              <div className="h-4 rounded bg-bg" />
              <div className="h-4 rounded bg-bg" />
              <div className="h-4 rounded bg-bg" />
            </div>
          ))}
        </div>
      </div>
      {/* learner card in front */}
      <div className="relative mt-6 rounded-2xl border border-line bg-card p-5 shadow-[0_18px_40px_-18px_rgba(29,34,48,0.35)] sm:mt-10">
        <p className="text-[12px] font-bold tracking-wide text-accent">
          <T ja="例：面接の練習" id="Contoh: latihan wawancara" />
        </p>
        <p className="mt-2 text-[17px] font-semibold">自己紹介をしてください。</p>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div>
            <span className="rounded bg-bg px-1.5 py-0.5 text-[11px] font-semibold text-muted">日本語</span>
            <p className="mt-1 text-[15px] leading-relaxed">はじめまして。シティ・ヌルハリザと申します。インドネシアの西ジャワ州から来ました。</p>
          </div>
          <div>
            <span className="rounded bg-bg px-1.5 py-0.5 text-[11px] font-semibold text-muted">ひらがな</span>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">はじめまして。シティ・ヌルハリザと もうします。インドネシアの にしジャワしゅうから きました。</p>
          </div>
          <div>
            <span className="rounded bg-bg px-1.5 py-0.5 text-[11px] font-semibold text-muted">Bahasa Indonesia</span>
            <p className="mt-1 text-[14px] leading-relaxed text-ink/80">Perkenalkan, nama saya Siti Nurhaliza. Saya berasal dari Jawa Barat, Indonesia.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-accent-soft px-4 py-3 text-accent">
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0">
            <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
          </svg>
          <div className="flex h-5 flex-1 items-center gap-[3px]">
            {[6, 12, 18, 10, 16, 8, 14, 20, 12, 7, 15, 11, 18, 9, 13, 6, 16, 10, 12, 8].map((h, i) => (
              <span key={i} className="w-[3px] rounded-full bg-accent/60" style={{ height: `${h}px` }} />
            ))}
          </div>
          <span className="text-[12px] font-semibold">0:24</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <main>
        {/* ---------------------------------------------------------------- hero */}
        <section className="border-b border-line bg-gradient-to-b from-card to-bg">
          <Container className="grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
            <div>
              <p className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-[13px] font-semibold text-accent">
                <T ja="日本で働きたい方へ" id="Untuk Anda yang ingin bekerja di Jepang" />
              </p>
              <h1 className="mt-5 text-[30px] font-bold leading-[1.3] tracking-tight sm:text-[40px] lg:text-[46px]">
                <T
                  ja={
                    <>
                      質問に答えるだけで、
                      <br />
                      日本の履歴書と面接練習。
                    </>
                  }
                  id="Cukup jawab pertanyaan, CV Jepang & latihan wawancara siap."
                />
              </h1>
              <p className="mt-5 max-w-[34rem] text-[16px] leading-relaxed text-muted sm:text-[17px]">
                <T
                  ja="AIがあなたの経験や性格をもとに、履歴書の文章と面接の回答例を作ります。担当者が確認してから、あなたにお届けします。"
                  id="AI membuat isi CV dan contoh jawaban wawancara berdasarkan pengalaman dan kepribadian Anda. Staf kami memeriksanya sebelum dikirim kepada Anda."
                />
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <StartButton />
                <p className="text-center text-[14px] text-muted sm:text-left">
                  <T ja="約10分・ほとんど選ぶだけ" id="± 10 menit · hampir semuanya pilihan" />
                </p>
              </div>
            </div>
            <SampleCard />
          </Container>
        </section>

        {/* ---------------------------------------------------------------- deliverables */}
        <section id="features" className="scroll-mt-20 py-16 sm:py-20">
          <Container>
            <h2 className="text-[24px] font-bold sm:text-[28px]">
              <T ja="受け取れるもの" id="Yang Anda dapatkan" />
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DELIVERABLES.map((d) => (
                <li key={d.title.ja} className="rounded-2xl border border-line bg-card p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">{d.icon}</span>
                  <h3 className="mt-4 text-[17px] font-bold leading-snug">
                    <T {...d.title} />
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">
                    <T {...d.body} />
                  </p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ---------------------------------------------------------------- flow */}
        <section id="flow" className="scroll-mt-20 border-y border-line bg-card py-16 sm:py-20">
          <Container>
            <h2 className="text-[24px] font-bold sm:text-[28px]">
              <T ja="ご利用の流れ" id="Alur penggunaan" />
            </h2>
            <ol className="mt-10 grid gap-8 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title.ja} className="relative flex gap-4 lg:block">
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute left-5 top-11 h-[calc(100%-8px)] w-0.5 bg-line lg:left-12 lg:top-5 lg:h-0.5 lg:w-[calc(100%-24px)]" />
                  )}
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-card text-[15px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <div className="lg:mt-5">
                    <h3 className="text-[17px] font-bold leading-snug">
                      <T {...s.title} />
                    </h3>
                    <p className="mt-1 text-[14px] text-muted">
                      <T {...s.body} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ---------------------------------------------------------------- notes */}
        <section id="notes" className="scroll-mt-20 py-16 sm:py-20">
          <Container className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-warn/25 bg-warn-soft p-6 sm:p-8">
              <h2 className="text-[19px] font-bold text-warn">
                <T ja="ご注意" id="Perhatian" />
              </h2>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed">
                {NOTES.map((n) => (
                  <li key={n.ja} className="flex gap-2.5">
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                    <span>
                      <T {...n} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
              <h2 className="text-[19px] font-bold">
                <T ja="準備しておくと便利なもの" id="Sebaiknya disiapkan" />
              </h2>
              <ul className="mt-4 space-y-3 text-[15px] leading-relaxed">
                {PREPARE.map((n) => (
                  <li key={n.ja} className="flex gap-2.5">
                    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden>
                      <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>
                      <T {...n} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* ---------------------------------------------------------------- final CTA */}
        <section className="pb-20">
          <Container>
            <div className="flex flex-col items-start gap-6 rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-14">
              <div>
                <h2 className="text-[22px] font-bold sm:text-[26px]">
                  <T ja="さっそく始めましょう" id="Ayo mulai sekarang" />
                </h2>
                <p className="mt-2 text-[15px] text-white/75">
                  <T ja="スマートフォンで、約10分で入力できます。" id="Bisa diisi dari HP dalam ± 10 menit." />
                </p>
              </div>
              <StartButton size="md" />
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
