import "server-only";

import { businessEvents, outboxMessages } from "@/infrastructure/db/schema";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import type { BusinessEventInput } from "../contracts";
import {
  assertSafeCausalPayload,
  getEventRetentionDeadline,
  OUTBOX_MAX_ATTEMPTS,
} from "../model";

export async function persistBusinessEventRecord(
  executor: Pick<DbExecutor, "insert">,
  input: BusinessEventInput,
) {
  const payload = assertSafeCausalPayload(input.payload);
  for (const effect of input.effects) {
    assertSafeCausalPayload(effect.payload);
  }

  const [event] = await executor
    .insert(businessEvents)
    .values({
      id: input.eventId,
      correlationId: input.correlationId,
      type: input.type,
      actorType: input.actor.type,
      actorId: input.actor.id,
      partnerAccountId: input.partnerAccountId,
      targetType: input.target.type,
      targetId: input.target.id,
      payload,
      occurredAt: input.occurredAt,
      retainedUntil: getEventRetentionDeadline(input.occurredAt),
    })
    .returning();

  await executor.insert(outboxMessages).values(
    input.effects.map((effect) => ({
      eventId: input.eventId,
      effectType: effect.type,
      payload: effect.payload,
      maxAttempts: OUTBOX_MAX_ATTEMPTS,
      availableAt: input.occurredAt,
    })),
  );

  return event;
}
