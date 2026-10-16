import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, createSessionValue } from "@/lib/auth";
import { env } from "@/lib/env";
import { clientIp, jsonError, rateLimited } from "@/lib/http";

export async function POST(request: Request) {
  if (!env.adminPassword()) {
    return jsonError("環境変数 ADMIN_PASSWORD が設定されていません。設定後にデプロイし直してください。", 500);
  }
  if (rateLimited(`login:${clientIp(request)}`, 10, 10 * 60_000)) {
    return jsonError("試行回数が多すぎます。10分ほど待ってからお試しください。", 429);
  }
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return jsonError("リクエストが不正です", 400);
  }
  if (!checkPassword(password)) return jsonError("パスワードが違います", 401);

  const session = createSessionValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session.maxAge,
  });
  return res;
}
