import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { signToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientAuthLimiter } from "@/lib/rate-limit";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { setClientRefreshCookie } from "@/lib/api/client-session-cookie";

const log = createLogger("v1-client-login");

const loginSchema = z.object({
  telephone: z.string().min(8),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const rl = await checkRateLimit(clientAuthLimiter, ip);
  if (rl) return rl;

  const { data, error } = await validateBody(req, loginSchema);
  if (error) return error;

  try {
    const [client] = await db
      .select({
        id: clients.id,
        nom: clients.nom,
        telephone: clients.telephone,
        email: clients.email,
        password: clients.password,
        actif: clients.actif,
      })
      .from(clients)
      .where(eq(clients.telephone, data.telephone))
      .limit(1);

    // Message générique pour éviter l'énumération
    const erreurGenerique = "Numéro de téléphone ou mot de passe incorrect";

    if (!client || !client.password) {
      return apiResponse.unauthorized(erreurGenerique);
    }

    if (!client.actif) {
      return apiResponse.error(
        "Votre compte a été désactivé. Contactez le support.",
        "FORBIDDEN",
        { status: 403 },
      );
    }

    const isValid = await compare(data.password, client.password);
    if (!isValid) {
      log.warn({ clientId: client.id }, "Mauvais mot de passe client");
      return apiResponse.unauthorized(erreurGenerique);
    }

    const accessExpiry = "15m";
    const refreshExpiry = data.rememberMe ? "30d" : "7d";
    const refreshMaxAge = data.rememberMe ? 30 * 24 * 3600 : 7 * 24 * 3600;

    const [accessToken, refreshToken] = await Promise.all([
      signToken({ clientId: client.id, type: "client" }, accessExpiry),
      signToken({ clientId: client.id, type: "client-refresh" }, refreshExpiry),
    ]);

    log.info({ clientId: client.id }, "Client connecté");

    // Ne pas retourner le hash du mot de passe
    const { password: _password, ...clientSafe } = client;
    void _password;

    const response = apiResponse.success({
      client: clientSafe,
      tokens: {
        accessToken,
        expiresIn: 15 * 60,
      },
    });
    setClientRefreshCookie(response, refreshToken, refreshMaxAge);
    return response;
  } catch (err) {
    log.error({ err }, "Erreur lors de la connexion client");
    return apiResponse.internalError();
  }
}
