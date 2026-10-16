import { NextResponse } from "next/server";
import { generateReadings } from "@/lib/ai";
import { adminRoute, jsonError } from "@/lib/http";
import { needsSync } from "@/lib/learner";
import { syncHash } from "@/lib/pipeline";
import { ITEM_KEYS } from "@/lib/questions";
import { findSubmission, readResume, writeResumeItems, type ItemUpdate } from "@/lib/sheets";

export const maxDuration = 60;

/**
 * Regenerates the hiragana and Indonesian versions for every item whose Japanese
 * text was edited in the spreadsheet (or for all items with { all: true }).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/submissions/[id]/sync">) {
  return adminRoute(async () => {
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { all?: boolean; keys?: string[] };
    const found = await findSubmission(id);
    if (!found) return jsonError("受付データが見つかりません", 404);
    const sheetId = Number(found.record.sheetId);
    if (!found.record.sheetId || !Number.isSafeInteger(sheetId)) return jsonError("履歴書シートがまだありません", 400);

    const content = await readResume(sheetId);
    const targets = ITEM_KEYS.map((k) => content.items[k])
      .filter((item) => item && item.ja)
      .filter((item) => (body.keys ? body.keys.includes(item.key) : body.all ? true : needsSync(item)));
    if (targets.length === 0) return NextResponse.json({ ok: true, updated: [], failed: [] });

    const readings = await generateReadings(targets.map((t) => ({ key: t.key, ja: t.ja })));
    const updates: ItemUpdate[] = [];
    const failed: string[] = [];
    for (const t of targets) {
      const r = readings[t.key];
      if (!r) {
        failed.push(t.key);
        continue;
      }
      updates.push({ key: t.key, hiragana: r.hiragana, id: r.id, syncHash: syncHash(t.ja) });
    }
    await writeResumeItems(sheetId, content, updates);
    return NextResponse.json({ ok: true, updated: updates.map((u) => u.key), failed });
  });
}
