import type { DbExecutor } from "@/infrastructure/db/transaction";
import { notifications } from "@/infrastructure/db/schema";
import {
  persistedNotificationSchema,
  type NotificationWriteInput,
  type PersistedNotificationInput,
} from "../contracts";

function normalizeNotificationWrite(
  input: NotificationWriteInput,
): PersistedNotificationInput {
  if (input.destination && (input.lienType || input.lienId)) {
    throw new Error("Une seule forme de destination est autorisée.");
  }
  if (Boolean(input.lienType) !== Boolean(input.lienId)) {
    throw new Error("Le type et l’identifiant de destination sont indissociables.");
  }
  return persistedNotificationSchema.parse({
    userId: input.userId,
    clientId: input.clientId,
    driverId: input.driverId,
    type: input.type,
    titre: input.titre,
    message: input.message,
    destination:
      input.destination ??
      (input.lienType && input.lienId
        ? { type: input.lienType, id: input.lienId }
        : undefined),
    eventId: input.eventId,
    correlationId: input.correlationId,
  });
}

export async function persistNotificationRecord(
  executor: Pick<DbExecutor, "insert">,
  input: NotificationWriteInput,
) {
  const payload = normalizeNotificationWrite(input);
  const [notification] = await executor
    .insert(notifications)
    .values({
      userId: payload.userId ?? null,
      clientId: payload.clientId ?? null,
      driverId: payload.driverId ?? null,
      type: payload.type,
      titre: payload.titre,
      message: payload.message,
      lienType: payload.destination?.type ?? null,
      lienId: payload.destination?.id ?? null,
      eventId: payload.eventId ?? null,
      correlationId: payload.correlationId ?? null,
    })
    .onConflictDoNothing()
    .returning();
  return notification ?? null;
}
