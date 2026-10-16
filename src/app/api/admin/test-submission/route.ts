import { NextResponse } from "next/server";
import { adminRoute, jsonError, requestOrigin } from "@/lib/http";
import { newSubmissionId, processSubmission, recordSubmission } from "@/lib/pipeline";
import { SAMPLE_PROFILE } from "@/lib/sample";
import { validateProfile } from "@/lib/schema";

export const maxDuration = 60;

/** Runs the whole pipeline with sample answers, so the admin can verify the setup. */
export async function POST(request: Request) {
  return adminRoute(async () => {
    const parsed = validateProfile(SAMPLE_PROFILE);
    if (!parsed.ok) return jsonError(`サンプルデータが不正です: ${JSON.stringify(parsed.errors)}`, 500);
    // Letters only, so the stored input passes the same validation as real submissions.
    const profile = { ...parsed.data, fullName: `TEST ${parsed.data.fullName}` };
    const now = new Date();
    const id = newSubmissionId(now);
    await recordSubmission(profile, id, now);
    const result = await processSubmission(id, requestOrigin(request));
    if (!result.ok) return jsonError(result.error, 500, { id });
    return NextResponse.json({ ok: true, id, sheetId: result.sheetId });
  });
}
