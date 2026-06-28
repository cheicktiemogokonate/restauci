import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import {
  buildPaginationMeta,
  PAGINATION,
  parsePage,
} from "@/lib/config/pagination";
import { db } from "@/lib/db";
import { createCommande } from "@/lib/db/mutations";
import { clients, commandes, plats, restaurants } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  checkRateLimit,
  clientApiLimiter,
  commandeClientLimiter,
} from "@/lib/rate-limit";
import { formatPrix } from "@/lib/utils/format";
import { and, count, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";

const log = createLogger("v1-client-commandes");

const passerCommandeSchema = z
  .object({
    restaurantSlug: z.string().min(1),
    modeCommande: z.enum(["sur_place", "livraison", "emporter"]),
    items: z
      .array(
        z.object({
          platId: z.string().min(1),
          quantite: z.number().int().min(1).max(20),
        }),
      )
      .min(1, "Panier vide"),
    // Livraison
    adresseLivraison: z.string().max(500).optional(),
    latitudeLivraison: z.number().optional(),
    longitudeLivraison: z.number().optional(),
    // Sur place
    numeroTable: z.string().max(10).optional(),
    // Note
    noteClient: z.string().max(500).optional(),
  })
  .refine((d) => d.modeCommande !== "livraison" || !!d.adresseLivraison, {
    message: "Adresse de livraison requise",
    path: ["adresseLivraison"],
  });

// POST /api/v1/client/commandes — Passer une commande
export async function POST(request: NextRequest): Promise<Response> {
  const { session, error } = await getClientSession(request);
  if (error) return error;

  const rl = await checkRateLimit(
    commandeClientLimiter,
    (await session).clientId,
  );
  if (rl) return rl;

  const { data, error: vError } = await validateBody(
    request,
    passerCommandeSchema,
  );
  if (vError) return vError;

  try {
    // 1. Vérifier le restaurant
    const [restaurant] = await db
      .select({
        id: restaurants.id,
        actif: restaurants.actif,
        accepteCommandes: restaurants.accepteCommandes,
        fraisLivraison: restaurants.fraisLivraison,
        commandeMinimum: restaurants.commandeMinimum,
        modesCommande: restaurants.modesCommande,
      })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.slug, (await data).restaurantSlug),
          eq(restaurants.actif, true),
        ),
      )
      .limit(1);

    if (!restaurant) {
      return apiResponse.notFound("Restaurant");
    }

    if (!restaurant.accepteCommandes) {
      return apiResponse.error(
        "Ce restaurant n'accepte pas de commandes pour le moment",
        "BAD_REQUEST",
        { status: 400 },
      );
    }

    if (!restaurant.modesCommande?.includes((await data).modeCommande)) {
      return apiResponse.error(
        `Ce restaurant n'accepte pas les commandes en mode "${(await data).modeCommande}"`,
        "BAD_REQUEST",
        { status: 400 },
      );
    }

    // 2. Récupérer et vérifier les plats
    const platIds = (await data).items.map((i) => i.platId);

    const platsDB = await db
      .select({
        id: plats.id,
        nom: plats.nom,
        prix: plats.prix,
        disponible: plats.disponible,
        restaurantId: plats.restaurantId,
      })
      .from(plats)
      .where(
        and(inArray(plats.id, platIds), eq(plats.restaurantId, restaurant.id)),
      );

    // Vérifier que tous les plats existent et appartiennent au restaurant
    if (platsDB.length !== platIds.length) {
      return apiResponse.error(
        "Certains plats sont introuvables ou n'appartiennent pas à ce restaurant",
        "VALIDATION_ERROR",
        { status: 422 },
      );
    }

    // Vérifier la disponibilité
    const indisponibles = platsDB.filter((p) => !p.disponible);
    if (indisponibles.length > 0) {
      return apiResponse.error(
        `Ces plats ne sont plus disponibles : ${indisponibles.map((p) => p.nom).join(", ")}`,
        "VALIDATION_ERROR",
        { status: 422 },
      );
    }

    // 3. Calculer les montants (en centimes)
    const platsMap = new Map(platsDB.map((p) => [p.id, p]));

    const itemsCalcules = (await data).items.map((item) => {
      const plat = platsMap.get(item.platId)!;
      return {
        platId: item.platId,
        nom: plat.nom,
        prix: plat.prix,
        quantite: item.quantite,
      };
    });

    const sousTotal = itemsCalcules.reduce(
      (sum, item) => sum + item.prix * item.quantite,
      0,
    );

    const fraisLivraison =
      (await data).modeCommande === "livraison"
        ? (restaurant.fraisLivraison ?? 0)
        : 0;

    const total = sousTotal + fraisLivraison;

    // 4. Vérifier le minimum de commande
    if (restaurant.commandeMinimum && sousTotal < restaurant.commandeMinimum) {
      return apiResponse.error(
        `Commande minimum : ${formatPrix(restaurant.commandeMinimum)}`,
        "VALIDATION_ERROR",
        { status: 422 },
      );
    }

    // 5. Récupérer les infos du client
    const [client] = await db
      .select({ nom: clients.nom, telephone: clients.telephone })
      .from(clients)
      .where(eq(clients.id, (await session).clientId))
      .limit(1);

    if (!client) return apiResponse.notFound("Client");

    // 6. Créer la commande
    // Utilise la fonction existante dans mutations.ts
    // Elle déclenche automatiquement les notifications (Niveau 5)
    const commande = await createCommande({
      restaurantId: restaurant.id,
      clientId: (await session).clientId,
      modeCommande: (await data).modeCommande,
      nomClient: client.nom,
      telephoneClient: client.telephone,
      numeroTable: (await data).numeroTable,
      adresseLivraison: (await data).adresseLivraison,
      latitudeLivraison: (await data).latitudeLivraison,
      longitudeLivraison: (await data).longitudeLivraison,
      items: itemsCalcules,
      sousTotal,
      fraisLivraison,
      total,
      noteClient: (await data).noteClient,
    });

    log.info(
      { commandeId: commande.id, clientId: (await session).clientId, total },
      "Commande client passée",
    );

    return apiResponse.created({
      commande: {
        id: commande.id,
        numero: commande.numero,
        statut: commande.statut,
        total: commande.total,
        fraisLivraison: commande.fraisLivraison,
        sousTotal: commande.sousTotal,
        items: itemsCalcules,
        modeCommande: commande.modeCommande,
        createdAt: commande.createdAt,
      },
    });
  } catch (err) {
    log.error(
      { err, clientId: (await session).clientId },
      "Erreur création commande client",
    );
    return apiResponse.internalError();
  }
}

