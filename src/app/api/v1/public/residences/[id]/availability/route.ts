import { apiResponse } from "@/lib/api/response";
import { getPublicResidenceAvailability } from "@/modules/residences/server";
import { ResidenceDomainError } from "@/modules/residences/model";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return apiResponse.success(
      await getPublicResidenceAvailability((await params).id),
    );
  } catch (error) {
    if (error instanceof ResidenceDomainError) {
      return apiResponse.error(error.message, "NOT_FOUND", { status: 404 });
    }
    return apiResponse.internalError();
  }
}
