import "server-only";
import type { GeneratedContent } from "./ai";
import { hmac, safeEqual } from "./crypto";
import type { DemoResult, DemoText } from "./demo-types";
import { QUESTIONS, type Tri } from "./questions";
import { historyRows, hobbiesLine, licenseRows, requestText } from "./resume";
import type { ProfileInput } from "./schema";
import { formatJst } from "./text";

const MAX_TEXT = 2000;

/** A signed link, so the audio endpoint only speaks texts this app generated. */
export function demoAudioUrl(text: string, name: string): string {
  const t = text.trim().slice(0, MAX_TEXT);
  const token = `${Buffer.from(t, "utf8").toString("base64url")}.${hmac("demo-audio", t)}`;
  return `/api/demo/audio?d=${token}&n=${name}`;
}

export function verifyDemoToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const sig = token.slice(dot + 1);
  let text: string;
  try {
    text = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!text || text.length > MAX_TEXT) return null;
  try {
    return safeEqual(hmac("demo-audio", text), sig) ? text : null;
  } catch {
    return null;
  }
}

function withAudio(t: Tri, name: string): DemoText {
  return { ja: t.ja, hiragana: t.hiragana, id: t.id, audio: demoAudioUrl(t.ja, name) };
}

export function buildDemoResult(p: ProfileInput, ai: GeneratedContent, today: Date, id: string, saved: boolean): DemoResult {
  return {
    id,
    createdAt: formatJst(today),
    name: p.fullName.toUpperCase(),
    nameKana: ai.nameKatakana,
    address: ai.addressJa,
    motivation: ai.motivationJa,
    hobbies: hobbiesLine(p),
    request: requestText(p),
    history: historyRows(p).map(({ year, month, text }) => ({ year, month, text })),
    licenses: licenseRows(p).map(({ year, month, text }) => ({ year, month, text })),
    intro: withAudio(ai.selfIntro, "intro"),
    qa: QUESTIONS.map((q) => ({
      no: q.no,
      question: withAudio(q, `q${q.no}`),
      answer: withAudio(ai.answers[q.no], `a${q.no}`),
    })),
    saved,
  };
}
