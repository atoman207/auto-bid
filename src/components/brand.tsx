import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "./container";
import { HeaderActions } from "./header-actions";
import { LanguageTabs } from "./lang";
import { T } from "./t";

/**
 * The logo mark (public/logo.svg): a résumé sheet on a red tile with an AI sparkle.
 * Red & white are the colours of both the Indonesian and Japanese flags; the red
 * circle is Japan's sun and the photo on a résumé. Decorative next to the name.
 */
export function BrandMark({ className = "h-8 w-8", preload = false }: { className?: string; preload?: boolean }) {
  return <Image src="/logo.svg" alt="" width={64} height={64} preload={preload} className={className} />;
}

/** The service name, with "AI" in the brand red. */
export function BrandName() {
  return (
    <T
      ja={
        <>
          履歴書<span className="text-accent">AI</span>サポート
        </>
      }
      id={
        <>
          Rirekisho <span className="text-accent">AI</span>
        </>
      }
    />
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <Container className="flex h-14 items-center gap-3 sm:h-16 sm:gap-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="履歴書AIサポート / Rirekisho AI">
          <BrandMark className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" preload />
          <span className="min-w-0 leading-tight max-[370px]:hidden">
            <span className="block truncate text-[15px] font-bold tracking-tight sm:text-[17px]">
              <BrandName />
            </span>
            <span className="hidden text-[12px] text-muted sm:block">
              <T ja="日本で働く人のための履歴書・面接練習" id="CV Jepang & latihan wawancara" />
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <Suspense fallback={null}>
            <HeaderActions />
          </Suspense>
          <LanguageTabs />
        </div>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-card">
      <Container className="flex flex-col gap-4 py-8 text-[13px] text-muted sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="text-[14px] font-bold text-ink">
            <BrandName />
          </span>
        </div>
        <p className="max-w-xl leading-relaxed sm:text-right">
          <T
            ja="入力された情報は、履歴書の作成と就職支援のご連絡のためにのみ利用します。"
            id="Data Anda hanya digunakan untuk membuat CV dan untuk menghubungi Anda terkait dukungan kerja."
          />
        </p>
      </Container>
    </footer>
  );
}
