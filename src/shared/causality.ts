export const CAUSAL_ACTOR_TYPES = [
  "admin",
  "partner",
  "client",
  "driver",
  "system",
  "provider",
] as const;

export type CausalActorType = (typeof CAUSAL_ACTOR_TYPES)[number];
