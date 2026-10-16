import { NextResponse } from "next/server";
import { adminRoute, jsonError } from "@/lib/http";
import { ITEM_KEYS } from "@/lib/questions";
import { findSubmission } from "@/lib/sheets";
import { audioHash, blobEnabled, ensureAudio } from "@/lib/tts";

export const maxDuration = 60;

/**
 * Generates (and stores) the model audio for one item.
 * The dashboard sends the Japanese text it just read from the sheet, which keeps
 * Google API usage low while generating many files in a row.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/submissions/[id]/audio">) {
  return adminRoute(async () => {
    if (!blobEnabled()) {
      return jsonError(
        "音声の保存先（Vercel Blob）が未設定です。BLOB_READ_WRITE_TOKEN を設定してください。未設定でも学習ページでは再生時に音声が自動生成されます。",
        400,
      );
    }
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as { key?: string; text?: string };
    const key = String(body.key ?? "");
    const text = String(body.text ?? "").trim();
    if (!(ITEM_KEYS as readonly string[]).includes(key)) return jsonError("項目が不正です", 400);
    if (!text || text.length > 4000) return jsonError("文章が空か、長すぎます", 400);

    const found = await findSubmission(id);
    if (!found) return jsonError("受付データが見つかりません", 404);
    const sheetId = Number(found.record.sheetId);
    if (!found.record.sheetId || !Number.isSafeInteger(sheetId)) return jsonError("履歴書シートがまだありません", 400);

    const { created } = await ensureAudio(sheetId, key, text);
    return NextResponse.json({ ok: true, key, hash: audioHash(text), created });
  });
}
