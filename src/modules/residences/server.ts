import "server-only";

export {
  confirmResidenceReservationPaymentInTransaction,
  sendConfirmedResidenceReservationPush,
} from "./_internal/payment-lifecycle";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { sendClientExpoPush } from "@/modules/notifications/server";
import { persistNotification } from "@/modules/notifications/server";
import { partnerAccounts, residenceReservations } from "@/infrastructure/db/schema";
import { transactionalDb } from "@/infrastructure/db/transaction";
import { getPartnerIdentityVerification } from "@/modules/identity/server";
import {
  getEffectiveResidenceQuota,
  getResidenceQuotaEligibility,
} from "@/modules/quotas/server";
import {
  getServiceMarketCapability,
  resolveServiceMarketAtCoordinates,
} from "@/modules/service-markets/server";
import { getClientOrderIdentity } from "@/modules/clients/server";

import {
  cancelPartnerResidenceReservationSchema,
  createResidenceReservationSchema,
  listAdminResidencesSchema,
  publicResidenceSearchSchema,
  rejectResidenceSchema,
  residenceIdSchema,
  residenceSlugSchema,
  saveResidenceSchema,
  suspendResidenceSchema,
  updatePartnerResidenceReservationSchema,
  type CancelPartnerResidenceReservationInput,
  type CreateResidenceReservationInput,
  type ListAdminResidencesInput,
  type AdminResidenceListItemWithPublicationDTO,
  type PartnerResidenceDTO,
  type PartnerResidenceWithPublicationDTO,
  type PublicResidenceDTO,
  type PublicResidenceSearchInput,
  type ResidenceStayInput,
  type ResidenceUnavailablePeriodInput,
  type SaveResidenceInput,
  type UpdatePartnerResidenceReservationInput,
  residenceStaySchema,
  residenceUnavailablePeriodIdSchema,
  residenceUnavailablePeriodSchema,
} from "./contracts";
import {
  approveResidenceRecord,
  createResidenceRecord,
  getAdminResidenceRecord,
  getPartnerResidenceRecord,
  getResidencePartnerIdBySlugRecord,
  listAdminResidenceRecords,
  listPartnerResidenceRecords,
  markResidenceFirstPublishedRecords,
  reactivateResidenceRecord,
  rejectResidenceRecord,
  suspendResidenceRecord,
  updateResidenceRecord,
  setResidencePublicationEnabledRecord,
  withPartnerResidencePublicationTransaction,
} from "./_internal/persistence";
import {
  searchPublicResidenceRecords,
} from "./_internal/search";
import {
  cancelResidenceReservationRecord,
  createResidenceReservationRecord,
  createResidenceUnavailablePeriodRecord,
  deleteResidenceUnavailablePeriodRecord,
  getResidenceAvailabilityRecord,
  getResidenceBookingContextRecord,
  getResidenceReservationDTORecord,
  hasResidenceConflictRecord,
  listClientResidenceReservationDTORecords,
  listPartnerResidenceReservationDTORecords,
  listResidenceUnavailablePeriodRecords,
  lockResidenceRecord,
  updateResidenceReservationStayRecord,
} from "./_internal/bookings";
import {
  consumesResidencePublicationQuota,
  evaluateResidenceVisibility,
  getTodayInAbidjan,
  validateResidenceStay,
  ResidenceDomainError,
  type ResidenceDestinationStatus,
  type ResidenceOwnerIdentityStatus,
} from "./model";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import {
  cancelTransactionInTransaction,
  createRefundObligationInTransaction,
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
  getActivePaystackProviderAccount,
  getResidenceReservationTransactionInTransaction,
  hasActivePaystackProviderAccount,
} from "@/modules/transactions/server";
import {
  initializePreparedPaystackPayment,
  retryResidencePaystackPayment,
} from "@/modules/payments/server";
import {
  createResidenceCommissionInTransaction,
  voidPendingResidenceCommissionInTransaction,
} from "@/modules/commissions/server";
import { isManagedPublicMediaUrl } from "@/infrastructure/storage/r2";
import { persistResidenceEvent } from "./_internal/events";

type DestinationEvaluation = {
  status: ResidenceDestinationStatus;
  serviceMarketId: string | null;
  serviceMarketName: string | null;
};

async function evaluateResidenceDestination(
  residence: PartnerResidenceDTO,
  executor?: DbExecutor,
): Promise<DestinationEvaluation> {
  if (residence.latitude === null || residence.longitude === null) {
    return {
      status: "missing",
      serviceMarketId: null,
      serviceMarketName: null,
    };
  }

  const resolution = await resolveServiceMarketAtCoordinates(
    { lat: residence.latitude, lng: residence.longitude },
    executor,
  );
  if (resolution.status === "ambiguous_market") {
    return {
      status: "ambiguous",
      serviceMarketId: null,
      serviceMarketName: null,
    };
  }
  if (resolution.status !== "resolved") {
    return {
      status: "unserved",
      serviceMarketId: null,
      serviceMarketName: null,
    };
  }

  const capability = await getServiceMarketCapability(
    resolution.market.id,
    "residence",
    executor,
  );
  return {
    status: capability?.status === "active" ? "eligible" : "capability_unavailable",
    serviceMarketId: resolution.market.id,
    serviceMarketName: resolution.market.name,
  };
}

