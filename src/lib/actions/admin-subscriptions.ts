"use server";

import { db } from "@/lib/db";
import { 
  subscriptionRequests, 
  subscriptionPeriods, 
  subscriptionPlans,
  auditLog,
  notifications,
  planCodeEnum,
  moyenReglementEnum,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { revalidatePath } from "next/cache";
import { extendSubscriptionDeadline } from "@/lib/config/admin-workflows";

/**
 * Valide une demande d'abonnement et crée la période correspondante.
 */
type PlanCode = (typeof planCodeEnum.enumValues)[number];
type MoyenReglement = (typeof moyenReglementEnum.enumValues)[number];

const PLAN_CODES = new Set<PlanCode>(planCodeEnum.enumValues);
const MOYENS_REGLEMENT = new Set<MoyenReglement>(moyenReglementEnum.enumValues);

function cleanText(value: string, label: string, min: number, max: number) {
  const cleaned = value.trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw new Error(`${label} doit contenir entre ${min} et ${max} caractères`);
  }
  return cleaned;
}

export async function validateSubscriptionRequest(
  requestId: string,
  moyenReglement?: MoyenReglement,
  referenceReglement?: string,
) {
  const session = await getAdminSession();

  const result = await db.transaction(async (tx) => {
    // 1. Récupérer la demande
    const request = await tx.query.subscriptionRequests.findFirst({
      where: eq(subscriptionRequests.id, requestId),
      with: { restaurant: true }
    });

    if (!request || request.statut !== "en_attente") {
      throw new Error("Demande invalide ou déjà traitée");
    }

    const isPaidPlan = request.prixFigeFcfa > 0;
    const reference = referenceReglement?.trim() || null;
    if (isPaidPlan) {
      if (!moyenReglement || !MOYENS_REGLEMENT.has(moyenReglement)) {
        throw new Error("Le moyen de règlement est obligatoire");
      }
      if (!reference || reference.length < 3 || reference.length > 255) {
        throw new Error(
          "La référence de règlement doit contenir entre 3 et 255 caractères",
        );
      }
    }

    // 2. Verrouiller atomiquement la demande pour empêcher un double traitement.
    const [processedRequest] = await tx.update(subscriptionRequests)
      .set({ 
        statut: "validee",
        traiteeParAdminId: session.userId,
        traiteeAt: new Date()
      })
      .where(
        and(
          eq(subscriptionRequests.id, requestId),
          eq(subscriptionRequests.statut, "en_attente"),
        ),
      )
      .returning({ id: subscriptionRequests.id });

    if (!processedRequest) {
      throw new Error("Cette demande a déjà été traitée");
    }

    // 3. Récupérer le plan pour figer le taux
    const plan = await tx.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, request.planCode)
    });

    if (!plan) throw new Error("Plan introuvable");

    // 4. Clôturer l'ancienne période active (s'il y en a une)
    await tx.update(subscriptionPeriods)
      .set({ 
        statut: "expiree",
      })
      .where(
        and(
          eq(subscriptionPeriods.restaurantId, request.restaurantId),
          eq(subscriptionPeriods.statut, "active")
        )
      );

    // 5. Créer la nouvelle période
    // Une période dure 1 an par défaut
    const dateDebut = new Date();
    const dateEcheance =
      request.planCode === "decouverte" ? null : new Date(dateDebut);
    dateEcheance?.setFullYear(dateEcheance.getFullYear() + 1);

    await tx.insert(subscriptionPeriods).values({
      restaurantId: request.restaurantId,
      requestId: request.id,
      planCode: request.planCode,
      tauxCommissionBpsFige: plan.tauxCommissionBps,
      prixPayeFcfa: request.prixFigeFcfa,
      // Si un prix a été payé, on enregistre la date et le moyen
      moyenReglement: isPaidPlan ? moyenReglement : null,
      dateReglement: isPaidPlan ? new Date() : null,
      referenceReglement: isPaidPlan ? reference : null,
      valideeParAdminId: session.userId,
      dateDebut,
      dateEcheance,
      statut: "active",
    });

    // 6. Audit & Notification
    await tx.insert(auditLog).values({
      adminId: session.userId,
      action: "abonnement_valide",
      ressourceType: "restaurant",
      ressourceId: request.restaurantId,
      details: { requestId, planCode: request.planCode }
    });

    await tx.insert(notifications).values({
      userId: request.restaurant.userId,
      type: "abonnement_valide",
      titre: "Abonnement validé",
      message: `Votre demande pour l'offre ${plan.nom} a été acceptée.`,
      lienType: "abonnement",
    });

    return { success: true, restaurantId: request.restaurantId };
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  return result;
}

