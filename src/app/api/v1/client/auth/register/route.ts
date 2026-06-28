import { NextRequest }              from "next/server";
import { z }                        from "zod";
import { hash }                     from "bcryptjs";
import { apiResponse }              from "@/lib/api/response";
import { validateBody }             from "@/lib/api/validate";
import { checkRateLimit, clientAuthLimiter } from "@/lib/rate-limit";
import { db }                       from "@/lib/db";
import { clients }                  from "@/lib/db/schema";
import { eq, or }                   from "drizzle-orm";
import { signToken }                from "@/lib/auth";
import { createLogger }             from "@/lib/logger";

const log = createLogger("v1-client-register");

const registerSchema = z.object({
  nom:       z.string().min(2, "Nom trop court").max(255),
  telephone: z.string()
    .regex(/^\+?[0-9\s]{8,20}$/, "Numéro de téléphone invalide"),
  email:    z.string().email("Email invalide").optional(),
  password: z.string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .max(100),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const rl  = await checkRateLimit(clientAuthLimiter, ip);
  if (rl) return rl;

  const { data, error } = await validateBody(req, registerSchema);
  if (error) return error;

  try {
    // Vérifier unicité téléphone (et email si fourni)
    const conditions = [eq(clients.telephone, data.telephone)];
    if (data.email) conditions.push(eq(clients.email, data.email));

    const existing = await db
      .select({ id: clients.id, telephone: clients.telephone })
      .from(clients)
      .where(or(...conditions))
      .limit(1);

    if (existing.length > 0) {
      return apiResponse.error(
        "Un compte existe déjà avec ce numéro de téléphone",
        "CONFLICT",
        { status: 409 },
      );
    }

    const passwordHash = await hash(data.password, 12);

    const [client] = await db
      .insert(clients)
      .values({
        nom:       data.nom,
        telephone: data.telephone,
        email:     data.email ?? null,
        password:  passwordHash,
      })
      .returning({
        id:        clients.id,
        nom:       clients.nom,
        telephone: clients.telephone,
        email:     clients.email,
      });

    const [accessToken, refreshToken] = await Promise.all([
      signToken({ clientId: client.id, type: "client" }, "24h"),
      signToken({ clientId: client.id, type: "client-refresh" }, "30d"),
    ]);

    log.info({ clientId: client.id }, "Nouveau client inscrit");

    return apiResponse.created({
      client,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 24 * 3600,
      },
    });
  } catch (err) {
    log.error({ err }, "Erreur inscription client");
    return apiResponse.internalError();
  }
}
