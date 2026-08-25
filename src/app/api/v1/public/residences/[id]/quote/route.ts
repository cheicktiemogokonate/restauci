import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { residenceStaySchema } from "@/modules/residences/contracts";
import { ResidenceDomainError } from "@/modules/residences/model";
import { getResidenceStayQuote } from "@/modules/residences/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;
  const { data, error } = await validateBody(
    request,
    residenceStaySchema.omit({ residenceId: true }),
  );
  if (error) return error;
  try {
    return apiResponse.success(
      await getResidenceStayQuote({ ...data, residenceId: id }),
    );
  } catch (caught) {
    if (caught instanceof ResidenceDomainError) {
      return apiResponse.error(caught.message, "CONFLICT", { status: 409 });
    }
    return apiResponse.internalError();
  }
}
