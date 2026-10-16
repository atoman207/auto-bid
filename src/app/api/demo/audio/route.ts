import { aiErrorCode } from "@/lib/ai";
import { audioResponse } from "@/lib/audio-response";
import { verifyDemoToken } from "@/lib/demo";
import { clientIp, rateLimited } from "@/lib/http";
import { ensureDemoAudio } from "@/lib/tts";

export const maxDuration = 60;

/** Model audio for a demo result. The link is signed when the result is generated. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = verifyDemoToken(url.searchParams.get("d") ?? "");
  if (!text) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  if (rateLimited(`demo-audio:${clientIp(request)}`, 150, 10 * 60_000)) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": "120" } });
  }

  const name = url.searchParams.get("n") ?? "";
  const fileName = /^[a-z0-9-]{1,20}$/.test(name) ? name : "audio";
  try {
    const { data } = await ensureDemoAudio(text);
    return audioResponse(request, data, fileName, url.searchParams.get("download") === "1");
  } catch (e) {
    const code = aiErrorCode(e);
    console.error(`[demo audio] ${code}:`, e);
    return Response.json({ ok: false, code }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