async function composePartnerResidencePublication(
  partnerAccountId: string,
  partnerResidences: PartnerResidenceDTO[],
  options: { executor?: DbExecutor; persistFirstPublished?: boolean } = {},
): Promise<PartnerResidenceWithPublicationDTO[]> {
  // Cette projection est aussi appelée pendant la transaction de réservation.
  // node-postgres n'autorise pas plusieurs requêtes simultanées sur le même
  // client réservé, donc les lectures restent volontairement séquentielles.
  const verification = await getPartnerIdentityVerification(partnerAccountId, {
    executor: options.executor,
  });
  const destinations: Array<
    Awaited<ReturnType<typeof evaluateResidenceDestination>>
  > = [];
  for (const residence of partnerResidences) {
    destinations.push(
      await evaluateResidenceDestination(residence, options.executor),
    );
  }
  const ownerIdentityStatus: ResidenceOwnerIdentityStatus =
    verification?.status ?? "not_submitted";

  const baseEvaluations = partnerResidences.map((residence, index) =>
    evaluateResidenceVisibility({
      publicationIntent: residence.publicationIntent,
      publicationEnabled: true,
      moderationStatus: residence.moderationStatus,
      ownerIdentityStatus,
      destinationStatus: destinations[index]!.status,
      quotaEligible: null,
    }),
  );
  const quotaCandidates = partnerResidences
    .filter(
      (residence, index) =>
        consumesResidencePublicationQuota({
          publicationIntent: residence.publicationIntent,
          publicationEnabled: residence.publicationEnabledAt !== null,
          moderationStatus: residence.moderationStatus,
          ownerIdentityStatus,
          destinationStatus: destinations[index]!.status,
        }),
    )
    .map((residence) => ({
      id: residence.id,
      publicationIntent: true,
      createdAt: new Date(residence.createdAt),
      firstPublishedAt: residence.firstPublishedAt
        ? new Date(residence.firstPublishedAt)
        : null,
    }));
  const quota = await getResidenceQuotaEligibility(
    partnerAccountId,
    quotaCandidates,
    { executor: options.executor },
  );
  const quotaAvailable =
    quota.maxPublicResidences === null ||
    quota.candidateCount < quota.maxPublicResidences;
  const now = new Date();

  const composed = partnerResidences.map((residence, index) => {
    const baseEligible = baseEvaluations[index]!.blockers.length === 0;
    const quotaEligible = baseEligible
      ? residence.publicationEnabledAt
        ? quota.residenceIds.has(residence.id)
        : null
      : null;
    const publicationEnabled = residence.publicationEnabledAt !== null;
    const evaluation =
      baseEligible && !publicationEnabled && !quotaAvailable
        ? evaluateResidenceVisibility({
            publicationIntent: residence.publicationIntent,
            publicationEnabled: true,
            moderationStatus: residence.moderationStatus,
            ownerIdentityStatus,
            destinationStatus: destinations[index]!.status,
            quotaEligible: false,
          })
        : evaluateResidenceVisibility({
            publicationIntent: residence.publicationIntent,
            publicationEnabled,
            moderationStatus: residence.moderationStatus,
            ownerIdentityStatus,
            destinationStatus: destinations[index]!.status,
            quotaEligible,
          });
    return {
      ...residence,
      firstPublishedAt:
        evaluation.isPubliclyVisible && !residence.firstPublishedAt
          ? now.toISOString()
          : residence.firstPublishedAt,
      publication: {
        ...evaluation,
        publicationEnabled,
        canPublish: baseEligible && !publicationEnabled && quotaAvailable,
        ownerIdentityStatus,
        destinationStatus: destinations[index]!.status,
        serviceMarketId: destinations[index]!.serviceMarketId,
        serviceMarketName: destinations[index]!.serviceMarketName,
        quota: {
          planCode: quota.planCode,
          maxPublicResidences: quota.maxPublicResidences,
          eligible: quotaEligible,
          available: quotaAvailable,
        },
      },
    } satisfies PartnerResidenceWithPublicationDTO;
  });

  const previouslyUnpublishedIds = new Set(
    partnerResidences
      .filter((residence) => !residence.firstPublishedAt)
      .map((residence) => residence.id),
  );
  if (options.persistFirstPublished !== false) {
    await markResidenceFirstPublishedRecords(
      partnerAccountId,
      composed
        .filter(
          (residence) =>
            residence.publication.isPubliclyVisible &&
            previouslyUnpublishedIds.has(residence.id),
        )
        .map((residence) => residence.id),
      now,
      options.executor,
    );
  }
  return composed;
}

function toPublicResidenceDTO(
  residence: PartnerResidenceWithPublicationDTO,
  hasProviderAccount: boolean,
): PublicResidenceDTO {
  if (!residence.publication.isPubliclyVisible || !residence.firstPublishedAt) {
    throw new Error("Une résidence non publique ne peut pas être projetée publiquement");
  }
  return {
    id: residence.id,
    slug: residence.slug,
    title: residence.title,
    description: residence.description,
    pricePerNightFcfa: residence.pricePerNightFcfa,
    maxGuests: residence.maxGuests,
    city: residence.city,
    country: residence.country,
    firstPublishedAt: residence.firstPublishedAt,
    photos: residence.photos,
    bookability: {
      isBookable: hasProviderAccount,
      blockers: hasProviderAccount ? [] : ["provider_account_missing"],
    },
    placement: "organic",
    partnerBadgeEnabled: false,
    discoveryToken: "",
  };
}

export function listPartnerResidences(partnerAccountId: string) {
  return listPartnerResidenceRecords(partnerAccountId);
}

