import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { validateBody, validateSearchParams } from "@/lib/api/validate";
import {
  buildPaginationMeta,
  parseLimit,
  parsePage,
} from "@/lib/config/pagination";
import { db } from "@/lib/db";
import { commandes } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import {
  createRestaurantOrder,
  RestaurantOrderError,
} from "@/modules/orders/server";
import { scheduleRestaurantOrderCreatedEffects } from "@/lib/orders/restaurant-order-effects";
import { createRestaurantOrderSchema } from "@/modules/orders/contracts";
import {
  checkRateLimit,
  clientApiLimiter,
  commandeClientLimiter,
} from "@/lib/rate-limit";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { initializePreparedPaystackPayment } from "@/modules/transactions/payment-service";
import { PaystackGatewayError } from "@/infrastructure/paystack/gateway";
import { restaurantOrderErrorResponse } from "./order-error-response";
import { recordDiscoveryConversion } from "@/modules/discovery/server";

const log = createLogger("v1-client-commandes");

const historiqueQuerySchema = z.object({
  search: z.string().trim().min(3).max(80).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// POST /api/v1/client/commandes — Passer une commande
export async function POST(request: NextRequest): Promise<Response> {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const clientId = session.clientId;

  const rl = await checkRateLimit(commandeClientLimiter, clientId);
  if (rl) return rl;

  const { data, error: vError } = await validateBody(
    request,
    createRestaurantOrderSchema,
  );
  if (vError) return vError;

  try {
    const {
      idempotencyKey,
      discoveryToken,
      paymentReturnChannel,
      ...input
    } = data;
    const result = await createRestaurantOrder({
      clientId,
      idempotencyKey,
      input,
    });
    const { commande } = result;
    if (result.created) {
      await recordDiscoveryConversion({
        token: discoveryToken,
        activityType: "restaurant",
        resourceId: commande.restaurantId,
        conversionReferenceId: commande.id,
      });
    }
    scheduleRestaurantOrderCreatedEffects(result);
    if (result.onlinePayment && !result.created && !result.onlinePayment.checkoutUrl) {
      return apiResponse.error(
        "Une tentative Paystack est encore en cours de vérification. Aucun nouvel Initialize n’a été envoyé.",
        "CONFLICT",
        { status: 409 },
      );
    }
    const initialized = result.onlinePayment
      ? await initializePreparedPaystackPayment({
          paymentId: result.onlinePayment.paymentId,
          owner: { clientId },
          returnChannel: paymentReturnChannel,
        })
      : null;

    log.info(
      {
        commandeId: commande.id,
        clientId,
        replayed: !result.created,
        payment: initialized
          ? { provider: "paystack", reference: initialized.reference, authorizationUrl: initialized.authorizationUrl }
          : { provider: null, reference: null, authorizationUrl: null },
      },
      "Commande client passée",
    );

    return apiResponse.success(
      {
        commande: {
          id: commande.id,
          numero: commande.numero,
          statut: commande.statut,
          total: commande.total,
          fraisLivraison: commande.fraisLivraison,
          sousTotal: commande.sousTotal,
          items: commande.items,
          modeCommande: commande.modeCommande,
          createdAt: commande.createdAt,
        },
        replayed: !result.created,
        payment: {
          authorizationUrl: initialized?.authorizationUrl ?? null,
          reference: initialized?.reference ?? null,
        },
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof RestaurantOrderError) {
      return restaurantOrderErrorResponse(err);
    }
    if (err instanceof PaystackGatewayError) {
      log.warn({ code: err.code }, "Échec Initialize Paystack");
      return apiResponse.error(err.message, "INTERNAL_ERROR", { status: 503 });
    }
    log.error({ err, clientId }, "Erreur création commande client");
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
  const { data: query, error: queryError } = validateSearchParams(
    searchParams,
    historiqueQuerySchema,
  );
  if (queryError) return queryError;
  const page = parsePage(query.page);
  const limit = parseLimit(query.limit, 10);
  const offset = (page - 1) * limit;

  try {
    const conditions = [eq(commandes.clientId, (await session).clientId)];
    if (query?.search) {
      conditions.push(ilike(commandes.numero, `%${query.search}%`));
    }
    const whereClause = and(...conditions);

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
        .where(whereClause)
        .orderBy(desc(commandes.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: count() })
        .from(commandes)
        .where(whereClause),
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
