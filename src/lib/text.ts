const HAN = /\p{Script=Han}/u;
const JAPANESE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function hasKanji(text: string): boolean {
  return HAN.test(text);
}

export function hasJapanese(text: string): boolean {
  return JAPANESE.test(text);
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