export async function listPartnerResidencesWithPublication(
  partnerAccountId: string,
  options: { persistFirstPublished?: boolean } = {},
) {
  const residenceRecords = await listPartnerResidenceRecords(partnerAccountId);
  return composePartnerResidencePublication(partnerAccountId, residenceRecords, {
    persistFirstPublished: options.persistFirstPublished,
  });
}

export async function getPartnerResidenceManagementWorkspace(
  partnerAccountId: string,
) {
  const residences = await listPartnerResidencesWithPublication(partnerAccountId);
  const effectiveQuota = residences[0]?.publication.quota ??
    (await getEffectiveResidenceQuota(partnerAccountId));
  const visibleCount = residences.filter(
    (residence) => residence.publication.isPubliclyVisible,
  ).length;
  return {
    residences,
    visibleCount,
    quota: {
      planCode: effectiveQuota.planCode,
      maxPublicResidences: effectiveQuota.maxPublicResidences,
      used: visibleCount,
      available:
        effectiveQuota.maxPublicResidences === null ||
        visibleCount < effectiveQuota.maxPublicResidences,
    },
  };
}

export async function getAdminResidenceAccountSummary(
  partnerAccountId: string,
) {
  const residenceRecords = await listPartnerResidenceRecords(partnerAccountId);
  const [composed, quota] = await Promise.all([
    composePartnerResidencePublication(partnerAccountId, residenceRecords, {
      persistFirstPublished: false,
    }),
    getEffectiveResidenceQuota(partnerAccountId),
  ]);
  return {
    residences: composed.map((residence) => ({
      id: residence.id,
      title: residence.title,
      moderationStatus: residence.moderationStatus,
      isPubliclyVisible: residence.publication.isPubliclyVisible,
    })),
    visibleCount: composed.filter(
      (residence) => residence.publication.isPubliclyVisible,
    ).length,
    quota: {
      planCode: quota.planCode,
      maxPublicResidences: quota.maxPublicResidences,
    },
  };
}

export async function getResidenceDiscoveryEligibility(
  input: PublicResidenceSearchInput,
) {
  const parsed = publicResidenceSearchSchema.parse(input);
  return searchPublicResidenceRecords(parsed);
}

export async function getPublicResidenceBySlug(slug: string) {
  const parsed = residenceSlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  const parsedSlug = parsed.data;
  const partnerAccountId = await getResidencePartnerIdBySlugRecord(parsedSlug);
  if (!partnerAccountId) return null;
  const [records, hasProviderAccount] = await Promise.all([
    listPartnerResidenceRecords(partnerAccountId),
    hasActivePaystackProviderAccount(partnerAccountId),
  ]);
  const composed = await composePartnerResidencePublication(partnerAccountId, records);
  const residence = composed.find(
    (item) => item.slug === parsedSlug && item.publication.isPubliclyVisible,
  );
  return residence
    ? toPublicResidenceDTO(residence, hasProviderAccount)
    : null;
}

async function getPublicResidenceById(
  residenceId: string,
  executor: DbExecutor = db,
) {
  const context = await getResidenceBookingContextRecord(residenceId, executor);
  if (!context || context.archivedAt) return null;
  const records = await listPartnerResidenceRecords(
    context.partnerAccountId,
    executor,
  );
  const composed = await composePartnerResidencePublication(
    context.partnerAccountId,
    records,
    {
      executor,
      persistFirstPublished: false,
    },
  );
  const hasProviderAccount = await hasActivePaystackProviderAccount(
    context.partnerAccountId,
    executor,
  );
  const residence = composed.find((item) => item.id === residenceId);
  if (!residence?.publication.isPubliclyVisible) return null;
  return {
    partnerAccountId: context.partnerAccountId,
    residence,
    publicResidence: toPublicResidenceDTO(residence, hasProviderAccount),
  };
}

async function assertActiveResident(clientId: string, executor: DbExecutor = db) {
  const client = await getClientOrderIdentity(clientId, { executor });
  if (!client) {
    throw new ResidenceDomainError(
      "RESIDENCE_NOT_BOOKABLE",
      "Votre compte client doit être actif pour réserver.",
    );
  }
}

export async function getPublicResidenceAvailability(residenceId: string) {
  const parsedId = residenceIdSchema.parse(residenceId);
  const residence = await getPublicResidenceById(parsedId);
  if (!residence) {
    throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
  }
  return getResidenceAvailabilityRecord(parsedId);
}

export async function getPartnerResidenceAvailability(
  partnerAccountId: string,
  residenceId: string,
) {
  const parsedId = residenceIdSchema.parse(residenceId);
  const residence = await getPartnerResidenceRecord(
    partnerAccountId,
    parsedId,
  );
  if (!residence) {
    throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
  }
  return getResidenceAvailabilityRecord(parsedId);
}

export async function getResidenceStayQuote(input: ResidenceStayInput) {
  const parsed = residenceStaySchema.parse(input);
  const context = await getPublicResidenceById(parsed.residenceId);
  if (!context) {
    throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
  }
  const { nights } = validateResidenceStay({
    ...parsed,
    maxGuests: context.residence.maxGuests,
    today: getTodayInAbidjan(),
  });
  const available = !(await hasResidenceConflictRecord(db, parsed));
  const subtotalFcfa = context.residence.pricePerNightFcfa * nights;
  return {
    residenceId: parsed.residenceId,
    checkIn: parsed.checkIn,
    checkOut: parsed.checkOut,
    nights,
    guests: parsed.guests,
    pricePerNightFcfa: context.residence.pricePerNightFcfa,
    subtotalFcfa,
    totalFcfa: subtotalFcfa,
    available,
    bookabilityBlockers: context.publicResidence.bookability.blockers,
  };
}

