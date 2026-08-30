import { describe, expect, it } from "vitest";

import {
  cancelPartnerResidenceReservationSchema,
  updatePartnerResidenceReservationSchema,
} from "@/modules/residences/contracts";

describe("contrats de gestion des réservations par le propriétaire", () => {
  const reservationId = crypto.randomUUID();

  it("valide des dates et un nombre de voyageurs explicites", () => {
    expect(
      updatePartnerResidenceReservationSchema.safeParse({
        reservationId,
        checkIn: "2026-10-10",
        checkOut: "2026-10-13",
        guests: 3,
      }).success,
    ).toBe(true);
    expect(
      updatePartnerResidenceReservationSchema.safeParse({
        reservationId,
        checkIn: "10/10/2026",
        checkOut: "2026-10-13",
        guests: 3,
      }).success,
    ).toBe(false);
  });

  it("exige un motif d’annulation exploitable", () => {
    expect(
      cancelPartnerResidenceReservationSchema.safeParse({
        reservationId,
        reason: "Court",
      }).success,
    ).toBe(false);
    expect(
      cancelPartnerResidenceReservationSchema.safeParse({
        reservationId,
        reason: "Travaux urgents empêchant l’accueil du voyageur.",
      }).success,
    ).toBe(true);
  });
});
