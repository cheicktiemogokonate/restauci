import { describe, expect, it } from "vitest";
import { CAUSAL_ACTOR_TYPES } from "@/shared/causality";
import { businessEventInputSchema } from "./contracts";

const baseEvent = {
  eventId: "076ea9ac-6afd-4bf7-83f7-12287982ab43",
  correlationId: "94e217ee-ebcf-40c7-9517-220817963917",
  type: "admin.account.created.v1",
  partnerAccountId: null,
  target: {
    type: "admin_account",
    id: "05d4b723-3637-4aaf-8759-d8c521e8032f",
  },
  occurredAt: new Date("2026-09-05T12:00:00.000Z"),
  payload: {},
  effects: [
    {
      type: "audit.project" as const,
      payload: { action: "admin_account_created" as const },
    },
  ],
};

describe("business event envelope", () => {
  it.each(CAUSAL_ACTOR_TYPES)("supports the %s actor", (type) => {
    expect(
      businessEventInputSchema.safeParse({
        ...baseEvent,
        actor: { type, id: type === "system" ? "toutci" : crypto.randomUUID() },
      }).success,
    ).toBe(true);
  });

  it("rejects an unversioned event type", () => {
    expect(
      businessEventInputSchema.safeParse({
        ...baseEvent,
        type: "admin.account.created",
        actor: { type: "admin", id: crypto.randomUUID() },
      }).success,
    ).toBe(false);
  });
});
