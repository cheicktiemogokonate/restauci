import "server-only";

import bcryptjs from "bcryptjs";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/infrastructure/env";
import {
  isOwnerSessionRevoked,
  isTokenBlacklisted,
} from "@/infrastructure/auth/revocation";
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
  verifyWebSessionToken,
} from "@/infrastructure/auth/tokens";
import { verifyAdminMfa } from "@/infrastructure/auth/admin-mfa";
import type { JWTPayload } from "@/types";
import type { LoginInput, RegisterInput } from "./contracts";
import type { PartnerCredentialResult } from "./model";
import {
  findActiveUserIdentity,
  findUserCredentialsByEmail,
  insertPartnerUser,
} from "./_internal/persistence";

const BCRYPT_SALT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH =
  "$2b$12$uTgttD2C7DC66CkZOWNP..p1.dVZb72d./VYmD08jia4VsjYPs3O2";

export { verifyAdminMfa } from "@/infrastructure/auth/admin-mfa";
export {
  AUTH_COOKIE_NAME,
  createSessionId,
  signClientAccessToken,
  signClientRefreshToken,
  signDriverAccessToken,
  signDriverActivationToken,
  signDriverRefreshToken,
  signPartnerAccessToken,
  signPartnerRefreshToken,
  signWebSessionToken,
  verifyClientAccessToken,
  verifyClientRefreshToken,
  verifyDriverAccessToken,
  verifyDriverActivationToken,
  verifyDriverRefreshToken,
  verifyPartnerAccessToken,
  verifyPartnerRefreshToken,
  verifyWebSessionToken,
} from "@/infrastructure/auth/tokens";

export function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, BCRYPT_SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function authenticatePartnerCredentials(
  input: LoginInput,
  options: { enforceAdminMfa?: boolean } = {},
): Promise<PartnerCredentialResult> {
  const user = await findUserCredentialsByEmail(input.email);
  const passwordValid = await comparePassword(
    input.password,
    user?.password ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !passwordValid) return { status: "invalid_credentials" };
  if (user.suspendu) return { status: "suspended", userId: user.id };

  if (user.role === "admin" && options.enforceAdminMfa !== false) {
    const mfa = await verifyAdminMfa(user.id, input.otp);
    if (mfa !== "ok" && mfa !== "disabled") {
      return {
        status: `mfa_${mfa.replace("-", "_")}` as Exclude<
          PartnerCredentialResult["status"],
          "authenticated" | "invalid_credentials" | "suspended"
        >,
        userId: user.id,
      };
    }
  }

  return {
    status: "authenticated",
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
    },
  };
}

export async function registerPartnerCredentials(input: RegisterInput) {
  const existing = await findUserCredentialsByEmail(input.email);
  if (existing) {
    await hashPassword(input.password);
    return { alreadyRegistered: true as const, user: null };
  }
  const user = await insertPartnerUser({
    id: crypto.randomUUID(),
    email: input.email,
    passwordHash: await hashPassword(input.password),
    nom: input.nom,
    telephone: input.telephone,
  });
  return { alreadyRegistered: false as const, user };
}

export async function getActivePartnerUserIdentity(userId: string) {
  const user = await findActiveUserIdentity(userId);
  if (!user || user.suspendu) return null;
  return {
    id: user.id,
    email: user.email,
    nom: user.nom,
    role: user.role,
  };
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyWebSessionToken(token);
    if (!payload) return null;
    if (
      (await isTokenBlacklisted(token)) ||
      (await isOwnerSessionRevoked("user", payload.userId, payload.issuedAtMs))
    ) {
      return null;
    }
    const user = await getActivePartnerUserIdentity(payload.userId);
    return user
      ? { userId: user.id, email: user.email, role: user.role }
      : null;
  } catch (error) {
    if (env.NODE_ENV !== "production") {
      console.warn(
        "[auth] Restauration de session web impossible:",
        error instanceof Error ? error.message : "Erreur inconnue",
      );
    }
    return null;
  }
}

export interface AdminSession {
  userId: string;
  nom: string;
  email: string;
  role: "admin";
}

export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/restaurateur");

  const user = await getActivePartnerUserIdentity(session.userId);
  if (!user || user.role !== "admin") redirect("/restaurateur");

  return {
    userId: user.id,
    nom: user.nom,
    email: user.email,
    role: "admin",
  };
});

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
    priority: "high",
  });
  if (AUTH_COOKIE_NAME !== LEGACY_AUTH_COOKIE_NAME) {
    cookieStore.set(LEGACY_AUTH_COOKIE_NAME, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  for (const name of new Set([AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME])) {
    cookieStore.set(name, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      priority: "high",
    });
  }
}
