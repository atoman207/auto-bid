import "server-only";
import { auth, sheets, type sheets_v4 } from "@googleapis/sheets";
import { ConfigError, env, getServiceAccount } from "./env";

let cached: { key: string; api: sheets_v4.Sheets } | null = null;

export function sheetsApi(): sheets_v4.Sheets {
  const sa = getServiceAccount();
  const key = `${sa.email}:${sa.privateKey.length}`;
  if (cached?.key === key) return cached.api;
  const jwt = new auth.JWT({
    email: sa.email,
    key: sa.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const api = sheets({ version: "v4", auth: jwt, timeout: 30_000 });
  cached = { key, api };
  return api;
}

export function spreadsheetId(): string {
  return env.spreadsheetId();
}

function statusOf(e: unknown): number {
  const err = e as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  const candidates = [err?.response?.status, err?.status, err?.code];
  for (const c of candidates) {
    const n = typeof c === "string" ? Number(c) : c;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return 0;
}

export function googleErrorMessage(e: unknown): string {
  const status = statusOf(e);
  const err = e as { message?: string; response?: { data?: { error?: { message?: string } } } };
  const detail = err?.response?.data?.error?.message || err?.message || String(e);
  if (status === 403) {
    return `Google スプレッドシートへのアクセスが拒否されました。スプレッドシートをサービスアカウントに「編集者」として共有してください。（${detail}）`;
  }
  if (status === 404) return `スプレッドシートが見つかりません。GOOGLE_SPREADSHEET_ID を確認してください。（${detail}）`;
  if (status === 429) return `Google API の利用上限に達しました。しばらく待ってから再度お試しください。（${detail}）`;
  return detail;
}

/** Runs a Sheets call, retrying on rate limits and transient server errors. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ConfigError) throw e;
      lastError = e;
      const status = statusOf(e);
      const code = (e as { code?: unknown })?.code;
      const network = typeof code === "string" && /^(E[A-Z]+|ECONN\w+)$/.test(code);
      const retryable = status === 429 || status >= 500 || (status === 0 && network);
      if (!retryable || i === attempts - 1) break;
      const delay = Math.min(16_000, 1000 * 2 ** i) + Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new GoogleApiError(googleErrorMessage(lastError), statusOf(lastError));
}

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

// ---------------------------------------------------------------- small helpers

export type Color = { red: number; green: number; blue: number };

export function hex(color: string): Color {
  const c = color.replace("#", "");
  return {
    red: parseInt(c.slice(0, 2), 16) / 255,
    green: parseInt(c.slice(2, 4), 16) / 255,
    blue: parseInt(c.slice(4, 6), 16) / 255,
  };
}

export function quoteSheet(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export function columnLetter(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function sheetUrl(sheetId: number): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/edit#gid=${sheetId}`;
}

export function pdfUrl(sheetId: number, range?: string): string {
  const params = new URLSearchParams({
    format: "pdf",
    gid: String(sheetId),
    size: "A4",
    portrait: "true",
    fitw: "true",
    gridlines: "false",
    printtitle: "false",
    sheetnames: "false",
    pagenum: "UNDEFINED",
    horizontal_alignment: "CENTER",
    top_margin: "0.4",
    bottom_margin: "0.4",
    left_margin: "0.4",
    right_margin: "0.4",
  });
  if (range) params.set("range", range);
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId()}/export?${params.toString()}`;
}
