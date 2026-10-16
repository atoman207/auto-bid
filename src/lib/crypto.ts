import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appSecret } from "./env";

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function shortHash(text: string, length = 12): string {
  return sha256(text).slice(0, length);
}

export function hmac(purpose: string, data: string, length = 22): string {
  return createHmac("sha256", appSecret()).update(`${purpose}:${data}`).digest("base64url").slice(0, length);
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
  return out;
}

// ---- Learner page token: "<sheetId>-<signature>" ---------------------------

export function listenToken(sheetId: number): string {
  return `${sheetId}-${hmac("listen", String(sheetId))}`;
}

export function verifyListenToken(token: string): number | null {
  const m = /^(\d{1,12})-([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return null;
  const sheetId = Number(m[1]);
  if (!Number.isSafeInteger(sheetId)) return null;
  return safeEqual(hmac("listen", m[1]), m[2]) ? sheetId : null;
}

/** Folder name for a learner's audio files in Blob storage (not guessable). */
export function audioFolder(sheetId: number): string {
  return `s${sheetId}-${hmac("audio", String(sheetId), 16)}`;
}