export async function createResidenceReservation(
  clientId: string,
  input: CreateResidenceReservationInput,
  options: { returnChannel?: "web" | "mobile" } = {},
) {
  const parsed = createResidenceReservationSchema.parse(input);
  const now = new Date();
  const prepared = await transactionalDb.transaction(async (tx) => {
    await assertActiveResident(clientId, tx);
    await lockResidenceRecord(tx, parsed.residenceId);
    const context = await getPublicResidenceById(parsed.residenceId, tx);
    if (!context) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_BOOKABLE",
        "Cette résidence n’est pas disponible à la réservation.",
      );
    }
    const providerAccount = await getActivePaystackProviderAccount(
      context.partnerAccountId,
      tx,
    );
    if (!providerAccount) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_BOOKABLE",
        "Le paiement en ligne de cette résidence n’est pas encore disponible.",
      );
    }
    const { nights } = validateResidenceStay({
      ...parsed,
      maxGuests: context.residence.maxGuests,
      today: getTodayInAbidjan(now),
    });
    if (await hasResidenceConflictRecord(tx, parsed)) {
      throw new ResidenceDomainError(
        "RESIDENCE_UNAVAILABLE",
        "Ces dates ne sont plus disponibles.",
      );
    }
    const totalFcfa = context.residence.pricePerNightFcfa * nights;
    if (!Number.isSafeInteger(totalFcfa)) {
      throw new ResidenceDomainError(
        "RESIDENCE_STAY_INVALID",
        "Le montant du séjour est invalide.",
      );
    }
    const reservation = await createResidenceReservationRecord(tx, {
      residenceId: parsed.residenceId,
      partnerAccountId: context.partnerAccountId,
      clientId,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      nights,
      guests: parsed.guests,
      pricePerNightSnapshotFcfa: context.residence.pricePerNightFcfa,
      subtotalFcfa: totalFcfa,
      totalFcfa,
      createdAt: now,
      updatedAt: now,
    });
    await createResidenceCommissionInTransaction(tx, {
      residenceReservationId: reservation.id,
      partnerAccountId: reservation.partnerAccountId,
      baseAmountFcfa: totalFcfa,
      now,
    });
    const transaction = await createTransactionInTransaction(tx, {
      type: "reservation_residence",
      residenceReservationId: reservation.id,
      partnerAccountId: reservation.partnerAccountId,
      clientId,
      amountFcfa: totalFcfa,
    });
    const payment = await createPaymentAttemptInTransaction(tx, {
      transactionId: transaction.id,
      amountFcfa: totalFcfa,
      method: parsed.paymentMethod,
      provider: "paystack",
      providerReference: `toutci-residence-${crypto.randomUUID()}`,
      idempotencyKey: `residence:${reservation.id}:1`,
    });
    const partner = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, reservation.partnerAccountId),
      columns: { userId: true },
    });
    await persistNotification(tx, {
      clientId,
      type: "systeme",
      titre: "Réservation créée",
      message: `Votre séjour à ${context.residence.title} attend le paiement Paystack.`,
      lienType: "reservation_residence",
      lienId: reservation.id,
    });
    if (partner) {
      await persistNotification(tx, {
        userId: partner.userId,
        type: "systeme",
        titre: "Nouvelle demande de réservation",
        message: `${context.residence.title} est demandé du ${parsed.checkIn} au ${parsed.checkOut}.`,
        lienType: "reservation_residence",
        lienId: reservation.id,
      });
    }
    await persistResidenceEvent(tx, {
      type: "residence.reservation.created.v1",
      action: "residence_reservation_created",
      actor: { type: "client", id: clientId },
      partnerAccountId: reservation.partnerAccountId,
      target: { type: "residence_reservation", id: reservation.id },
      payload: {
        residenceId: reservation.residenceId,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights: reservation.nights,
        guests: reservation.guests,
        amountFcfa: reservation.totalFcfa,
      },
      occurredAt: now,
    });
    return { reservationId: reservation.id, paymentId: payment.id };
  });
  const initialized = await initializePreparedPaystackPayment({
    paymentId: prepared.paymentId,
    owner: { clientId },
    returnChannel: options.returnChannel,
  });
  await sendClientExpoPush(clientId, {
    titre: "Réservation créée",
    message: "Votre séjour attend la confirmation du paiement Paystack.",
    data: {
      type: "systeme",
      lienType: "reservation_residence",
      lienId: prepared.reservationId,
    },
  });
  return { ...prepared, checkoutUrl: initialized.authorizationUrl };
}

export function listClientResidenceReservations(clientId: string) {
  return listClientResidenceReservationDTORecords(clientId, getTodayInAbidjan());
}

export function listPartnerResidenceReservations(partnerAccountId: string) {
  return listPartnerResidenceReservationDTORecords(
    partnerAccountId,
    getTodayInAbidjan(),
  );
}

