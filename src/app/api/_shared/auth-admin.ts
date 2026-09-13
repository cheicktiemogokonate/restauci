import { getCurrentUser } from "@/modules/auth/server";
import type { NextRequest } from "next/server";
import { apiResponse } from "./response";

export interface AdminApiSession {
  userId: string;
  role: "admin";
}

/**
 * Vérifie que la requête vient d'un admin authentifié.
 * Utilise la session cookie (pas Bearer — l'admin utilise le
 * dashboard web, pas l'app mobile).
 */
export async function requireAdminSession(
  req: NextRequest,
): Promise<
  { session: AdminApiSession; error: null } | { session: null; error: Response }
> {
  void req;
  const session = await getCurrentUser();
  if (!session) {
    return { session: null, error: apiResponse.unauthorized() };
  }

  if (session.role !== "admin") {
    return {
      session: null,
      error: apiResponse.forbidden("Accès réservé aux administrateurs"),
    };
  }

  return { session: { userId: session.userId, role: "admin" }, error: null };
}
