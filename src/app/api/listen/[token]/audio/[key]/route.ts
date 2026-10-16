import { audioResponse } from "@/lib/audio-response";
import { verifyListenToken } from "@/lib/crypto";
import { clientIp, rateLimited } from "@/lib/http";
import { ITEM_KEYS } from "@/lib/questions";
import { SheetNotFoundError, readResume } from "@/lib/sheets";
import { audioHash, audioPath, ensureAudio, readStoredAudio, rememberedAudio } from "@/lib/tts";

export const maxDuration = 60;

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * Model audio for one learner item.
 * `?v=<hash>` pins a text version: those responses never change and are cached.
 * Without `v` (or with an outdated one) the request is redirected to the current version.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/listen/[token]/audio/[key]">) {
  const { token, key } = await ctx.params;
  const sheetId = verifyListenToken(token);
  if (sheetId === null || !(ITEM_KEYS as readonly string[]).includes(key)) return notFound();

  const url = new URL(request.url);
  const version = url.searchParams.get("v") ?? "";
  const download = url.searchParams.get("download") === "1";

  try {
    // Fast path: the requested version is already stored.
    if (/^[0-9a-f]{12}$/.test(version)) {
      const pathname = audioPath(sheetId, key, version);
      const stored = rememberedAudio(pathname) ?? (await readStoredAudio(pathname));
      if (stored) return audioResponse(request, stored, key, download);
    }

    if (rateLimited(`tts:${clientIp(request)}`, 40, 10 * 60_000)) {
      return new Response("Too many requests", { status: 429, headers: { "Retry-After": "120" } });
    }

    const content = await readResume(sheetId);
    const text = content.items[key]?.ja ?? "";
    if (!text) return notFound();

    const current = audioHash(text);
    if (version !== current) {
      url.searchParams.set("v", current);
      return new Response(null, { status: 302, headers: { Location: url.pathname + url.search, "Cache-Control": "no-store" } });
    }

    const { data } = await ensureAudio(sheetId, key, text);
    return audioResponse(request, data, key, download);
  } catch (e) {
    if (e instanceof SheetNotFoundError) return notFound();
    console.error("[listen audio]", e);
    return new Response("Audio is not available right now", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