export async function updatePartnerResidenceReservation(
  partnerAccountId: string,
  input: UpdatePartnerResidenceReservationInput,
) {
  const parsed = updatePartnerResidenceReservationSchema.parse(input);
  const now = new Date();
  const today = getTodayInAbidjan(now);
  const updated = await transactionalDb.transaction(async (tx) => {
    const candidate = await tx.query.residenceReservations.findFirst({
      where: and(
        eq(residenceReservations.id, parsed.reservationId),
        eq(residenceReservations.partnerAccountId, partnerAccountId),
      ),
      columns: { residenceId: true },
    });
    if (!candidate) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Réservation introuvable.",
      );
    }

    await lockResidenceRecord(tx, candidate.residenceId);
    await tx.execute(
      sql`SELECT id FROM ${residenceReservations} WHERE id = ${parsed.reservationId} FOR UPDATE`,
    );
    const reservation = await tx.query.residenceReservations.findFirst({
      where: and(
        eq(residenceReservations.id, parsed.reservationId),
        eq(residenceReservations.partnerAccountId, partnerAccountId),
      ),
    });
    if (!reservation) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Réservation introuvable.",
      );
    }
    if (reservation.status === "annulee" || today >= reservation.checkIn) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_EDITABLE",
        "Seule une réservation future et active peut être modifiée.",
      );
    }
    const transaction = await getResidenceReservationTransactionInTransaction(
      tx,
      reservation.id,
    );
    if (!transaction) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Transaction de réservation introuvable.",
      );
    }
    if (transaction.status === "paid") {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_EDITABLE",
        "Une réservation déjà payée ne peut pas être modifiée par le propriétaire.",
      );
    }

    const residence = await getResidenceBookingContextRecord(
      reservation.residenceId,
      tx,
    );
    if (!residence) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_FOUND",
        "Résidence introuvable.",
      );
    }
    const { nights } = validateResidenceStay({
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      guests: parsed.guests,
      maxGuests: residence.maxGuests,
      today,
    });
    if (nights !== reservation.nights) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_EDITABLE",
        `La durée doit rester de ${reservation.nights} nuit${reservation.nights > 1 ? "s" : ""} pour conserver le montant payé.`,
      );
    }
    if (
      await hasResidenceConflictRecord(tx, {
        residenceId: reservation.residenceId,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        excludeReservationId: reservation.id,
      })
    ) {
      throw new ResidenceDomainError(
        "RESIDENCE_UNAVAILABLE",
        "Ces nouvelles dates ne sont pas disponibles.",
      );
    }

    const changed =
      parsed.checkIn !== reservation.checkIn ||
      parsed.checkOut !== reservation.checkOut ||
      parsed.guests !== reservation.guests;
    if (!changed) {
      return {
        reservationId: reservation.id,
        clientId: reservation.clientId,
        residenceTitle: residence.title,
        changed: false,
      };
    }

    const saved = await updateResidenceReservationStayRecord(tx, {
      reservationId: reservation.id,
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      nights,
      guests: parsed.guests,
      now,
    });
    if (!saved) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_EDITABLE",
        "La réservation ne peut plus être modifiée.",
      );
    }
    await persistNotification(tx, {
      clientId: reservation.clientId,
      type: "systeme",
      titre: "Séjour modifié par le propriétaire",
      message: `${residence.title} est désormais réservé du ${parsed.checkIn} au ${parsed.checkOut} pour ${parsed.guests} voyageur${parsed.guests > 1 ? "s" : ""}.`,
      lienType: "reservation_residence",
      lienId: reservation.id,
    });
    await persistResidenceEvent(tx, {
      type: "residence.reservation.updated.v1",
      action: "residence_reservation_updated",
      actor: { type: "partner", id: partnerAccountId },
      partnerAccountId,
      target: { type: "residence_reservation", id: reservation.id },
      payload: {
        residenceId: reservation.residenceId,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        nights,
        guests: parsed.guests,
      },
      occurredAt: now,
    });
    return {
      reservationId: reservation.id,
      clientId: reservation.clientId,
      residenceTitle: residence.title,
      changed: true,
    };
  });

  if (updated.changed) {
    await sendClientExpoPush(updated.clientId, {
      titre: "Séjour modifié par le propriétaire",
      message: `Les dates de votre séjour à ${updated.residenceTitle} ont été mises à jour.`,
      data: {
        type: "systeme",
        lienType: "reservation_residence",
        lienId: updated.reservationId,
      },
    });
  }
  const reservation = await getResidenceReservationDTORecord(
    updated.reservationId,
    today,
  );
  if (!reservation) {
    throw new ResidenceDomainError(
      "RESIDENCE_RESERVATION_NOT_FOUND",
      "Réservation introuvable après sa modification.",
    );
  }
  return reservation;
}

