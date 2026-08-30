import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { withDatabaseReadRetry } from "@/lib/db/read-retry";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AdminSession {
  userId: string;
  nom:    string;
  email:  string;
  role:   "admin";
}

/**
 * À appeler en tête de chaque Server Component du module admin.
 * Redirige automatiquement si la session est manquante ou si le
 * rôle n'est pas admin.
 */
export const getAdminSession = cache(async (): Promise<AdminSession> => {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [user] = await withDatabaseReadRetry(() =>
    db
      .select({
        id: users.id,
        nom: users.nom,
        email: users.email,
        role: users.role,
        suspendu: users.suspendu,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1),
  );

  if (!user || user.suspendu || user.role !== "admin") {
    redirect("/restaurateur"); // pas admin → renvoyer vers son espace normal
  }

  return {
    userId: user.id,
    nom: user.nom,
    email: user.email,
    role: "admin",
  };
});
