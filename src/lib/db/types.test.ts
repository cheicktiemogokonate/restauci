import { describe, expectTypeOf, it } from "vitest";
import { typeNotificationEnum } from "./schema";
import type { TypeNotification } from "./types";

describe("database-derived notification types", () => {
  it("keeps TypeNotification equal to the canonical enum", () => {
    type CanonicalNotification =
      (typeof typeNotificationEnum.enumValues)[number];
    expectTypeOf<TypeNotification>().toEqualTypeOf<CanonicalNotification>();
  });
});
