import "server-only";

import {
  businessEventInputSchema,
  outboxBatchInputSchema,
  outboxMessageIdSchema,
  type BusinessEventInput,
  type OutboxBatchInput,
} from "./contracts";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import { persistBusinessEventRecord } from "./_internal/persistence";
import {
  processOutboxBatchRecord,
  requeueDeadLetterRecord,
} from "./_internal/outbox";
import {
  applyRetentionPoliciesRecord,
  rebuildCausalProjectionsRecord,
  reconcileCausalityRecord,
} from "./_internal/maintenance";

export function persistBusinessEvent(
  executor: Pick<DbExecutor, "insert">,
  input: BusinessEventInput,
) {
  return persistBusinessEventRecord(
    executor,
    businessEventInputSchema.parse(input),
  );
}

export function processCausalityOutbox(input: OutboxBatchInput = {}) {
  const parsed = outboxBatchInputSchema.parse(input);
  return processOutboxBatchRecord(parsed.limit);
}

export function requeueCausalityDeadLetter(messageId: string) {
  return requeueDeadLetterRecord(outboxMessageIdSchema.parse(messageId));
}

export function reconcileCausality() {
  return reconcileCausalityRecord();
}

export function applyCausalityRetentionPolicies() {
  return applyRetentionPoliciesRecord();
}

export function rebuildCausalProjections() {
  return rebuildCausalProjectionsRecord();
}

export async function runCausalityMaintenance(input: OutboxBatchInput = {}) {
  const outbox = await processCausalityOutbox(input);
  const [retention, reconciliation] = await Promise.all([
    applyCausalityRetentionPolicies(),
    reconcileCausality(),
  ]);
  return { outbox, retention, reconciliation };
}
