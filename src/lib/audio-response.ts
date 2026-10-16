import "server-only";

/** Serves an MP3 with byte-range support (needed by Safari on iPhone). */
export function audioResponse(request: Request, data: Buffer, fileName: string, download: boolean): Response {
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "X-Robots-Tag": "noindex",
  });
  if (download) headers.set("Content-Disposition", `attachment; filename="${fileName}.mp3"`);

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
