import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidSession } from "./session";

export { ADMIN_COOKIE, checkPassword, createSessionValue, isValidSession } from "./session";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(ADMIN_COOKIE)?.value);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new UnauthorizedError();
}
