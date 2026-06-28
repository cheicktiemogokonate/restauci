import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db }          from "@/lib/db";
import { users }       from "@/lib/db/schema";
import { eq }          from "drizzle-orm";

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
export async function getAdminSession(): Promise<AdminSession> {
  const session = await getCurrentUser();
  if (!session || !session.userId) redirect("/login");

  const [user] = await db
    .select({
      id:    users.id,
      nom:   users.nom,
      email: users.email,
      role:  users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.role !== "admin") {
    redirect("/restaurateur"); // pas admin → renvoyer vers son espace normal
  }

  return {
    userId: user.id,
    nom:    user.nom,
    email:  user.email,
    role:   "admin",
  };
}
