import "server-only";

import { eq } from "drizzle-orm";
import { residenceReservations } from "@/infrastructure/db/schema";
import type { TransactionExecutor } from "@/infrastructure/db/transaction";
import { persistNotification } from "@/modules/notifications/server";
import { sendClientExpoPush } from "@/modules/notifications/server";
import {
  getResidenceReservationTransactionInTransaction,
  recordConfirmedPaymentJournalInTransaction,
} from "@/modules/transactions/server";
import {
  confirmResidenceReservationRecord,
  getResidenceReservationDTORecord,
  lockResidenceRecord,
} from "./bookings";
import {
  getTodayInAbidjan,
  ResidenceDomainError,
} from "../model";
import { persistResidenceEvent } from "./events";

export async function confirmResidenceReservationPaymentInTransaction(
  tx: TransactionExecutor,
  reservationId: string,
  now = new Date(),
) {
  const currentReservation = await tx.query.residenceReservations.findFirst({
    where: eq(residenceReservations.id, reservationId),
    columns: { residenceId: true },
  });
  if (!currentReservation) {
    throw new ResidenceDomainError(
      "RESIDENCE_RESERVATION_NOT_FOUND",
      "Réservation introuvable.",
    );
  }
  await lockResidenceRecord(tx, currentReservation.residenceId);
  const reservation = await confirmResidenceReservationRecord(
    tx,
    reservationId,
    now,
  );
  if (reservation) {
    const transaction =
      await getResidenceReservationTransactionInTransaction(tx, reservation.id);
    const confirmedPayment = transaction?.payments.find(
      (payment) => payment.status === "confirmed",
    );
    if (!confirmedPayment) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "Le paiement confirmé de cette réservation est introuvable.",
      );
    }
    const partner = await tx.query.partnerAccounts.findFirst({
      where: (account, { eq: relationEq }) =>
        relationEq(account.id, reservation.partnerAccountId),
      columns: { userId: true },
    });
    const event = await persistResidenceEvent(tx, {
      type: "residence.reservation.confirmed.v1",
      action: "residence_reservation_confirmed",
      actor: { type: "provider", id: "paystack" },
      partnerAccountId: reservation.partnerAccountId,
      target: { type: "residence_reservation", id: reservation.id },
      payload: {
        residenceId: reservation.residenceId,
        amountFcfa: reservation.totalFcfa,
      },
      occurredAt: now,
    });
    await persistNotification(tx, {
      clientId: reservation.clientId,
      type: "systeme",
      titre: "Séjour confirmé",
      message: `Votre réservation du ${reservation.checkIn} au ${reservation.checkOut} est confirmée.`,
      lienType: "reservation_residence",
      lienId: reservation.id,
      eventId: event.eventId,
      correlationId: event.correlationId,
    });
    if (partner) {
      await persistNotification(tx, {
        userId: partner.userId,
        type: "systeme",
        titre: "Réservation payée",
        message: `Le séjour du ${reservation.checkIn} au ${reservation.checkOut} est confirmé.`,
        lienType: "reservation_residence",
        lienId: reservation.id,
        eventId: event.eventId,
        correlationId: event.correlationId,
      });
    }
    await recordConfirmedPaymentJournalInTransaction(tx, {
      paymentId: confirmedPayment.id,
      eventId: event.eventId,
      channel: "provider",
      actor: { type: "provider", id: "paystack" },
      occurredAt: now,
    });
    return reservation;
  }

  const current = await getResidenceReservationDTORecord(
    reservationId,
    getTodayInAbidjan(now),
    tx,
  );
  if (current?.status === "confirmee") return current;
  throw new ResidenceDomainError(
    "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
    "Cette réservation ne peut plus être confirmée.",
  );
}

export async function sendConfirmedResidenceReservationPush(
  reservationId: string,
) {
  const reservation = await getResidenceReservationDTORecord(
    reservationId,
    getTodayInAbidjan(),
  );
  if (!reservation || reservation.status !== "confirmee") return;
  await sendClientExpoPush(reservation.clientId, {
    titre: "Séjour confirmé",
    message: `Votre réservation du ${reservation.checkIn} au ${reservation.checkOut} est confirmée.`,
    data: {
      type: "systeme",
      lienType: "reservation_residence",
      lienId: reservation.id,
    },
  });
}
