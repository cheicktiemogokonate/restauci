import { Expo } from "expo-server-sdk";
import { NextRequest } from "next/server";
import { getClientSession } from "@/lib/api/auth-client";
import { apiResponse } from "@/lib/api/response";
import { validateBody } from "@/lib/api/validate";
import { clientExpoSubscriptionSchema } from "@/modules/notifications/contracts";
import {
  registerClientExpoSubscription,
  unregisterClientExpoSubscription,
} from "@/modules/notifications/server";

async function getInput(request: NextRequest) {
  const result = await validateBody(request, clientExpoSubscriptionSchema);
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
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const { data, error: bodyError } = await getInput(request);
  if (bodyError) return bodyError;
  return apiResponse.success(
    await registerClientExpoSubscription({
      clientId: session.clientId,
      expoToken: data.expoToken,
      userAgent: request.headers.get("user-agent"),
    }),
  );
}

export async function DELETE(request: NextRequest) {
  const { session, error } = await getClientSession(request);
  if (error) return error;
  const { data, error: bodyError } = await getInput(request);
  if (bodyError) return bodyError;
  return apiResponse.success(
    await unregisterClientExpoSubscription({
      clientId: session.clientId,
      expoToken: data.expoToken,
    }),
  );
}
