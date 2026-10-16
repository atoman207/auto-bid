const HAN = /\p{Script=Han}/u;
const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function hasKanji(text: string): boolean {
  return HAN.test(text);
}

export function hasJapanese(text: string): boolean {
  return JAPANESE.test(text);
}

const KANA_RUN = /[\p{Script=Hiragana}\p{Script=Katakana}ー]{2,}/gu;
const KATAKANA_WORD = /[\p{Script=Katakana}ー]{2,}/gu;

function katakanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/**
 * Models often write katakana words of the Japanese in hiragana ("バドミントン" →
 * "ばどみんとん"). Puts them back in katakana, in order, so the reading matches the text.
 */
export function restoreKatakana(ja: string, reading: string): string {
  let out = reading;
  let from = 0;
  for (const [word] of ja.matchAll(KATAKANA_WORD)) {
    const kept = out.indexOf(word, from);
    if (kept >= 0) {
      from = kept + word.length;
      continue;
    }
    const hira = katakanaToHiragana(word);
    const at = out.indexOf(hira, from);
    if (at >= 0) {
      out = out.slice(0, at) + word + out.slice(at + hira.length);
      from = at + word.length;
    }
  }
  return out;
}

/**
 * Checks that a hiragana reading really is a reading of `ja`: every kana run of the
 * Japanese (okurigana, particles, katakana words) must appear, in order, in the reading.
 * Catches dropped words ("いたします" → "します") and katakana turned into hiragana.
 */
export function readingMatches(ja: string, hiragana: string): boolean {
  if (hasKanji(hiragana)) return false;
  // a long reading must be split into words (分かち書き)
  if (hiragana.length > 30 && !/\s/.test(hiragana)) return false;
  const reading = hiragana.replace(/\s+/g, "");
  let from = 0;
  for (const [run] of ja.matchAll(KANA_RUN)) {
    const at = reading.indexOf(run, from);
    if (at < 0) return false;
    from = at + run.length;
  }
  return true;
}

function isWide(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6)
  );
}

/**
 * Estimates the pixel height a wrapped cell needs in Google Sheets.
 * Sheets cannot auto-fit merged cells, so heights are set explicitly.
 */
export function estimateCellHeight(text: string, widthPx: number, fontPt = 10, minPx = 21): number {
  if (!text) return minPx;
  const em = (fontPt * 96) / 72;
  const usable = Math.max(40, widthPx - 10);
  let lines = 0;
  for (const paragraph of text.split(/\n/)) {
    let width = 0;
    for (const ch of paragraph) width += isWide(ch) ? em : ch === " " ? em * 0.3 : em * 0.56;
    // word-wrapped text (Indonesian, spaced hiragana) wastes some space at line ends
    const wrapLoss = /\s/.test(paragraph) ? 1.12 : 1.03;
    lines += Math.max(1, Math.ceil((width * wrapLoss) / usable));
  }
  const lineHeight = em * 1.42;
  return Math.max(minPx, Math.ceil(lines * lineHeight + 9));
}

const JST = "Asia/Tokyo";

export function formatJst(date: Date, withTime = true): string {
  const fmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
  return fmt.format(date);
}

export function jstParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: JST, year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

export function ageOn(birth: { year: number; month: number; day: number }, today: Date): number {
  const t = jstParts(today);
  let age = t.year - birth.year;
  if (t.month < birth.month || (t.month === birth.month && t.day < birth.day)) age--;
  return age;
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
