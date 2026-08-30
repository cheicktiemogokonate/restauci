"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requirePartnerActivity } from "@/lib/auth/partner-account";
import type {
  CancelPartnerResidenceReservationInput,
  UpdatePartnerResidenceReservationInput,
} from "@/modules/residences/contracts";
import { ResidenceDomainError } from "@/modules/residences/model";
import {
  cancelPartnerResidenceReservation,
  updatePartnerResidenceReservation,
} from "@/modules/residences/server";

function expectedReservationActionError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Vérifiez les informations saisies.";
  }
  if (error instanceof ResidenceDomainError) return error.message;
  console.error("[residences] action réservation propriétaire impossible", error);
  return "Cette action est momentanément impossible.";
}

function revalidateReservationPaths(reservationId: string) {
  revalidatePath("/partenaire/reservations");
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/residences");
}

export async function updatePartnerResidenceReservationAction(
  input: UpdatePartnerResidenceReservationInput,
) {
  try {
    const partner = await requirePartnerActivity("residence");
    const reservation = await updatePartnerResidenceReservation(partner.id, input);
    revalidateReservationPaths(reservation.id);
    return {
      success: true as const,
      message: "Réservation modifiée et client informé.",
    };
  } catch (error) {
    return {
      success: false as const,
      message: expectedReservationActionError(error),
    };
  }
}

export async function cancelPartnerResidenceReservationAction(
  input: CancelPartnerResidenceReservationInput,
) {
  try {
    const partner = await requirePartnerActivity("residence");
    const result = await cancelPartnerResidenceReservation(partner.id, input);
    revalidateReservationPaths(result.reservation.id);
    return {
      success: true as const,
      message: result.requiresManualRefund
        ? "Réservation annulée et client informé. Le remboursement reste à traiter avec le support."
        : "Réservation annulée, dates libérées et client informé.",
      requiresManualRefund: result.requiresManualRefund,
    };
  } catch (error) {
    return {
      success: false as const,
      message: expectedReservationActionError(error),
    };
  }
}
