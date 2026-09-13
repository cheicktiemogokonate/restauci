import { z } from "zod";
import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { retryClientResidencePayment } from "@/modules/residences/server";
import { NextRequest } from "next/server";

const schema = z
  .object({
    method: z.enum(["mobile_money", "card"]),
    paymentReturnChannel: z.enum(["web", "mobile"]).default("web"),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const { data, error: bodyError } = await validateBody(request, schema);
  if (bodyError) return bodyError;
  try {
    return apiResponse.success(
      await retryClientResidencePayment({
        clientId: session.clientId,
        reservationId: (await params).id,
        paymentMethod: data.method,
        returnChannel: data.paymentReturnChannel,
      }),
    );
  } catch (caught) {
    return apiResponse.error(
      caught instanceof Error ? caught.message : "Paiement impossible",
      "CONFLICT",
      { status: 409 },
    );
  }
}
