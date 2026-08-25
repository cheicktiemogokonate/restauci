import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { createResidenceReservationSchema } from "@/modules/residences/contracts";
import { ResidenceDomainError } from "@/modules/residences/model";
import {
  createResidenceReservation,
  listClientResidenceReservations,
} from "@/modules/residences/server";
import { PaystackGatewayError } from "@/infrastructure/paystack/gateway";
import { NextRequest } from "next/server";
import { z } from "zod";

const createClientResidenceReservationSchema =
  createResidenceReservationSchema.extend({
    paymentReturnChannel: z.enum(["web", "mobile"]).default("web"),
  });

export async function GET(request: NextRequest) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  return apiResponse.success(
    await listClientResidenceReservations(session.clientId),
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const { data, error: bodyError } = await validateBody(
    request,
    createClientResidenceReservationSchema,
  );
  if (bodyError) return bodyError;
  try {
    const { paymentReturnChannel, ...reservationInput } = data;
    return apiResponse.created(
      await createResidenceReservation(session.clientId, reservationInput, {
        returnChannel: paymentReturnChannel,
      }),
    );
  } catch (caught) {
    if (caught instanceof ResidenceDomainError) {
      return apiResponse.error(caught.message, "CONFLICT", { status: 409 });
    }
    if (caught instanceof PaystackGatewayError) {
      return apiResponse.error(caught.message, "INTERNAL_ERROR", { status: 503 });
    }
    console.error("[residence-reservation] Création refusée", caught);
    return apiResponse.internalError();
  }
}
