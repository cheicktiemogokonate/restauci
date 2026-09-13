"use server";

import { getAdminSession } from "@/modules/auth/server";
import { revalidatePath, updateTag } from "next/cache";
import { SUBSCRIPTION_PLANS_CACHE_TAG } from "@/modules/subscriptions/server";
import {
  publishSubscriptionCatalogueDraft,
  reactivatePartnerSubscription,
  rejectPartnerSubscriptionRequest,
  restoreSubscriptionCatalogueRevisionToDraft,
  saveSubscriptionCatalogueDraft,
  suspendPartnerSubscription,
  updateSubscriptionCatalogue,
  validateOfflineSubscriptionRequest,
  type OfflineSubscriptionPaymentMethod,
  type SubscriptionCataloguePayload,
  type UpdateSubscriptionCatalogueInput,
} from "@/modules/subscriptions/server";

export async function validateSubscriptionRequest(
  requestId: string,
  moyenReglement?: OfflineSubscriptionPaymentMethod,
  referenceReglement?: string,
) {
  const session = await getAdminSession();
  const result = await validateOfflineSubscriptionRequest(session.userId, {
    requestId,
    paymentMethod: moyenReglement,
    paymentReference: referenceReglement,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  if (result.restaurantId) {
    revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  }
  return result;
}

/**
 * Refuse une demande d'abonnement.
 */
export async function rejectSubscriptionRequest(requestId: string, motifRefus: string) {
  const session = await getAdminSession();
  const result = await rejectPartnerSubscriptionRequest(session.userId, {
    requestId,
    reason: motifRefus,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  if (result.restaurantId) {
    revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  }
  return result;
}

/**
 * Met à jour le catalogue des offres.
 */
export async function updateSubscriptionPlan(
  planCode: string,
  data: UpdateSubscriptionCatalogueInput,
) {
  const session = await getAdminSession();
  await updateSubscriptionCatalogue(session.userId, planCode, data);

  revalidatePath("/admin/abonnements");
  revalidatePath("/admin/parametres");
  revalidatePath("/");
  updateTag(SUBSCRIPTION_PLANS_CACHE_TAG);
}

export async function saveSubscriptionCatalogueDraftAction(
  data: SubscriptionCataloguePayload,
) {
  const session = await getAdminSession();
  const result = await saveSubscriptionCatalogueDraft(session.userId, data);
  revalidatePath("/admin/parametres");
  return result;
}

export async function publishSubscriptionCatalogueDraftAction() {
  const session = await getAdminSession();
  const result = await publishSubscriptionCatalogueDraft(session.userId);
  revalidatePath("/admin/parametres");
  revalidatePath("/restaurateur/facturation");
  revalidatePath("/partenaire/facturation");
  revalidatePath("/");
  updateTag(SUBSCRIPTION_PLANS_CACHE_TAG);
  return result;
}

export async function restoreSubscriptionCatalogueRevisionToDraftAction(
  revisionId: string,
) {
  const session = await getAdminSession();
  const result = await restoreSubscriptionCatalogueRevisionToDraft(
    session.userId,
    revisionId,
  );
  revalidatePath("/admin/parametres");
  return result;
}

/**
 * Suspend la période d'abonnement active d'un restaurant.
 */
export async function suspendreAbonnementAction(partnerAccountId: string, motif: string) {
  const session = await getAdminSession();
  const result = await suspendPartnerSubscription(session.userId, {
    partnerAccountId,
    reason: motif,
  });

  revalidatePath("/admin/abonnements");
  if (result.restaurantId) {
    revalidatePath(`/admin/restaurants/${result.restaurantId}`);
  }
}

export async function reactiverAbonnementAction(partnerAccountId: string) {
  const session = await getAdminSession();
  const outcome = await reactivatePartnerSubscription(
    session.userId,
    partnerAccountId,
  );

  if (!outcome.reactivated) {
    throw new Error("Cet abonnement a expiré pendant sa suspension et ne peut plus être réactivé");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/abonnements");
  if (outcome.restaurantId) {
    revalidatePath(`/admin/restaurants/${outcome.restaurantId}`);
  }
}
