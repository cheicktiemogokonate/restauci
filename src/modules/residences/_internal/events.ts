import "server-only";

import type { AuditAction } from "@/modules/audit/model";
import { persistAuditLog } from "@/modules/audit/server";
import { persistBusinessEvent } from "@/modules/events/server";
import type { CausalActorType } from "@/shared/causality";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import type { NotificationProjectionEffect } from "@/modules/notifications/contracts";

type ResidenceEventInput = {
  type: `residence.${string}.v1`;
  action: AuditAction;
  actor: { type: CausalActorType; id: string };
  partnerAccountId: string;
  target: { type: "residence" | "residence_reservation" | "residence_unavailable_period"; id: string };
  payload?: Record<string, unknown>;
  notifications?: NotificationProjectionEffect["payload"]["items"];
  occurredAt?: Date;
};

export async function persistResidenceEvent(
  executor: DbExecutor,
  input: ResidenceEventInput,
) {
  const eventId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const occurredAt = input.occurredAt ?? new Date();
  const details = input.payload ?? {};

  await persistBusinessEvent(executor, {
    eventId,
    correlationId,
    type: input.type,
    actor: input.actor,
    partnerAccountId: input.partnerAccountId,
    target: input.target,
    occurredAt,
    payload: details,
    effects: [
      {
        type: "audit.project",
        payload: { action: input.action, details },
      },
      ...(input.notifications?.length
        ? [
            {
              type: "notification.project" as const,
              payload: { items: input.notifications },
            },
          ]
        : []),
    ],
  });
  await persistAuditLog(executor, {
    actor: input.actor,
    action: input.action,
    resourceType: input.target.type,
    resourceId: input.target.id,
    eventId,
    correlationId,
    partnerAccountId: input.partnerAccountId,
    details,
    createdAt: occurredAt,
  });
  return { eventId, correlationId };
}
