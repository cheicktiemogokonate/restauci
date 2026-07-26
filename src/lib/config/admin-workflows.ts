export type AdminRestaurantStatus =
  | "actif"
  | "suspendu"
  | "rejete"
  | "en_attente";

export function getAdminRestaurantStatus({
  actif,
  suspendu,
  motifRejet,
}: {
  actif: boolean;
  suspendu: boolean;
  motifRejet: string | null;
}): AdminRestaurantStatus {
  if (suspendu) return "suspendu";
  if (actif) return "actif";
  if (motifRejet) return "rejete";
  return "en_attente";
}

export function normalizeSettlementInput(
  referenceReglement: string,
  notes?: string,
) {
  const reference = referenceReglement.trim();
  const normalizedNotes = notes?.trim() || null;

  if (reference.length < 3 || reference.length > 255) {
    throw new Error(
      "La référence de règlement doit contenir entre 3 et 255 caractères.",
    );
  }
  if (normalizedNotes && normalizedNotes.length > 1000) {
    throw new Error("Les notes ne peuvent pas dépasser 1 000 caractères.");
  }

  return { reference, notes: normalizedNotes };
}

export function extendSubscriptionDeadline(
  deadline: Date | null,
  suspendedAt: Date | null,
  reactivatedAt: Date,
) {
  if (!deadline) return null;
  const suspensionDuration = suspendedAt
    ? Math.max(0, reactivatedAt.getTime() - suspendedAt.getTime())
    : 0;
  return new Date(deadline.getTime() + suspensionDuration);
}
