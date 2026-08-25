import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { ResidenceDomainError } from "@/modules/residences/model";
import { cancelClientResidenceReservation } from "@/modules/residences/server";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  try {
    return apiResponse.success(
      await cancelClientResidenceReservation(
        session.clientId,
        (await params).id,
      ),
    );
  } catch (caught) {
    if (caught instanceof ResidenceDomainError) {
      return apiResponse.error(caught.message, "CONFLICT", { status: 409 });
    }
    return apiResponse.internalError();
  }
}
