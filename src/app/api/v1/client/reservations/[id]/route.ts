import { getClientSession } from "@/app/api/_shared/auth-client";
import { apiResponse } from "@/app/api/_shared/response";
import { getClientResidenceReservation } from "@/modules/residences/server";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const reservation = await getClientResidenceReservation(
    session.clientId,
    (await params).id,
  );
  return reservation
    ? apiResponse.success(reservation)
    : apiResponse.notFound("Réservation");
}
