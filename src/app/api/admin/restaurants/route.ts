import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await pool.query(
    `SELECT r.id, r.nom, r.slug, r.actif, COUNT(c.id)::int AS commandes_count
     FROM restaurants r
     LEFT JOIN commandes c ON c.restaurant_id = r.id
     GROUP BY r.id
     ORDER BY r.nom`
  )

  return NextResponse.json(result.rows)
}
