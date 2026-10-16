import "server-only";
import { listenToken } from "./crypto";
import { syncHash } from "./pipeline";
import { ITEM_KEYS, itemLabel } from "./questions";
import { readResume, type ResumeContent, type ResumeItem } from "./sheets";
import { audioHash, audioPath } from "./tts";

export type ItemView = {
  key: string;
  label: string;
  ja: string;
  hiragana: string;
  id: string;
  /** Japanese text was edited after the hiragana / Indonesian were generated. */
  needsSync: boolean;
  audioHash: string;
  audioPath: string;
};

export function needsSync(item: ResumeItem): boolean {
  return item.ja !== "" && syncHash(item.ja) !== item.syncHash;
}

export function itemViews(sheetId: number, content: ResumeContent): ItemView[] {
  const out: ItemView[] = [];
  for (const key of ITEM_KEYS) {
    const item = content.items[key];
    if (!item) continue;
    const hash = audioHash(item.ja);
    out.push({
      key,
      label: itemLabel(key),
      ja: item.ja,
      hiragana: item.hiragana,
      id: item.id,
      needsSync: needsSync(item),
      audioHash: hash,
      audioPath: audioPath(sheetId, key, hash),
    });
  }
  return out;
}

export async function loadLearner(sheetId: number) {
  const content = await readResume(sheetId);
  return { content, items: itemViews(sheetId, content), token: listenToken(sheetId) };
}

export function audioUrl(token: string, key: string, hash: string, download = false): string {
  return `/api/listen/${token}/audio/${key}?v=${hash}${download ? "&download=1" : ""}`;
}
