import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clientIp, jsonError, rateLimited, requestOrigin } from "@/lib/http";
import { newSubmissionId, processSubmission, recordSubmission } from "@/lib/pipeline";
import { contactKey, validateProfile } from "@/lib/schema";
import { findByContact } from "@/lib/sheets";

// Leaves time for the AI generation that runs after the response (see `after` below).
export const maxDuration = 60;

const MSG_DUPLICATE =
  "この連絡先からはすでに送信されています。ご利用はお一人様1回までです。 / Data dengan kontak ini sudah pernah dikirim. Layanan ini hanya bisa digunakan 1 kali per orang.";
const MSG_FAILED =
  "送信できませんでした。時間をおいてもう一度お試しください。 / Gagal mengirim. Silakan coba lagi beberapa saat lagi.";

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 60_000) return jsonError(MSG_FAILED, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(MSG_FAILED, 400);
  }

  // Honeypot field: real users never fill it.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, id: "R000000-00000" });
  }

  if (rateLimited(`submit:${clientIp(request)}`, 5, 10 * 60_000)) {
    return jsonError("送信回数が多すぎます。しばらくしてからお試しください。 / Terlalu banyak percobaan. Coba lagi nanti.", 429);
  }

  const result = validateProfile(body);
  if (!result.ok) {
    return jsonError("入力内容を確認してください。 / Silakan periksa kembali isian Anda.", 400, {
      errors: result.errors,
      step: result.step,
    });
  }
  const profile = result.data;

  try {
    if (!env.allowDuplicates()) {
      const existing = await findByContact(contactKey(profile), profile.email);
      if (existing) return jsonError(MSG_DUPLICATE, 409, { duplicate: true });
    }

    const now = new Date();
    const id = newSubmissionId(now);
    await recordSubmission(profile, id, now);

    // The answer is saved; AI generation and the résumé sheet are created after responding.
    const origin = requestOrigin(request);
    after(() => processSubmission(id, origin));

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("[submit]", e);
    return jsonError(MSG_FAILED, 500);
  }
}
