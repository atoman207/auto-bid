import { NextResponse } from "next/server";
import { adminRoute, jsonError, requestOrigin } from "@/lib/http";
import { isStaleProcessing, processSubmission } from "@/lib/pipeline";
import { STATUS, findSubmission } from "@/lib/sheets";

export const maxDuration = 60;

/** (Re)generates the AI texts and creates a new résumé sheet for a submission. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/submissions/[id]/generate">) {
  return adminRoute(async () => {
    const { id } = await ctx.params;
    const found = await findSubmission(id);
    if (!found) return jsonError("受付データが見つかりません", 404);
    if (found.record.status === STATUS.processing && !isStaleProcessing(found.record)) {
      return jsonError("現在生成中です。1〜2分ほど待ってから画面を更新してください。", 409);
    }
    const result = await processSubmission(id, requestOrigin(request));
    if (!result.ok) return jsonError(result.error, 500);
    return NextResponse.json({ ok: true, sheetId: result.sheetId });
  });
}
