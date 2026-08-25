import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { recordDiscoveryEventSchema } from "@/modules/discovery/contracts";
import { recordDiscoveryDetailOpen } from "@/modules/discovery/server";

export async function POST(request: NextRequest) {
  const { data, error } = await validateBody(
    request,
    recordDiscoveryEventSchema,
  );
  if (error) return error;

  const recorded = await recordDiscoveryDetailOpen(data.token);
  return apiResponse.success({ recorded });
}
