import "server-only";
import { del, get, list, put } from "@vercel/blob";
import { openai } from "./ai";
import { audioFolder, shortHash } from "./crypto";
import { env } from "./env";

const INSTRUCTIONS_VERSION = "v1";

const INSTRUCTIONS = `あなたは日本語教師です。日本の会社の面接を練習しているインドネシア人学習者のための「模範音声」として読み上げてください。
- 標準語（共通語）の自然なアクセントとイントネーションで話す。
- 学習者が聞き取りやすいように、ややゆっくり、一語一語はっきり発音する。
- 面接にふさわしい、明るく誠実で丁寧な話し方にする。
- 句読点ではしっかり間を取る。`;

/** Version hash of the audio: changes when the text or the voice settings change. */
export function audioHash(text: string): string {
  return shortHash([env.ttsModel(), env.ttsVoice(), INSTRUCTIONS_VERSION, text.trim()].join("\u0000"), 12);
}

export async function synthesize(text: string): Promise<Buffer> {
  const model = env.ttsModel();
  const response = await openai().audio.speech.create({
    model,
    voice: env.ttsVoice(),
    input: text.trim().slice(0, 4000),
    response_format: "mp3",
    ...(model.startsWith("tts-1") ? { speed: 0.9 } : { instructions: INSTRUCTIONS }),
  });
  return Buffer.from(await response.arrayBuffer());
}

// ---------------------------------------------------------------- Blob storage

export function blobEnabled(): boolean {
  return Boolean(env.blobToken());
}

export function audioPath(sheetId: number, key: string, hash: string): string {
  return `audio/${audioFolder(sheetId)}/${key}-${hash}.mp3`;
}

export async function readStoredAudio(pathname: string): Promise<Buffer | null> {
  if (!blobEnabled()) return null;
  const result = await get(pathname, { access: env.blobAccess(), token: env.blobToken() });
  if (!result || result.statusCode !== 200) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function storeAudio(pathname: string, data: Buffer): Promise<void> {
  await put(pathname, data, {
    access: env.blobAccess(),
    token: env.blobToken(),
    contentType: "audio/mpeg",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
}

/** All stored audio pathnames for one learner. */
export async function listStoredAudio(sheetId: number): Promise<{ pathname: string; url: string }[]> {
  if (!blobEnabled()) return [];
  const prefix = `audio/${audioFolder(sheetId)}/`;
  const out: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000, token: env.blobToken() });
    out.push(...page.blobs.map((b) => ({ pathname: b.pathname, url: b.url })));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

/** Removes older versions of an item's audio after a new one was stored. */
export async function deleteOldVersions(sheetId: number, key: string, keepPathname: string): Promise<void> {
  if (!blobEnabled()) return;
  const all = await listStoredAudio(sheetId);
  const stale = all.filter((b) => b.pathname.startsWith(`audio/${audioFolder(sheetId)}/${key}-`) && b.pathname !== keepPathname);
  if (stale.length) await del(stale.map((b) => b.url), { token: env.blobToken() });
}

// Keeps recently generated audio on warm instances, so repeated (range) requests get
// identical bytes even when no Blob store is configured.
const memory = new Map<string, Buffer>();
const MEMORY_LIMIT = 60;

function remember(pathname: string, data: Buffer) {
  memory.delete(pathname);
  memory.set(pathname, data);
  while (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value as string);
}

/** Returns the audio stored at `pathname`, generating (and storing) it when missing. */
async function ensureAudioAt(pathname: string, text: string): Promise<{ data: Buffer; created: boolean }> {
  const cached = memory.get(pathname);
  if (cached) return { data: cached, created: false };
  const stored = await readStoredAudio(pathname).catch(() => null);
  if (stored) {
    remember(pathname, stored);
    return { data: stored, created: false };
  }
  const data = await synthesize(text);
  remember(pathname, data);
  if (blobEnabled()) await storeAudio(pathname, data).catch((e) => console.error("[tts] could not store audio:", e));
  return { data, created: true };
}

/** Audio for one learner item; older versions of the same item are removed. */
export async function ensureAudio(sheetId: number, key: string, text: string): Promise<{ data: Buffer; created: boolean }> {
  const pathname = audioPath(sheetId, key, audioHash(text));
  const result = await ensureAudioAt(pathname, text);
  if (result.created && blobEnabled()) await deleteOldVersions(sheetId, key, pathname).catch(() => undefined);
  return result;
}

/** Audio for a demo result (no spreadsheet): keyed by the text itself. */
export function ensureDemoAudio(text: string): Promise<{ data: Buffer; created: boolean }> {
  return ensureAudioAt(`audio/demo/${audioHash(text)}.mp3`, text);
}

export function rememberedAudio(pathname: string): Buffer | null {
  return memory.get(pathname) ?? null;
}
