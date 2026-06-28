import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
  if (!session || !session.userId) {
    return { session: null, error: apiResponse.unauthorized() };
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    return {
      session: null,
      error: apiResponse.forbidden("Accès réservé aux administrateurs"),
    };
  }

  return { session: { userId: user.id, role: "admin" }, error: null };
}
