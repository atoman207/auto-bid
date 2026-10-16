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

/** Serves the MP3 with byte-range support (needed by Safari on iPhone). */
function audioResponse(request: Request, data: Buffer, key: string, download: boolean): Response {
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "noindex",
  });
  if (download) headers.set("Content-Disposition", `attachment; filename="${key}.mp3"`);

  const total = data.length;
  const range = request.headers.get("range");
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (m && (m[1] !== "" || m[2] !== "")) {
    let start: number;
    let end: number;
    if (m[1] === "") {
      start = Math.max(0, total - Number(m[2]));
      end = total - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === "" ? total - 1 : Math.min(Number(m[2]), total - 1);
    }
    if (start >= total || start > end) {
      headers.set("Content-Range", `bytes */${total}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
    headers.set("Content-Length", String(end - start + 1));
    headers.set("Cache-Control", "private, max-age=31536000, immutable");
    return new Response(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers });
  }

  headers.set("Content-Length", String(total));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(new Uint8Array(data), { status: 200, headers });
}
