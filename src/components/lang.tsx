"use client";

import { useSyncExternalStore } from "react";
import { LANG_STORAGE_KEY, type Lang } from "@/lib/i18n";

const listeners = new Set<() => void>();

function current(): Lang {
  return document.documentElement.getAttribute("data-lang") === "ja" ? "ja" : "id";
}

export function setLang(lang: Lang) {
  const root = document.documentElement;
  root.setAttribute("data-lang", lang);
  root.lang = lang;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // storage unavailable (private mode): the choice lasts for this page only
  }
  listeners.forEach((l) => l());
}

/** The selected language, for text that cannot use <T> (attributes, <option>, messages). */
export function useLang(): Lang {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    current,
    () => "id",
  );
}

const TABS: { lang: Lang; label: string; short: string }[] = [
  { lang: "ja", label: "日本語", short: "日本語" },
  { lang: "id", label: "Bahasa Indonesia", short: "Indonesia" },
];

export function LanguageTabs({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div role="group" aria-label="Language / 言語" className={`flex shrink-0 rounded-full bg-bg p-1 ring-1 ring-line-strong ${className}`}>
      {TABS.map((t) => (
        <button
          key={t.lang}
          type="button"
          lang={t.lang}
          onClick={() => setLang(t.lang)}
          aria-pressed={lang === t.lang}
          className={`lang-tab lang-tab-${t.lang} min-h-[34px] rounded-full px-3 text-[13px] font-semibold text-muted transition-colors hover:text-ink sm:px-4`}
        >
          <span className="sm:hidden">{t.short}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
