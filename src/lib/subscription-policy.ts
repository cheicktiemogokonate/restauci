export type OrderedPlan = {
  code: string;
  ordre: number;
  prixAnnuelFcfa: number;
  actif: boolean;
};

export type SubscriptionTransition =
  | { allowed: true; kind: "first_paid" | "upgrade" }
  | {
      allowed: false;
      reason: "discovery_not_purchasable" | "unavailable" | "same_plan" | "downgrade";
    };

/**
 * La hiérarchie commerciale vient exclusivement de `subscription_plans.ordre`.
 * L'absence de période payante signifie que Découverte est le fallback, pas
 * qu'une période gratuite doit exister.
 */
export function evaluateSubscriptionTransition(
  currentPaidPlan: OrderedPlan | null,
  targetPlan: OrderedPlan,
): SubscriptionTransition {
  if (!targetPlan.actif) return { allowed: false, reason: "unavailable" };
  if (targetPlan.code === "decouverte" || targetPlan.prixAnnuelFcfa <= 0) {
    return { allowed: false, reason: "discovery_not_purchasable" };
  }
  if (!currentPaidPlan) return { allowed: true, kind: "first_paid" };
  if (targetPlan.code === currentPaidPlan.code) {
    return { allowed: false, reason: "same_plan" };
  }
  if (targetPlan.ordre <= currentPaidPlan.ordre) {
    return { allowed: false, reason: "downgrade" };
  }
  return { allowed: true, kind: "upgrade" };
}

export function subscriptionTransitionError(
  transition: Exclude<SubscriptionTransition, { allowed: true }>,
): string {
  switch (transition.reason) {
    case "discovery_not_purchasable":
      return "Découverte est le plan gratuit appliqué automatiquement, sans souscription";
    case "unavailable":
      return "Cette offre n’est pas disponible";
    case "same_plan":
      return "Le renouvellement anticipé du même plan n’est pas autorisé";
    case "downgrade":
      return "Le passage vers une offre inférieure n’est pas autorisé pendant un abonnement actif";
  }
}

export function addOneSubscriptionYear(startAt: Date): Date {
  const endAt = new Date(startAt);
  endAt.setFullYear(endAt.getFullYear() + 1);
  return endAt;
}

export function isPaidPeriodEffective(
  period: { planCode: string; statut: string; dateDebut: Date; dateEcheance: Date | null },
  now: Date,
): boolean {
  return (
    period.planCode !== "decouverte" &&
    period.statut === "active" &&
    period.dateDebut <= now &&
    period.dateEcheance !== null &&
    period.dateEcheance > now
  );
}

export function buildUpgradeClosure(endedAt: Date) {
  return {
    statut: "terminee" as const,
    endedAt,
    endReason: "upgrade" as const,
  };
}

export function buildReactivationDecision(dateEcheance: Date, now: Date) {
  if (dateEcheance <= now) {
    return {
      reactivated: false as const,
      update: {
        statut: "expiree" as const,
        endedAt: dateEcheance,
        endReason: "expiration_naturelle" as const,
      },
    };
  }
  return {
    reactivated: true as const,
    update: {
      statut: "active" as const,
      dateEcheance,
    },
  };
}
