import { NextRequest }             from "next/server";
import { z }                       from "zod";
import { Expo }                    from "expo-server-sdk";
import { getMobileSession }        from "@/lib/api/auth-mobile";
import { apiResponse }             from "@/lib/api/response";
import { validateBody }            from "@/lib/api/validate";
import { db }                      from "@/lib/db";
import { pushSubscriptions }       from "@/lib/db/schema";
import { eq, and }                 from "drizzle-orm";
import { createLogger }            from "@/lib/logger";

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

    const existing = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, session.userId),
        eq(pushSubscriptions.expoToken, expoToken),
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({ lastUsedAt: new Date() })
        .where(eq(pushSubscriptions.id, existing[0].id));
    } else {
      await db.insert(pushSubscriptions).values({
        userId:    session.userId,
        type:      "expo",
        expoToken,
      });
    }

    log.info({ userId: session.userId }, "Token Expo enregistre");
    return apiResponse.success({ message: "Token enregistre" });
  } catch (err) {
    log.error({ err, userId: session.userId }, "Erreur enregistrement token Expo");
    return apiResponse.internalError();
  }
}