/**
 * Refuse une demande d'abonnement.
 */
export async function rejectSubscriptionRequest(requestId: string, motifRefus: string) {
  const session = await getAdminSession();
  const motif = cleanText(motifRefus, "Le motif", 5, 1000);

  const result = await db.transaction(async (tx) => {
    const request = await tx.query.subscriptionRequests.findFirst({
      where: eq(subscriptionRequests.id, requestId),
      with: { restaurant: true }
    });

    if (!request || request.statut !== "en_attente") {
      throw new Error("Demande invalide ou déjà traitée");
    }

    const [processedRequest] = await tx.update(subscriptionRequests)
      .set({ 
        statut: "refusee",
        motifRefus: motif,
        traiteeParAdminId: session.userId,
        traiteeAt: new Date()
      })
      .where(
        and(
          eq(subscriptionRequests.id, requestId),
          eq(subscriptionRequests.statut, "en_attente"),
        ),
      )
      .returning({ id: subscriptionRequests.id });

    if (!processedRequest) {
      throw new Error("Cette demande a déjà été traitée");
    }

    await tx.insert(auditLog).values({
      adminId: session.userId,
      action: "abonnement_refuse",
      ressourceType: "restaurant",
      ressourceId: request.restaurantId,
      details: { requestId, motifRefus: motif }
    });

    await tx.insert(notifications).values({
      userId: request.restaurant.userId,
      type: "abonnement_refuse",
      titre: "Abonnement refusé",
      message: `Votre demande d'abonnement a été refusée : ${motif}`,
      lienType: "abonnement",
    });

    return { success: true, restaurantId: request.restaurantId };
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  return result;
}

/**
 * Met à jour le catalogue des offres.
 */
export async function updateSubscriptionPlan(planCode: string, data: Partial<{
  nom: string;
  description: string | null;
  prixAnnuelFcfa: number;
  tauxCommissionBps: number;
  maxPlats: number | null;
  maxCategories: number | null;
  actif: boolean;
}>) {
  const session = await getAdminSession();
  if (!PLAN_CODES.has(planCode as PlanCode)) {
    throw new Error("Code d’offre invalide");
  }

  const normalizedData = {
    nom:
      data.nom === undefined
        ? undefined
        : cleanText(data.nom, "Le nom", 2, 100),
    description:
      data.description === undefined
        ? undefined
        : data.description?.trim().slice(0, 2000) || null,
    prixAnnuelFcfa:
      data.prixAnnuelFcfa === undefined
        ? undefined
        : Number(data.prixAnnuelFcfa),
    tauxCommissionBps:
      data.tauxCommissionBps === undefined
        ? undefined
        : Number(data.tauxCommissionBps),
    maxPlats: data.maxPlats,
    maxCategories: data.maxCategories,
    actif: data.actif,
  };

  if (
    normalizedData.prixAnnuelFcfa !== undefined &&
    (!Number.isInteger(normalizedData.prixAnnuelFcfa) ||
      normalizedData.prixAnnuelFcfa < 0)
  ) {
    throw new Error("Le prix annuel doit être un entier positif ou nul");
  }
  if (
    normalizedData.tauxCommissionBps !== undefined &&
    (!Number.isInteger(normalizedData.tauxCommissionBps) ||
      normalizedData.tauxCommissionBps < 0 ||
      normalizedData.tauxCommissionBps > 10_000)
  ) {
    throw new Error("Le taux de commission doit être compris entre 0 et 100 %");
  }
  for (const [label, value] of [
    ["La limite de plats", normalizedData.maxPlats],
    ["La limite de catégories", normalizedData.maxCategories],
  ] as const) {
    if (value !== undefined && value !== null && (!Number.isInteger(value) || value < 1)) {
      throw new Error(`${label} doit être un entier strictement positif`);
    }
  }

  await db.transaction(async (tx) => {
    const [updated] = await tx.update(subscriptionPlans)
      .set({
        ...normalizedData,
        updatedByAdminId: session.userId,
        updatedAt: new Date()
      })
      .where(eq(subscriptionPlans.code, planCode as PlanCode))
      .returning({ code: subscriptionPlans.code });

    if (!updated) throw new Error("Offre introuvable");

    await tx.insert(auditLog).values({
      adminId: session.userId,
      action: "catalogue_modifie",
      ressourceType: "systeme",
      ressourceId: planCode,
      details: { planCode, modifications: normalizedData }
    });
  });

  revalidatePath("/admin/abonnements");
  revalidatePath("/admin/parametres");
}

/**
 * Suspend la période d'abonnement active d'un restaurant.
 */
export async function suspendreAbonnementAction(restaurantId: string, motif: string) {
  const session = await getAdminSession();

  const motifNettoye = cleanText(motif, "Le motif", 5, 1000);

  await db.transaction(async (tx) => {
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: and(
        eq(subscriptionPeriods.restaurantId, restaurantId),
        eq(subscriptionPeriods.statut, "active")
      ),
      with: { restaurant: true },
    });

    if (!period) throw new Error("Aucun abonnement actif pour ce restaurant");

    const suspenduAt = new Date();
    const [updated] = await tx.update(subscriptionPeriods)
      .set({
        statut: "suspendue",
        motifSuspension: motifNettoye,
        suspenduParAdminId: session.userId,
        suspenduAt,
      })
      .where(
        and(
          eq(subscriptionPeriods.id, period.id),
          eq(subscriptionPeriods.statut, "active"),
        ),
      )
      .returning({ id: subscriptionPeriods.id });

    if (!updated) throw new Error("Cet abonnement a déjà été traité");

    await tx.insert(auditLog).values({
      adminId: session.userId,
      action: "abonnement_suspendu",
      ressourceType: "restaurant",
      ressourceId: restaurantId,
      details: { periodId: period.id, motif: motifNettoye },
    });

    await tx.insert(notifications).values({
      userId: period.restaurant.userId,
      type: "abonnement_suspendu",
      titre: "Abonnement suspendu",
      message: `Votre abonnement a été suspendu. Motif : ${motifNettoye}`,
      lienType: "abonnement",
    });
  });

  revalidatePath("/admin/abonnements");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
}

