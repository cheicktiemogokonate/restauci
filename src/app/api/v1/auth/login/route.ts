import { getClientIp } from "@/lib/api/client-ip";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, mobileAuthLimiter } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validations/auth";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

// Adapte ces imports selon ta lib auth existante
import { comparePassword } from "@/lib/auth";
import { SignJWT } from "jose";

const log = createLogger("v1-auth-login");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
  // Optionnel : identifiant de l'appareil pour les notifications push
  deviceToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit par IP
  const ip = getClientIp(request);
  const rl = await checkRateLimit(mobileAuthLimiter, ip);
  if (rl) return rl;

  // Validation du body
  const { data, error } = await validateBody(request, loginSchema);
  if (error) return error;

  try {
    const { email, password, rememberMe } = data;

    // Chercher l'utilisateur
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        nom: users.nom,
        role: users.role,
        emailVerifie: users.emailVerifie,
        suspendu: users.suspendu,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Même message pour email inconnu et mauvais mot de passe
      // (évite l'énumération d'emails)
      log.warn({ email }, "Tentative de connexion — utilisateur inconnu");
      return apiResponse.unauthorized("Email ou mot de passe incorrect");
    }

    // Vérifier le mot de passe
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      log.warn(
        { userId: user.id },
        "Tentative de connexion — mauvais mot de passe",
      );
      return apiResponse.unauthorized("Email ou mot de passe incorrect");
    }

    // Bloquer les comptes suspendus après vérification du mot de passe
    // (pas d'énumération : le message ne fuit que si les credentials sont valides)
    if (user.suspendu) {
      log.warn({ userId: user.id }, "Tentative de connexion — compte suspendu");
      return apiResponse.forbidden("Compte suspendu. Contactez le support.");
    }

    // Générer les tokens avec expiration personnalisée.
    // Les deux tokens sont typés : un refresh ne peut PAS être utilisé comme
    // access token (getMobileSession exige type="access") et réciproquement
    // (le refresh exige type="refresh"). Le rôle n'est JAMAIS mis dans le
    // refresh token : il est relu en base à chaque refresh.
    const accessTokenExpiry = rememberMe ? "30d" : "24h";
    const refreshTokenExpiry = rememberMe ? "90d" : "7d";
    const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

    const [accessToken, refreshToken] = await Promise.all([
      new SignJWT({ userId: user.id, role: user.role, type: "access" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(accessTokenExpiry)
        .sign(JWT_SECRET),
      new SignJWT({ userId: user.id, type: "refresh" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(refreshTokenExpiry)
        .sign(JWT_SECRET),
    ]);

    log.info({ userId: user.id }, "Connexion mobile réussie");

    return apiResponse.success({
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: rememberMe ? 30 * 24 * 3600 : 24 * 3600,
      },
    });
  } catch (err) {
    log.error({ err }, "Erreur login mobile");
    return apiResponse.internalError();
  }
}