export async function cancelPartnerResidenceReservation(
  partnerAccountId: string,
  input: CancelPartnerResidenceReservationInput,
) {
  const parsed = cancelPartnerResidenceReservationSchema.parse(input);
  const now = new Date();
  const today = getTodayInAbidjan(now);
  const outcome = await transactionalDb.transaction(async (tx) => {
    const reservation = await tx.query.residenceReservations.findFirst({
      where: and(
        eq(residenceReservations.id, parsed.reservationId),
        eq(residenceReservations.partnerAccountId, partnerAccountId),
      ),
    });
    if (!reservation) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Réservation introuvable.",
      );
    }
    if (reservation.status === "annulee") {
      return {
        reservationId: reservation.id,
        clientId: reservation.clientId,
        changed: false,
        refundObligationId: null,
      };
    }
    if (today >= reservation.checkIn) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "Une réservation commencée ne peut plus être annulée par le propriétaire.",
      );
    }

    const transaction = await getResidenceReservationTransactionInTransaction(
      tx,
      reservation.id,
    );
    if (!transaction) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Transaction de réservation introuvable.",
      );
    }
    if (transaction.status === "pending") {
      await cancelTransactionInTransaction(tx, transaction.id, now);
    }
    if (transaction.status !== "paid") {
      await voidPendingResidenceCommissionInTransaction(tx, reservation.id, now);
    }

    const cancelled = await cancelResidenceReservationRecord(
      tx,
      reservation.id,
      now,
      { source: "partner", reason: parsed.reason },
    );
    if (!cancelled) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "La réservation ne peut plus être annulée.",
      );
    }
    const confirmedPayment = transaction.payments.find(
      (payment) => payment.status === "confirmed",
    );
    if (transaction.status === "paid" && !confirmedPayment) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "Le paiement confirmé de cette réservation est introuvable.",
      );
    }
    const refundObligation = confirmedPayment
      ? await createRefundObligationInTransaction(tx, {
          originalPaymentId: confirmedPayment.id,
          amountFcfa: reservation.totalFcfa,
          refundIdempotencyKey: `residence-cancellation:${reservation.id}`,
          actor: { type: "partner", id: partnerAccountId },
          now,
        })
      : null;
    await persistNotification(tx, {
      clientId: reservation.clientId,
      type: "systeme",
      titre: "Réservation annulée par le propriétaire",
      message: `Motif : ${parsed.reason}.${refundObligation ? " Une obligation de remboursement intégral a été enregistrée pour suivi." : ""}`,
      lienType: "reservation_residence",
      lienId: reservation.id,
    });
    await persistResidenceEvent(tx, {
      type: "residence.reservation.cancelled.v1",
      action: "residence_reservation_cancelled",
      actor: { type: "partner", id: partnerAccountId },
      partnerAccountId,
      target: { type: "residence_reservation", id: reservation.id },
      payload: {
        residenceId: reservation.residenceId,
        paid: transaction.status === "paid",
        refundObligationId: refundObligation?.transaction.id ?? null,
      },
      occurredAt: now,
    });
    return {
      reservationId: reservation.id,
      clientId: reservation.clientId,
      changed: true,
      refundObligationId: refundObligation?.transaction.id ?? null,
    };
  });

  if (outcome.changed) {
    await sendClientExpoPush(outcome.clientId, {
      titre: "Réservation annulée par le propriétaire",
      message: outcome.refundObligationId
        ? "Votre séjour a été annulé et son remboursement intégral est désormais suivi par Toutci."
        : "Votre séjour a été annulé et les dates ont été libérées.",
      data: {
        type: "systeme",
        lienType: "reservation_residence",
        lienId: outcome.reservationId,
      },
    });
  }
  const reservation = await getResidenceReservationDTORecord(
    outcome.reservationId,
    today,
  );
  if (!reservation) {
    throw new ResidenceDomainError(
      "RESIDENCE_RESERVATION_NOT_FOUND",
      "Réservation introuvable après son annulation.",
    );
  }
  return {
    reservation,
    refundObligationId: outcome.refundObligationId,
  };
}

export async function getClientResidenceReservation(
  clientId: string,
  reservationId: string,
) {
  const reservation = await getResidenceReservationDTORecord(
    residenceIdSchema.parse(reservationId),
    getTodayInAbidjan(),
  );
  return reservation?.clientId === clientId ? reservation : null;
}

export function retryClientResidencePayment(input: {
  clientId: string;
  reservationId: string;
  paymentMethod: "mobile_money" | "card";
  returnChannel?: "web" | "mobile";
}) {
  return retryResidencePaystackPayment(input);
}

export async function cancelClientResidenceReservation(
  clientId: string,
  reservationId: string,
) {
  const parsedId = residenceIdSchema.parse(reservationId);
  const now = new Date();
  const cancelled = await transactionalDb.transaction(async (tx) => {
    const reservation = await tx.query.residenceReservations.findFirst({
      where: and(
        eq(residenceReservations.id, parsedId),
        eq(residenceReservations.clientId, clientId),
      ),
    });
    if (!reservation) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Réservation introuvable.",
      );
    }
    if (reservation.status === "annulee") {
      return { reservation, refundObligationId: null };
    }
    if (getTodayInAbidjan(now) >= reservation.checkIn) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "Une réservation commencée ne peut plus être annulée en autonomie.",
      );
    }
    const transaction = await getResidenceReservationTransactionInTransaction(
      tx,
      parsedId,
    );
    if (!transaction) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_FOUND",
        "Transaction de réservation introuvable.",
      );
    }
    if (transaction.status === "pending") {
      await cancelTransactionInTransaction(tx, transaction.id, now);
      await voidPendingResidenceCommissionInTransaction(tx, parsedId, now);
    }
    const confirmedPayment = transaction.payments.find(
      (payment) => payment.status === "confirmed",
    );
    if (transaction.status === "paid" && !confirmedPayment) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "Le paiement confirmé de cette réservation est introuvable.",
      );
    }
    const cancelledReservation = await cancelResidenceReservationRecord(
      tx,
      parsedId,
      now,
      { source: "client", reason: null },
    );
    if (!cancelledReservation) {
      throw new ResidenceDomainError(
        "RESIDENCE_RESERVATION_NOT_CANCELLABLE",
        "La réservation ne peut plus être annulée.",
      );
    }
    const refundObligation = confirmedPayment
      ? await createRefundObligationInTransaction(tx, {
          originalPaymentId: confirmedPayment.id,
          amountFcfa: reservation.totalFcfa,
          refundIdempotencyKey: `residence-cancellation:${reservation.id}`,
          actor: { type: "client", id: clientId },
          now,
        })
      : null;
    const partner = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, reservation.partnerAccountId),
      columns: { userId: true },
    });
    await persistNotification(tx, {
      clientId,
      type: "systeme",
      titre: "Réservation annulée",
      message: refundObligation
        ? "Votre réservation a été annulée et une obligation de remboursement intégral a été enregistrée."
        : "Votre réservation de résidence a été annulée.",
      lienType: "reservation_residence",
      lienId: parsedId,
    });
    if (partner) {
      await persistNotification(tx, {
        userId: partner.userId,
        type: "systeme",
        titre: "Réservation annulée",
        message: `Le séjour du ${reservation.checkIn} au ${reservation.checkOut} a été annulé.${refundObligation ? " Le remboursement intégral est enregistré dans le suivi financier." : ""}`,
        lienType: "reservation_residence",
        lienId: parsedId,
      });
    }
    await persistResidenceEvent(tx, {
      type: "residence.reservation.cancelled.v1",
      action: "residence_reservation_cancelled",
      actor: { type: "client", id: clientId },
      partnerAccountId: reservation.partnerAccountId,
      target: { type: "residence_reservation", id: reservation.id },
      payload: {
        residenceId: reservation.residenceId,
        paid: transaction.status === "paid",
        refundObligationId: refundObligation?.transaction.id ?? null,
      },
      occurredAt: now,
    });
    return {
      reservation: cancelledReservation,
      refundObligationId: refundObligation?.transaction.id ?? null,
    };
  });
  await sendClientExpoPush(clientId, {
    titre: "Réservation annulée",
    message: "Votre réservation de résidence a été annulée.",
    data: {
      type: "systeme",
      lienType: "reservation_residence",
      lienId: parsedId,
    },
  });
  return cancelled;
}

