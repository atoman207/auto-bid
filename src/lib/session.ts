import "server-only";
import { hmac, safeEqual, sha256 } from "./crypto";
import { env } from "./env";

export const ADMIN_COOKIE = "rk_admin";
const SESSION_DAYS = 14;

/** The signature also covers the password, so changing it logs everyone out. */
function sign(exp: number): string {
  return hmac("admin-session", `${exp}:${sha256(env.adminPassword())}`, 43);
}

export function createSessionValue(): { value: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const exp = Date.now() + maxAge * 1000;
  return { value: `v1.${exp}.${sign(exp)}`, maxAge };
}

export function isValidSession(value: string | undefined | null): boolean {
  if (!value || !env.adminPassword()) return false;
  const [v, expStr, sig] = value.split(".");
  if (v !== "v1" || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  try {
    return safeEqual(sign(exp), sig);
  } catch {
    return false;
  }
}

export function checkPassword(input: string): boolean {
  const expected = env.adminPassword();
  if (!expected) return false;
  return safeEqual(sha256(input), sha256(expected));
}
