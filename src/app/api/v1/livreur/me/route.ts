import { NextRequest } from "next/server";
import { requireDriverSession } from "@/app/api/_shared/auth-driver";
import { apiResponse } from "@/app/api/_shared/response";
import { createLogger } from "@/infrastructure/logger";
import { checkRateLimit, mobileApiLimiter } from "@/infrastructure/rate-limit";
import { getDriverMe } from "@/modules/deliveries/server";

const log = createLogger("v1-driver-me");

export async function GET(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const limited = await checkRateLimit(mobileApiLimiter, session.driverId);
  if (limited) return limited;
  try {
    return apiResponse.success(await getDriverMe(session));
  } catch (caught) {
    log.error({ err: caught }, "Lecture du profil livreur impossible");
    return apiResponse.internalError();
  }
}