// GET /api/v1/client/commandes — Historique des commandes du client
export async function GET(request: NextRequest): Promise<Response> {
  const { session, error } = await getClientSession(request);
  if (error) return error;

  const rl = await checkRateLimit(clientApiLimiter, (await session).clientId);
  if (rl) return rl;

  const { searchParams } = new URL(request.url);
  const page = parsePage(searchParams.get("page") ?? undefined);
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "10", 10),
    PAGINATION.MAX_PAR_PAGE,
  );
  const offset = (page - 1) * limit;

  try {
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: commandes.id,
          numero: commandes.numero,
          statut: commandes.statut,
          total: commandes.total,
          modeCommande: commandes.modeCommande,
          items: commandes.items,
          createdAt: commandes.createdAt,
          restaurantId: commandes.restaurantId,
        })
        .from(commandes)
        .where(eq(commandes.clientId, (await session).clientId))
        .orderBy(commandes.createdAt) // desc via le type
        .limit(limit)
        .offset(offset),

      db
        .select({ total: count() })
        .from(commandes)
        .where(eq(commandes.clientId, (await session).clientId)),
    ]);

    return apiResponse.success(items, {
      meta: buildPaginationMeta(Number(total), page, limit),
    });
  } catch (err) {
    log.error(
      { err, clientId: (await session).clientId },
      "Erreur lecture historique commandes client",
    );
    return apiResponse.internalError();
  }
}
