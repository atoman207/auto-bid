export type Lang = "ja" | "id";

export type Bi = { ja: string; id: string };

export const LANG_STORAGE_KEY = "rk-lang";

/** Separator of two-language messages produced on the server ("日本語 / Indonesia"). */
export const BI_SEP = " / ";

export function bi(ja: string, id: string): string {
  return `${ja}${BI_SEP}${id}`;
}

/** Picks one language out of a message built with `bi()`; other text is returned as is. */
export function pickBi(message: string | undefined | null, lang: Lang): string {
  if (!message) return "";
  const i = message.indexOf(BI_SEP);
  if (i < 0) return message;
  return lang === "ja" ? message.slice(0, i) : message.slice(i + BI_SEP.length);
}

export function pick(text: Bi | string, lang: Lang): string {
  return typeof text === "string" ? pickBi(text, lang) : text[lang];
}

/**
 * Runs in <head> before the first paint: applies the saved language (or the
 * browser's) so the page never flashes the other language.
 */
export const LANG_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;if(location.pathname.indexOf("/admin")===0){d.lang="ja";return}var l=null;try{l=localStorage.getItem("${LANG_STORAGE_KEY}")}catch(e){}if(l!=="ja"&&l!=="id"){l=/^ja/i.test(navigator.language||"")?"ja":"id"}d.setAttribute("data-lang",l);d.lang=l}catch(e){}})()`;
