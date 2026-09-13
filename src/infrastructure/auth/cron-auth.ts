import { timingSafeEqual } from "node:crypto";

export function hasValidCronAuthorization(
  authorization: string | null,
  cronSecret: string,
): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(cronSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
