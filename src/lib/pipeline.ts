import "server-only";
import { generateContent, type GeneratedContent } from "./ai";
import { listenToken, randomCode, shortHash } from "./crypto";
import { env } from "./env";
import { sheetUrl } from "./google";
import { DESIRED_FIELDS, JLPT_LEVELS, labelJa, labelsJa } from "./options";
import { QUESTIONS } from "./questions";
import {
  HISTORY_ROWS, LICENSE_ROWS, birthLine, contactLine, emailLine, genderJa, historyRows, hobbiesLine, licenseRows,
  nationalityLine, phoneLine, requestText, residenceDescription, todayLine,
} from "./resume";
import { contactKey, validateProfile, type ProfileInput } from "./schema";
import {
  STATUS, appendSubmission, createResumeSheet, ensureStructure, findSubmission, updateSubmission, type CellValue,
  type LogRecord,
} from "./sheets";
import { errorMessage, formatJst, jstParts } from "./text";

export function newSubmissionId(now = new Date()): string {
  const t = jstParts(now);
  const ymd = `${String(t.year).slice(2)}${String(t.month).padStart(2, "0")}${String(t.day).padStart(2, "0")}`;
  return `R${ymd}-${randomCode(5)}`;
}

/** Hash of a Japanese text, used to notice when the admin edited it. */
export function syncHash(ja: string): string {
  return shortHash(ja.trim(), 12);
}

export function listenUrl(origin: string, sheetId: number): string {
  const base = env.baseUrl() || origin;
  return `${base}/listen/${listenToken(sheetId)}`;
}

export async function recordSubmission(profile: ProfileInput, id: string, now: Date): Promise<void> {
  await ensureStructure();
  await appendSubmission({
    id,
    createdAt: formatJst(now),
    status: STATUS.received,
    progress: "未対応",
    name: profile.fullName,
    contactMethod: profile.contactMethod,
    contactValue: profile.contactValue,
    email: profile.email,
    desired: labelsJa(DESIRED_FIELDS, profile.desiredFields).join("、"),
    jlpt: labelJa(JLPT_LEVELS, profile.jlpt),
    contactKey: contactKey(profile),
    updatedAt: formatJst(now),
    input: JSON.stringify(profile),
  });
}

export function sheetValues(p: ProfileInput, ai: GeneratedContent, today: Date): Record<string, CellValue> {
  const v: Record<string, CellValue> = {
    today: todayLine(today),
    name_kana: ai.nameKatakana,
    name: p.fullName.toUpperCase(),
    birth: birthLine(p, today),
    gender: genderJa(p),
    nationality: nationalityLine(p),
    address_kana: ai.addressKana,
    address: ai.addressJa,
    phone: phoneLine(p),
    email: emailLine(p),
    contact: contactLine(p),
    motivation: ai.motivationJa,
    hobbies: hobbiesLine(p),
    request: requestText(p),
  };
  const history = historyRows(p);
  for (let i = 0; i < HISTORY_ROWS; i++) {
    const row = history[i];
    v[`h${i + 1}.y`] = row?.year ?? "";
    v[`h${i + 1}.m`] = row?.month ?? "";
    v[`h${i + 1}.t`] = { value: row?.text ?? "", align: row?.align ?? "LEFT" };
  }
  const licenses = licenseRows(p);
  for (let i = 0; i < LICENSE_ROWS; i++) {
    const row = licenses[i];
    v[`l${i + 1}.y`] = row?.year ?? "";
    v[`l${i + 1}.m`] = row?.month ?? "";
    v[`l${i + 1}.t`] = row?.text ?? "";
  }
  const tri = (key: string, t: { ja: string; hiragana: string; id: string }) => {
    v[`${key}.ja`] = t.ja;
    v[`${key}.hiragana`] = t.hiragana;
    v[`${key}.id`] = t.id;
    v[`${key}.hash`] = syncHash(t.ja);
  };
  tri("intro", ai.selfIntro);
  for (const q of QUESTIONS) {
    tri(`q${q.no}`, q);
    tri(`a${q.no}`, ai.answers[q.no]);
  }
  return v;
}

export function parseStoredProfile(record: LogRecord): ProfileInput {
  let raw: unknown;
  try {
    raw = JSON.parse(record.input);
  } catch {
    throw new Error("入力データ(JSON)を読み込めませんでした。回答一覧シートの「入力データ(JSON)」列を確認してください。");
  }
  const result = validateProfile(raw);
  if (!result.ok) {
    const [field, message] = Object.entries(result.errors)[0] ?? ["", ""];
    throw new Error(`入力データが不正です（${field}: ${message}）`);
  }
  return result.data;
}

/** Creates the person's résumé sheet from generated content and marks the submission done. */
async function storeGenerated(id: string, profile: ProfileInput, ai: GeneratedContent, today: Date, origin: string): Promise<number> {
  const sheetId = await createResumeSheet(`${profile.fullName} ${id}`, sheetValues(profile, ai, today));
  await updateSubmission(id, {
    status: STATUS.done,
    sheetId: String(sheetId),
    sheetUrl: sheetUrl(sheetId),
    listenUrl: listenUrl(origin, sheetId),
    error: "",
  });
  return sheetId;
}

/** Demo mode: the content was already generated (and shown); keep a copy in the spreadsheet. */
export async function saveGeneratedSubmission(
  id: string,
  profile: ProfileInput,
  ai: GeneratedContent,
  today: Date,
  origin: string,
): Promise<void> {
  try {
    await recordSubmission(profile, id, today);
    await storeGenerated(id, profile, ai, today, origin);
  } catch (e) {
    console.error(`[saveGeneratedSubmission] ${id}:`, e);
    await updateSubmission(id, { status: STATUS.error, error: errorMessage(e).slice(0, 1000) }).catch(() => undefined);
  }
}

/**
 * Generates the texts with AI and creates the person's résumé sheet.
 * Errors are recorded in the log so the admin can retry from the dashboard.
 */
export async function processSubmission(id: string, origin: string): Promise<{ ok: true; sheetId: number } | { ok: false; error: string }> {
  try {
    const found = await findSubmission(id);
    if (!found) throw new Error(`受付ID ${id} が見つかりません`);
    const profile = parseStoredProfile(found.record);
    await updateSubmission(id, { status: STATUS.processing, error: "" });

    const today = new Date();
    const ai = await generateContent(profile, today, residenceDescription(profile));
    const sheetId = await storeGenerated(id, profile, ai, today, origin);
    return { ok: true, sheetId };
  } catch (e) {
    const error = errorMessage(e);
    console.error(`[processSubmission] ${id}:`, e);
    await updateSubmission(id, { status: STATUS.error, error: error.slice(0, 1000) }).catch((err) =>
      console.error(`[processSubmission] could not record error for ${id}:`, err),
    );
    return { ok: false, error };
  }
}

/** A submission stuck in 生成中 for this long was interrupted (e.g. function timeout). */
export const STALE_PROCESSING_MS = 4 * 60_000;

export function isStaleProcessing(record: LogRecord): boolean {
  if (record.status !== STATUS.processing) return false;
  const updated = parseJst(record.updatedAt);
  return updated === null || Date.now() - updated > STALE_PROCESSING_MS;
}

/** Parses "2026/10/16 22:05" (JST) as produced by formatJst. */
export function parseJst(text: string): number | null {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 9, Number(mi));
}
