import "server-only";
import { createHash } from "node:crypto";

function read(name: string): string {
  const raw = process.env[name];
  if (!raw) return "";
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

function required(name: string): string {
  const v = read(name);
  if (!v) throw new ConfigError(`環境変数 ${name} が設定されていません`);
  return v;
}

type ServiceAccount = { email: string; privateKey: string };

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

export function getServiceAccount(): ServiceAccount {
  const json = read("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (json) {
    try {
      const text = json.startsWith("{") ? json : Buffer.from(json, "base64").toString("utf8");
      const parsed = JSON.parse(text) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { email: parsed.client_email, privateKey: normalizePrivateKey(parsed.private_key) };
      }
    } catch {
      throw new ConfigError("GOOGLE_SERVICE_ACCOUNT_JSON を JSON として読み込めませんでした");
    }
    throw new ConfigError("GOOGLE_SERVICE_ACCOUNT_JSON に client_email / private_key がありません");
  }
  return {
    email: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: normalizePrivateKey(required("GOOGLE_PRIVATE_KEY")),
  };
}

export function getServiceAccountEmail(): string {
  try {
    return getServiceAccount().email;
  } catch {
    return "";
  }
}

export const env = {
  openaiApiKey: () => required("OPENAI_API_KEY"),
  openaiModel: () => read("OPENAI_MODEL") || "gpt-4o-mini",
  ttsModel: () => read("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts",
  ttsVoice: () => read("OPENAI_TTS_VOICE") || "coral",
  spreadsheetId: () => required("GOOGLE_SPREADSHEET_ID"),
  adminPassword: () => read("ADMIN_PASSWORD"),
  blobToken: () => read("BLOB_READ_WRITE_TOKEN"),
  blobAccess: (): "public" | "private" => (read("BLOB_ACCESS") === "private" ? "private" : "public"),
  baseUrl: () => read("APP_BASE_URL").replace(/\/+$/, ""),
  allowDuplicates: () => read("ALLOW_DUPLICATE_SUBMISSIONS").toLowerCase() === "true",
  hasAppSecret: () => read("APP_SECRET").length >= 16,
};

/**
 * Secret used to sign admin sessions and learner links.
 * Falls back to a value derived from the service account key so the app still
 * works before APP_SECRET is configured (the setup page warns about this).
 */
export function appSecret(): string {
  const s = read("APP_SECRET");
  if (s) return s;
  const seed = read("GOOGLE_PRIVATE_KEY") || read("GOOGLE_SERVICE_ACCOUNT_JSON") || read("ADMIN_PASSWORD");
  if (!seed) throw new ConfigError("環境変数 APP_SECRET が設定されていません");
  return createHash("sha256").update(`rirekisho-fallback:${seed}`).digest("base64url");
}

export function configStatus() {
  let googleOk = false;
  let googleError = "";
  try {
    getServiceAccount();
    googleOk = true;
  } catch (e) {
    googleError = e instanceof Error ? e.message : String(e);
  }
  return {
    openai: Boolean(read("OPENAI_API_KEY")),
    openaiModel: env.openaiModel(),
    ttsModel: env.ttsModel(),
    ttsVoice: env.ttsVoice(),
    google: googleOk,
    googleError,
    serviceAccountEmail: getServiceAccountEmail(),
    spreadsheet: Boolean(read("GOOGLE_SPREADSHEET_ID")),
    adminPassword: Boolean(read("ADMIN_PASSWORD")),
    appSecret: env.hasAppSecret(),
    blob: Boolean(read("BLOB_READ_WRITE_TOKEN")),
    blobAccess: env.blobAccess(),
    baseUrl: env.baseUrl(),
    allowDuplicates: env.allowDuplicates(),
  };
}
