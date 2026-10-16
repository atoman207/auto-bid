import { NextResponse } from "next/server";
import { configStatus } from "@/lib/env";
import { adminRoute } from "@/lib/http";
import { ensureStructure, resetStructureCache, spreadsheetTitle } from "@/lib/sheets";
import { errorMessage } from "@/lib/text";

export const maxDuration = 60;

/** Configuration check and connection test. */
export async function GET() {
  return adminRoute(async () => {
    const config = configStatus();
    let spreadsheet: { ok: boolean; title?: string; sheets?: string[]; error?: string } = { ok: false };
    if (config.google && config.spreadsheet) {
      try {
        spreadsheet = { ok: true, ...(await spreadsheetTitle()) };
      } catch (e) {
        spreadsheet = { ok: false, error: errorMessage(e) };
      }
    }
    return NextResponse.json({ ok: true, config, spreadsheet });
  });
}

/** Creates the log sheet and the résumé template (or recreates the template). */
export async function POST(request: Request) {
  return adminRoute(async () => {
    const body = (await request.json().catch(() => ({}))) as { recreateTemplate?: boolean };
    resetStructureCache();
    const result = await ensureStructure({ recreateTemplate: body.recreateTemplate === true });
    return NextResponse.json({ ok: true, ...result });
  });
}
