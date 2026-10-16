import { NextResponse, connection } from "next/server";
import { demoMode, env, sheetsConfigured } from "@/lib/env";

/** Public, non-secret status for the form: demo mode, and whether submissions can work. */
export async function GET() {
  await connection();
  const demo = demoMode();
  const ready = env.hasOpenAI() && (demo || sheetsConfigured());
  return NextResponse.json({ demo, ready }, { headers: { "Cache-Control": "no-store" } });
}
