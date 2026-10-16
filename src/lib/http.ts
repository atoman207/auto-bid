import "server-only";
import { NextResponse } from "next/server";
import { UnauthorizedError, requireAdmin } from "./auth";
import { ConfigError } from "./env";
import { errorMessage } from "./text";

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** Wraps an admin route: checks the session and turns thrown errors into JSON. */
export async function adminRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    await requireAdmin();
    return await fn();
  } catch (e) {
    if (e instanceof UnauthorizedError) return jsonError("ログインが必要です", 401);
    if (e instanceof ConfigError) return jsonError(e.message, 500);
    console.error("[admin api]", e);
    return jsonError(errorMessage(e), 500);
  }
}

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

const buckets = new Map<string, number[]>();

/** Best-effort per-instance rate limit. */
export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return hits.length > limit;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
