import { describe, expect, it } from "vitest";
import { hasValidCronAuthorization } from "./cron-auth";

describe("autorisation des tâches planifiées", () => {
  const secret = "a-secure-cron-secret-with-32-characters";

  it("accepte uniquement le secret Bearer exact", () => {
    expect(hasValidCronAuthorization(`Bearer ${secret}`, secret)).toBe(true);
    expect(hasValidCronAuthorization("Bearer incorrect", secret)).toBe(false);
  });

  it("refuse les en-têtes absents ou mal formés", () => {
    expect(hasValidCronAuthorization(null, secret)).toBe(false);
    expect(hasValidCronAuthorization(secret, secret)).toBe(false);
  });
});