export async function createResidenceUnavailablePeriod(
  partnerAccountId: string,
  input: ResidenceUnavailablePeriodInput,
) {
  const parsed = residenceUnavailablePeriodSchema.parse(input);
  const now = new Date();
  validateResidenceStay({
    ...parsed,
    guests: 1,
    maxGuests: 1,
    today: getTodayInAbidjan(now),
  });
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${partnerAccountId} FOR UPDATE`,
    );
    await lockResidenceRecord(tx, parsed.residenceId);
    const residence = await getPartnerResidenceRecord(
      partnerAccountId,
      parsed.residenceId,
      tx,
    );
    if (!residence) {
      throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
    }
    if (await hasResidenceConflictRecord(tx, parsed)) {
      throw new ResidenceDomainError(
        "RESIDENCE_BLOCK_CONFLICT",
        "Cette période chevauche déjà une réservation ou une indisponibilité.",
      );
    }
    const period = await createResidenceUnavailablePeriodRecord(tx, {
      ...parsed,
      now,
    });
    await persistResidenceEvent(tx, {
      type: "residence.calendar.blocked.v1",
      action: "residence_calendar_blocked",
      actor: { type: "partner", id: partnerAccountId },
      partnerAccountId,
      target: { type: "residence_unavailable_period", id: period.id },
      payload: {
        residenceId: residence.id,
        checkIn: period.checkIn,
        checkOut: period.checkOut,
      },
      occurredAt: now,
    });
    return period;
  });
}

export async function listPartnerResidenceUnavailablePeriods(
  partnerAccountId: string,
  residenceId: string,
) {
  const residence = await getPartnerResidenceRecord(
    partnerAccountId,
    residenceIdSchema.parse(residenceId),
  );
  if (!residence) {
    throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
  }
  return listResidenceUnavailablePeriodRecords(residence.id);
}

export async function deleteResidenceUnavailablePeriod(
  partnerAccountId: string,
  residenceId: string,
  periodId: string,
) {
  const parsedResidenceId = residenceIdSchema.parse(residenceId);
  const parsedPeriodId = residenceUnavailablePeriodIdSchema.parse(periodId);
  return transactionalDb.transaction(async (tx) => {
    const residence = await getPartnerResidenceRecord(
      partnerAccountId,
      parsedResidenceId,
      tx,
    );
    if (!residence) {
      throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
    }
    const deleted = await deleteResidenceUnavailablePeriodRecord(tx, {
      periodId: parsedPeriodId,
      residenceId: parsedResidenceId,
    });
    if (deleted) {
      await persistResidenceEvent(tx, {
        type: "residence.calendar.unblocked.v1",
        action: "residence_calendar_unblocked",
        actor: { type: "partner", id: partnerAccountId },
        partnerAccountId,
        target: {
          type: "residence_unavailable_period",
          id: parsedPeriodId,
        },
        payload: { residenceId: parsedResidenceId },
      });
    }
    return deleted;
  });
}

export function getPartnerResidence(
  partnerAccountId: string,
  residenceId: string,
) {
  return getPartnerResidenceRecord(
    partnerAccountId,
    residenceIdSchema.parse(residenceId),
  );
}

export function createResidence(
  partnerAccountId: string,
  input: SaveResidenceInput,
) {
  const parsed = saveResidenceSchema.parse(input);
  assertManagedResidencePhotos(parsed);
  return createResidenceRecord(partnerAccountId, parsed);
}

export function updateResidence(
  partnerAccountId: string,
  residenceId: string,
  input: SaveResidenceInput,
) {
  const parsed = saveResidenceSchema.parse(input);
  assertManagedResidencePhotos(parsed);
  return updateResidenceRecord(
    partnerAccountId,
    residenceIdSchema.parse(residenceId),
    parsed,
  );
}

function assertManagedResidencePhotos(input: SaveResidenceInput) {
  if (input.photos.some((photo) => !isManagedPublicMediaUrl(photo.url))) {
    throw new ResidenceDomainError(
      "RESIDENCE_MEDIA_INVALID",
      "Chaque photo doit provenir du stockage média sécurisé de la plateforme.",
    );
  }
}

export async function publishResidence(
  partnerAccountId: string,
  residenceId: string,
) {
  const parsedResidenceId = residenceIdSchema.parse(residenceId);
  return withPartnerResidencePublicationTransaction(
    partnerAccountId,
    parsedResidenceId,
    async ({ executor, current, residences }) => {
      if (current.publicationEnabledAt) return current;
      const composed = await composePartnerResidencePublication(
        partnerAccountId,
        residences,
        { executor, persistFirstPublished: false },
      );
      const target = composed.find((residence) => residence.id === current.id);
      if (!target?.publication.canPublish) {
        const quotaExceeded = target?.publication.blockers.includes(
          "quota_exceeded",
        );
        throw new ResidenceDomainError(
          quotaExceeded
            ? "RESIDENCE_QUOTA_EXCEEDED"
            : "RESIDENCE_NOT_PUBLISHABLE",
          quotaExceeded
            ? "Votre offre a atteint sa limite de logements publics. Retirez d’abord une résidence ou changez d’offre."
            : "Cette résidence n’est pas encore prête à être publiée. Consultez les contrôles restants.",
        );
      }
      const publishedAt = new Date();
      await setResidencePublicationEnabledRecord(
        executor,
        partnerAccountId,
        current.id,
        publishedAt,
        current.firstPublishedAt ? undefined : publishedAt,
      );
      await persistResidenceEvent(executor, {
        type: "residence.publication.enabled.v1",
        action: "residence_published",
        actor: { type: "partner", id: partnerAccountId },
        partnerAccountId,
        target: { type: "residence", id: current.id },
        payload: {
          planCode: target.publication.quota.planCode,
          quotaLimit: target.publication.quota.maxPublicResidences,
        },
        occurredAt: publishedAt,
      });
      return { ...current, publicationEnabledAt: publishedAt.toISOString() };
    },
  );
}

export async function withdrawResidence(
  partnerAccountId: string,
  residenceId: string,
) {
  const parsedResidenceId = residenceIdSchema.parse(residenceId);
  return withPartnerResidencePublicationTransaction(
    partnerAccountId,
    parsedResidenceId,
    async ({ executor, current }) => {
      if (!current.publicationEnabledAt) {
        throw new ResidenceDomainError(
          "RESIDENCE_NOT_WITHDRAWABLE",
          "Cette résidence est déjà retirée du catalogue.",
        );
      }
      await setResidencePublicationEnabledRecord(
        executor,
        partnerAccountId,
        current.id,
        null,
      );
      await persistResidenceEvent(executor, {
        type: "residence.publication.withdrawn.v1",
        action: "residence_withdrawn",
        actor: { type: "partner", id: partnerAccountId },
        partnerAccountId,
        target: { type: "residence", id: current.id },
      });
      return { ...current, publicationEnabledAt: null };
    },
  );
}

export function listAdminResidences(input: ListAdminResidencesInput) {
  return listAdminResidenceRecords(listAdminResidencesSchema.parse(input));
}

export async function listAdminResidencesWithPublication(
  input: ListAdminResidencesInput,
) {
  const result = await listAdminResidenceRecords(
    listAdminResidencesSchema.parse(input),
  );
  const partnerIds = [...new Set(result.items.map((item) => item.partnerAccountId))];
  const publicationsByResidence = new Map<
    string,
    AdminResidenceListItemWithPublicationDTO["publication"]
  >();
  await Promise.all(
    partnerIds.map(async (partnerAccountId) => {
      const records = await listPartnerResidenceRecords(partnerAccountId);
      const composed = await composePartnerResidencePublication(
        partnerAccountId,
        records,
        { persistFirstPublished: false },
      );
      for (const residence of composed) {
        publicationsByResidence.set(residence.id, residence.publication);
      }
    }),
  );
  return {
    ...result,
    items: result.items.flatMap((item) => {
      const publication = publicationsByResidence.get(item.id);
      return publication ? [{ ...item, publication }] : [];
    }),
  };
}

export function getAdminResidence(residenceId: string) {
  return getAdminResidenceRecord(residenceIdSchema.parse(residenceId));
}

export async function getAdminResidenceWithPublication(residenceId: string) {
  const residence = await getAdminResidenceRecord(
    residenceIdSchema.parse(residenceId),
  );
  if (!residence) return null;
  const partnerResidences = await listPartnerResidenceRecords(
    residence.partnerAccountId,
  );
  const composed = await composePartnerResidencePublication(
    residence.partnerAccountId,
    partnerResidences,
  );
  const publication = composed.find((item) => item.id === residence.id)?.publication;
  return publication ? { ...residence, publication } : null;
}

export function approveResidence(adminId: string, residenceId: string) {
  return approveResidenceRecord(adminId, residenceIdSchema.parse(residenceId));
}

export function rejectResidence(
  adminId: string,
  input: { residenceId: string; reason: string },
) {
  const parsed = rejectResidenceSchema.parse(input);
  return rejectResidenceRecord(adminId, parsed.residenceId, parsed.reason);
}

export function suspendResidence(
  adminId: string,
  input: { residenceId: string; reason: string },
) {
  const parsed = suspendResidenceSchema.parse(input);
  return suspendResidenceRecord(adminId, parsed.residenceId, parsed.reason);
}

export function reactivateResidence(adminId: string, residenceId: string) {
  return reactivateResidenceRecord(adminId, residenceIdSchema.parse(residenceId));
}