export async function reactiverAbonnementAction(restaurantId: string) {
  const session = await getAdminSession();

  await db.transaction(async (tx) => {
    const period = await tx.query.subscriptionPeriods.findFirst({
      where: and(
        eq(subscriptionPeriods.restaurantId, restaurantId),
        eq(subscriptionPeriods.statut, "suspendue"),
      ),
      orderBy: (periods, { desc }) => [desc(periods.suspenduAt)],
      with: { restaurant: true },
    });

    if (!period) throw new Error("Aucun abonnement suspendu pour ce restaurant");

    const now = new Date();
    const adjustedDeadline = extendSubscriptionDeadline(
      period.dateEcheance,
      period.suspenduAt,
      now,
    );

    const [updated] = await tx
      .update(subscriptionPeriods)
      .set({
        statut: "active",
        dateEcheance: adjustedDeadline,
        motifSuspension: null,
        suspenduParAdminId: null,
        suspenduAt: null,
      })
      .where(
        and(
          eq(subscriptionPeriods.id, period.id),
          eq(subscriptionPeriods.statut, "suspendue"),
        ),
      )
      .returning({ id: subscriptionPeriods.id });

    if (!updated) throw new Error("Cet abonnement a déjà été traité");

    await tx.insert(auditLog).values({
      adminId: session.userId,
      action: "abonnement_reactive",
      ressourceType: "restaurant",
      ressourceId: restaurantId,
      details: { periodId: period.id, dateEcheance: adjustedDeadline },
    });

    await tx.insert(notifications).values({
      userId: period.restaurant.userId,
      type: "systeme",
      titre: "Abonnement réactivé",
      message: "Votre abonnement Toutci a été réactivé.",
      lienType: "abonnement",
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
}
