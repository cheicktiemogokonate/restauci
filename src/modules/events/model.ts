export const OUTBOX_STATUSES = [
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
] as const;

export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const CAUSAL_EFFECT_TYPES = [
  "audit.project",
  "notification.project",
] as const;
export type CausalEffectType = (typeof CAUSAL_EFFECT_TYPES)[number];

export const CAUSAL_RETENTION_POLICY = {
  auditYears: 5,
  eventYears: 5,
  completedOutboxDays: 30,
  resolvedDeadLetterYears: 1,
} as const;

export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_LOCK_TIMEOUT_MINUTES = 5;
export const CAUSAL_PAYLOAD_MAX_BYTES = 16_384;

const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "authorization",
  "body",
  "cardnumber",
  "content",
  "cookie",
  "cvv",
  "description",
  "document",
  "email",
  "message",
  "motdepasse",
  "motif",
  "name",
  "nom",
  "otp",
  "password",
  "phone",
  "pin",
  "secret",
  "session",
  "storagekey",
  "telephone",
  "token",
]);

function normalizedPayloadKey(key: string) {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function assertSafeValue(value: unknown, path: string, depth: number): void {
  if (depth > 6) throw new Error(`CAUSAL_PAYLOAD_TOO_DEEP:${path}`);
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "string" && value.length > 512) {
      throw new Error(`CAUSAL_PAYLOAD_STRING_TOO_LONG:${path}`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`CAUSAL_PAYLOAD_NON_FINITE_NUMBER:${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error(`CAUSAL_PAYLOAD_ARRAY_TOO_LONG:${path}`);
    value.forEach((item, index) => assertSafeValue(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`CAUSAL_PAYLOAD_NOT_JSON:${path}`);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) throw new Error(`CAUSAL_PAYLOAD_OBJECT_TOO_LARGE:${path}`);
  for (const [key, nested] of entries) {
    const normalizedKey = normalizedPayloadKey(key);
    if (
      [...FORBIDDEN_PAYLOAD_KEYS].some((forbidden) =>
        normalizedKey.includes(forbidden),
      )
    ) {
      throw new Error(`CAUSAL_PAYLOAD_SENSITIVE_KEY:${path}.${key}`);
    }
    assertSafeValue(nested, `${path}.${key}`, depth + 1);
  }
}

export function assertSafeCausalPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  assertSafeValue(payload, "payload", 0);
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength > CAUSAL_PAYLOAD_MAX_BYTES) {
    throw new Error("CAUSAL_PAYLOAD_TOO_LARGE");
  }
  return payload;
}

export function getOutboxRetryDelaySeconds(attempt: number): number {
  const normalizedAttempt = Math.max(1, Math.trunc(attempt));
  return Math.min(300, 5 * 2 ** (normalizedAttempt - 1));
}

export function getEventRetentionDeadline(occurredAt: Date): Date {
  const deadline = new Date(occurredAt);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + CAUSAL_RETENTION_POLICY.eventYears);
  return deadline;
}
