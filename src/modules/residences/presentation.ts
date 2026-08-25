import type { ResidenceReservationStatus } from "./model";

export const RESIDENCE_RESERVATION_STATUS_LABELS: Record<
  ResidenceReservationStatus,
  string
> = {
  en_attente_paiement: "Paiement en attente",
  confirmee: "Confirmée",
  annulee: "Annulée",
};

export function getResidenceReservationStatusLabel(
  status: ResidenceReservationStatus,
) {
  return RESIDENCE_RESERVATION_STATUS_LABELS[status];
}
