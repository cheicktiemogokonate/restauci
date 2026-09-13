import "server-only";

import { consumeAdminTotp } from "@/infrastructure/auth/revocation";
import { env } from "@/infrastructure/env";
import { verifyTotp } from "./totp";

export type AdminMfaResult =
  | "ok"
  | "disabled"
  | "not-configured"
  | "invalid"
  | "unavailable";

export async function verifyAdminMfa(
  userId: string,
  code: string | undefined,
): Promise<AdminMfaResult> {
  if (!env.ADMIN_MFA_REQUIRED) return "disabled";
  if (!env.ADMIN_TOTP_SECRET) return "not-configured";
  if (!code) return "invalid";

  const counter = verifyTotp(code, env.ADMIN_TOTP_SECRET);
  if (counter === null) return "invalid";

  try {
    return (await consumeAdminTotp(userId, counter)) ? "ok" : "invalid";
  } catch {
    return "unavailable";
  }
}
