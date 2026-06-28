import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, clientApiLimiter } from "@/lib/rate-limit";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-auth-me");

// GET /api/v1/client/auth/me
export async function GET(req: NextRequest) {
  const { session, error } = await getClientSession(req);
  if (error) return error;

  try {
    const [client] = await db
      .select({
        id: clients.id,
        nom: clients.nom,
        telephone: clients.telephone,
        email: clients.email,
        adresseDefaut: clients.adresseDefaut,
        latitudeDefaut: clients.latitudeDefaut,
        longitudeDefaut: clients.longitudeDefaut,
        nombreCommandes: clients.nombreCommandes,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(eq(clients.id, session.clientId))
      .limit(1);

    if (!client) return apiResponse.notFound("Client");

    return apiResponse.success(client);
  } catch (err) {
    log.error(
      { err, clientId: session.clientId },
      "Erreur lecture profil client",
    );
    return apiResponse.internalError();
  }
}

// PATCH /api/v1/client/auth/me
const updateSchema = z
  .object({
    nom: z.string().min(2).max(255).optional(),
    email: z.string().email().optional().nullable(),
    adresseDefaut: z.string().max(500).optional().nullable(),
    latitudeDefaut: z.number().optional().nullable(),
    longitudeDefaut: z.number().optional().nullable(),
    // Changement de mot de passe
    ancienPassword: z.string().optional(),
    nouveauPassword: z.string().min(6).max(100).optional(),
  })
  .refine((d) => !(d.nouveauPassword && !d.ancienPassword), {
    message: "L'ancien mot de passe est requis",
    path: ["ancienPassword"],
  });

export async function PATCH(req: NextRequest) {
  const { session, error } = await getClientSession(req);
  if (error) return error;

  const rl = await checkRateLimit(clientApiLimiter, session.clientId);
  if (rl) return rl;

  const { data, error: vError } = await validateBody(req, updateSchema);
  if (vError) return vError;

  try {
    const updateData: Partial<typeof clients.$inferInsert> = {};

    if (data.nom) updateData.nom = data.nom;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.adresseDefaut !== undefined)
      updateData.adresseDefaut = data.adresseDefaut;
    if (data.latitudeDefaut !== undefined)
      updateData.latitudeDefaut = data.latitudeDefaut;
    if (data.longitudeDefaut !== undefined)
      updateData.longitudeDefaut = data.longitudeDefaut;

    // Changement de mot de passe
    if (data.nouveauPassword && data.ancienPassword) {
      const [client] = await db
        .select({ password: clients.password })
        .from(clients)
        .where(eq(clients.id, session.clientId))
        .limit(1);

      if (!client?.password) return apiResponse.notFound("Client");

      const { compare } = await import("bcryptjs");
      const valid = await compare(data.ancienPassword, client.password);
      if (!valid) {
        return apiResponse.error(
          "Ancien mot de passe incorrect",
          "VALIDATION_ERROR",
          { status: 422 },
        );
      }

      updateData.password = await hash(data.nouveauPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return apiResponse.error("Aucune donnée à mettre à jour", "BAD_REQUEST");
    }

    updateData.updatedAt = new Date();

    await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, session.clientId));

    return apiResponse.success({ message: "Profil mis à jour" });
  } catch (err) {
    log.error(
      { err, clientId: session.clientId },
      "Erreur mise à jour profil client",
    );
    return apiResponse.internalError();
  }
}
