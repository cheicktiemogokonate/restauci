import "server-only";

import { redis } from "@/lib/cache/redis";

const DEFAULT_MAX_CONNECTIONS = 3;

const ACQUIRE_SLOT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
if count > tonumber(ARGV[2]) then
  redis.call("DECR", KEYS[1])
  return 0
end
return 1
`;

const RELEASE_SLOT_SCRIPT = `
local count = tonumber(redis.call("GET", KEYS[1]) or "0")
if count <= 1 then
  redis.call("DEL", KEYS[1])
  return 0
end
return redis.call("DECR", KEYS[1])
`;

export interface SseConnectionSlot {
  release(): Promise<void>;
}

export async function acquireSseConnectionSlot(input: {
  scope: string;
  ownerId: string;
  ttlSeconds: number;
  maxConnections?: number;
}): Promise<SseConnectionSlot | null> {
  const key = `restauci:sse:connections:${input.scope}:${input.ownerId}`;
  const maxConnections = input.maxConnections ?? DEFAULT_MAX_CONNECTIONS;
  const acquired = await redis.eval<string[], number>(
    ACQUIRE_SLOT_SCRIPT,
    [key],
    [String(input.ttlSeconds), String(maxConnections)],
  );
  if (acquired !== 1) return null;

  let released = false;
  return {
    async release() {
      if (released) return;
      released = true;
      await redis.eval<string[], number>(RELEASE_SLOT_SCRIPT, [key], []);
    },
  };
}
