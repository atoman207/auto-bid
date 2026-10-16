import { after, NextResponse } from "next/server";
import { aiErrorCode, generateContent, isAiSetupProblem } from "@/lib/ai";
import { buildDemoResult } from "@/lib/demo";
import { demoMode, env, sheetsConfigured } from "@/lib/env";
import { storageErrorCode } from "@/lib/google";
import { clientIp, jsonError, rateLimited, requestOrigin } from "@/lib/http";
import { bi } from "@/lib/i18n";
import { newSubmissionId, processSubmission, recordSubmission, saveGeneratedSubmission } from "@/lib/pipeline";
import { residenceDescription } from "@/lib/resume";
import { contactKey, validateProfile } from "@/lib/schema";
import { findByContact } from "@/lib/sheets";

// The demo generates while the person waits; the normal flow generates after responding.
export const maxDuration = 60;

const MSG_DUPLICATE = bi(
  "この連絡先からはすでに送信されています。ご利用はお一人様1回までです。",
  "Data dengan kontak ini sudah pernah dikirim. Layanan ini hanya bisa digunakan 1 kali per orang.",
);
const MSG_FAILED = bi("送信できませんでした。時間をおいてもう一度お試しください。", "Gagal mengirim. Silakan coba lagi beberapa saat lagi.");
const MSG_SETUP = bi(
  "システムの設定に問題があるため、送信できませんでした。入力内容はこの端末に保存されています。お手数ですが担当者にご連絡ください。",
  "Data belum bisa dikirim karena ada masalah pada pengaturan sistem. Isian Anda tersimpan di perangkat ini. Silakan hubungi staf kami.",
);
const MSG_AI_BUSY = bi(
  "AIが混み合っているため作成できませんでした。少し待ってからもう一度お試しください。入力内容は保存されています。",
  "AI sedang sibuk sehingga teks belum bisa dibuat. Silakan coba lagi sebentar lagi. Isian Anda tetap tersimpan.",
);

export async function POST(request: Request) {
  const started = Date.now();
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

  const demo = demoMode();
  if (rateLimited(`submit:${clientIp(request)}`, demo ? 10 : 5, 10 * 60_000)) {
    return jsonError(bi("送信回数が多すぎます。しばらくしてからお試しください。", "Terlalu banyak percobaan. Coba lagi nanti."), 429);
  }

  const result = validateProfile(body);
  if (!result.ok) {
    return jsonError(bi("入力内容を確認してください。", "Silakan periksa kembali isian Anda."), 400, {
      errors: result.errors,
      step: result.step,
    });
  }
  const profile = result.data;
  const origin = requestOrigin(request);
  const now = new Date();

  // ---- Demo: generate now and return the result to show on screen.
  if (demo) {
    let ai;
    try {
      ai = await generateContent(profile, now, residenceDescription(profile), started + 55_000);
    } catch (e) {
      const code = aiErrorCode(e);
      console.error(`[submit/demo] AI generation failed (${code}):`, e);
      const setup = isAiSetupProblem(code);
      return jsonError(setup ? MSG_SETUP : MSG_AI_BUSY, setup ? 500 : 503, { code });
    }
    const id = newSubmissionId(now);
    const save = sheetsConfigured();
    if (save) after(() => saveGeneratedSubmission(id, profile, ai, now, origin));
    return NextResponse.json({ ok: true, demo: true, id, result: buildDemoResult(profile, ai, now, id, save) });
  }

  // ---- Normal: save the answers, then generate in the background.
  try {
    if (!env.allowDuplicates()) {
      const existing = await findByContact(contactKey(profile), profile.email);
      if (existing) return jsonError(MSG_DUPLICATE, 409, { duplicate: true });
    }

    const id = newSubmissionId(now);
    await recordSubmission(profile, id, now);

    // The answer is saved; AI generation and the résumé sheet are created after responding.
    after(() => processSubmission(id, origin));

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const code = storageErrorCode(e);
    console.error(`[submit] could not save the submission (${code}):`, e);
    const busy = code === "SHEETS_BUSY";
    return jsonError(busy ? MSG_FAILED : MSG_SETUP, busy ? 503 : 500, { code });
  }
}
