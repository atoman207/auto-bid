"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "./t";

/** Section links and the call to action — only on the landing page. */
export function HeaderActions() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <>
      <nav className="hidden items-center gap-1 text-[14px] font-medium md:flex">
        <a href="#features" className="rounded-lg px-3 py-2 text-muted hover:bg-bg hover:text-ink">
          <T ja="受け取れるもの" id="Yang Anda dapatkan" />
        </a>
        <a href="#flow" className="rounded-lg px-3 py-2 text-muted hover:bg-bg hover:text-ink">
          <T ja="ご利用の流れ" id="Alur" />
        </a>
        <a href="#notes" className="rounded-lg px-3 py-2 text-muted hover:bg-bg hover:text-ink">
          <T ja="ご注意" id="Perhatian" />
        </a>
      </nav>
      <Link
        href="/apply"
        className="hidden min-h-[40px] items-center rounded-full bg-accent px-5 text-[14px] font-bold text-accent-ink hover:bg-accent-hover lg:inline-flex"
      >
        <T ja="はじめる" id="Mulai" />
      </Link>
    </>
  );
}
