import { Expo } from "expo-server-sdk";
import { NextRequest } from "next/server";
import { requireDriverSession } from "@/app/api/_shared/auth-driver";
import { apiResponse } from "@/app/api/_shared/response";
import { validateBody } from "@/app/api/_shared/validate";
import { driverExpoSubscriptionSchema } from "@/modules/notifications/contracts";
import {
  registerDriverExpoSubscription,
  unregisterDriverExpoSubscription,
} from "@/modules/notifications/server";

async function getInput(request: NextRequest) {
  const result = await validateBody(request, driverExpoSubscriptionSchema);
  if (result.error) return result;
  if (!Expo.isExpoPushToken(result.data.expoToken)) {
    return {
      data: null,
      error: apiResponse.validationError({
        expoToken: ["Token Expo invalide"],
      }),
    };
  }
  return result;
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const validated = await getInput(request);
  if (validated.error) return validated.error;
  return apiResponse.success(
    await registerDriverExpoSubscription({
      driverId: session.driverId,
      expoToken: validated.data.expoToken,
      userAgent: request.headers.get("user-agent"),
    }),
  );
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await requireDriverSession(request);
  if (error) return error;
  const validated = await getInput(request);
  if (validated.error) return validated.error;
  return apiResponse.success(
    await unregisterDriverExpoSubscription({
      driverId: session.driverId,
      expoToken: validated.data.expoToken,
    }),
  );
}
