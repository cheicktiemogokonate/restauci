import { z } from "zod";
import { CAUSAL_ACTOR_TYPES } from "@/shared/causality";
import { CAUSAL_EFFECT_TYPES } from "./model";

const causalPayloadSchema = z.record(z.string(), z.unknown());

export const causalActorSchema = z
  .object({
    type: z.enum(CAUSAL_ACTOR_TYPES),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

export const causalTargetSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

export const causalEffectSchema = z
  .object({
    type: z.enum(CAUSAL_EFFECT_TYPES),
    payload: causalPayloadSchema,
  })
  .strict();

export const businessEventInputSchema = z
  .object({
    eventId: z.string().uuid(),
    correlationId: z.string().uuid(),
    type: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+\.v[1-9][0-9]*$/),
    actor: causalActorSchema,
    partnerAccountId: z.string().uuid().nullable().default(null),
    target: causalTargetSchema,
    occurredAt: z.date(),
    payload: causalPayloadSchema.default({}),
    effects: z.array(causalEffectSchema).min(1).max(10),
  })
  .strict();

export const outboxBatchInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();

export const outboxMessageIdSchema = z.string().uuid();

export type BusinessEventInput = z.infer<typeof businessEventInputSchema>;
export type CausalEffect = z.infer<typeof causalEffectSchema>;
export type OutboxBatchInput = z.input<typeof outboxBatchInputSchema>;
