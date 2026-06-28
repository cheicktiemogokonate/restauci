import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { apiLogger } from "@/lib/loggers"

export async function GET() {
  const session = await getCurrentUser()
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

   try {
     const result = await pool.query(
       `SELECT r.id, r.nom, r.slug, r.actif, COUNT(c.id)::int AS commandes_count
        FROM restaurants r
        LEFT JOIN commandes c ON c.restaurant_id = r.id
        GROUP BY r.id
        ORDER BY r.nom`
     );
     return NextResponse.json(result.rows);
   } catch (error) {
     apiLogger.error({ 
       error: error instanceof Error ? error.message : "Unknown error",
       stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
     }, "[GET /api/admin/restaurants] error");
     return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
   }
}
