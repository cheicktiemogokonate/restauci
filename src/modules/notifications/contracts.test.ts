import { describe, expect, it } from "vitest";
import {
  listClientNotificationsSchema,
  markClientNotificationsReadSchema,
} from "./contracts";

describe("contrats notifications client", () => {
  it("applique une pagination bornée et explicite", () => {
    expect(listClientNotificationsSchema.parse({})).toEqual({
      page: 1,
      limit: 20,
      unreadOnly: false,
    });
    expect(
      listClientNotificationsSchema.safeParse({ limit: 101 }).success,
    ).toBe(false);
  });

  it("accepte soit une sélection soit toutes les notifications", () => {
    expect(
      markClientNotificationsReadSchema.safeParse({
        notificationIds: ["4f3f405c-f47a-46e7-9b70-fde4bc10eec8"],
      }).success,
    ).toBe(true);
    expect(
      markClientNotificationsReadSchema.safeParse({ markAll: true }).success,
    ).toBe(true);
    expect(markClientNotificationsReadSchema.safeParse({}).success).toBe(false);
    expect(
      markClientNotificationsReadSchema.safeParse({
        notificationIds: ["4f3f405c-f47a-46e7-9b70-fde4bc10eec8"],
        markAll: true,
      }).success,
    ).toBe(false);
  });
});
