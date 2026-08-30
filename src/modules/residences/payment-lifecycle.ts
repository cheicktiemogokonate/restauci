import "server-only";

import { eq } from "drizzle-orm";
import { residenceReservations } from "@/lib/db/schema";
import type { TransactionExecutor } from "@/lib/db/transaction";
import { persistNotification } from "@/lib/notifications";
import { sendClientExpoPush } from "@/lib/notifications";
import {
  confirmResidenceReservationRecord,
  getResidenceReservationDTORecord,
  lockResidenceRecord,
} from "./_internal/bookings";
import {
  getTodayInAbidjan,
  ResidenceDomainError,
} from "./model";

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
    const partner = await tx.query.partnerAccounts.findFirst({
      where: (account, { eq: relationEq }) =>
        relationEq(account.id, reservation.partnerAccountId),
      columns: { userId: true },
    });
    await persistNotification(tx, {
      clientId: reservation.clientId,
      type: "systeme",
      titre: "Séjour confirmé",
      message: `Votre réservation du ${reservation.checkIn} au ${reservation.checkOut} est confirmée.`,
      lienType: "reservation_residence",
      lienId: reservation.id,
    });
    if (partner) {
      await persistNotification(tx, {
        userId: partner.userId,
        type: "systeme",
        titre: "Réservation payée",
        message: `Le séjour du ${reservation.checkIn} au ${reservation.checkOut} est confirmé.`,
        lienType: "reservation_residence",
        lienId: reservation.id,
      });
    }
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
