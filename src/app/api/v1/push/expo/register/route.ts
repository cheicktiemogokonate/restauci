import { NextRequest }             from "next/server";
import { z }                       from "zod";
import { Expo }                    from "expo-server-sdk";
import { getMobileSession }        from "@/app/api/_shared/auth-mobile";
import { apiResponse }             from "@/app/api/_shared/response";
import { validateBody }            from "@/app/api/_shared/validate";
import { createLogger }            from "@/infrastructure/logger";
import { registerUserExpoSubscription } from "@/modules/notifications/server";

const log = createLogger("expo-register");

const registerSchema = z.object({
  expoToken: z.string().refine(
    (token) => Expo.isExpoPushToken(token),
    "Token Expo invalide"
  ),
});

export async function POST(req: NextRequest) {
  const { session, error } = await getMobileSession(req);
  if (error) return error;

  const { data, error: vError } = await validateBody(req, registerSchema);
  if (vError) return vError;

  try {
    const { expoToken } = data;

    await registerUserExpoSubscription({ userId: session.userId, expoToken });

    log.info({ userId: session.userId }, "Token Expo enregistre");
    return apiResponse.success({ message: "Token enregistre" });
  } catch (err) {
    log.error({ err, userId: session.userId }, "Erreur enregistrement token Expo");
    return apiResponse.internalError();
  }
}
