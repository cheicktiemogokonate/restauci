import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  persistNotification,
  sendClientExpoPush,
} from "@/lib/notifications";
import { clients, partnerAccounts, residenceReservations } from "@/lib/db/schema";
import { transactionalDb } from "@/lib/db/transaction";
import { getPartnerIdentityVerification } from "@/modules/identity/server";
import { getResidenceQuotaEligibility } from "@/modules/quotas/server";
import {
  getServiceMarketCapability,
  resolveServiceMarketAtCoordinates,
} from "@/modules/service-markets/server";

import {
  listAdminResidencesSchema,
  publicResidenceSearchSchema,
  rejectResidenceSchema,
  residenceIdSchema,
  residenceSlugSchema,
  saveResidenceSchema,
  suspendResidenceSchema,
  type ListAdminResidencesInput,
  type CreateResidenceReservationInput,
  type PartnerResidenceDTO,
  type PartnerResidenceWithPublicationDTO,
  type PublicResidenceDTO,
  type PublicResidenceSearchInput,
  type PublicResidenceSearchResultDTO,
  type ResidenceStayInput,
  type ResidenceUnavailablePeriodInput,
  type SaveResidenceInput,
  createResidenceReservationSchema,
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
  type PublicResidenceDiscoveryRecord,
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
} from "./_internal/bookings";
import {
  evaluateResidenceVisibility,
  getTodayInAbidjan,
  validateResidenceStay,
  ResidenceDomainError,
  type ResidenceDestinationStatus,
  type ResidenceOwnerIdentityStatus,
} from "./model";
import type { DbExecutor } from "@/lib/db/transaction";
import {
  cancelTransactionInTransaction,
  createPaymentAttemptInTransaction,
  createTransactionInTransaction,
  getActivePaystackProviderAccount,
  getResidenceReservationTransactionInTransaction,
  hasActivePaystackProviderAccount,
} from "@/modules/transactions/server";
import {
  initializePreparedPaystackPayment,
  retryResidencePaystackPayment,
} from "@/modules/transactions/payment-service";
import {
  createResidenceCommissionInTransaction,
  voidPendingResidenceCommissionInTransaction,
} from "@/modules/commissions/server";
import {
  getDiscoveryRankingConfiguration,
  issueDiscoveryAttributions,
  recordDiscoveryConversion,
} from "@/modules/discovery/server";
import { rankDiscoveryPage } from "@/modules/discovery/ranking";

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
  const [verification, destinations] = await Promise.all([
    getPartnerIdentityVerification(partnerAccountId, {
      executor: options.executor,
    }),
    Promise.all(
      partnerResidences.map((residence) =>
        evaluateResidenceDestination(residence, options.executor),
      ),
    ),
  ]);
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
        baseEvaluations[index]!.blockers.length === 0 &&
        residence.publicationEnabledAt !== null,
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
) {
  const residenceRecords = await listPartnerResidenceRecords(partnerAccountId);
  return composePartnerResidencePublication(partnerAccountId, residenceRecords);
}

export async function listPublicResidences() {
  return (await searchPublicResidences({ page: 1, limit: 48 })).items;
}

async function rankPublicResidenceRecords(
  records: PublicResidenceDiscoveryRecord[],
  input: PublicResidenceSearchInput,
  configuration: Awaited<ReturnType<typeof getDiscoveryRankingConfiguration>>,
): Promise<PublicResidenceSearchResultDTO> {
  const ranking = rankDiscoveryPage({
    candidates: records.map((record) => record.candidate),
    ...configuration,
    context: {
      contextKey: [
        "residence",
        input.destination?.toLocaleLowerCase("fr") ?? "all",
        input.checkIn ?? "any-date",
        input.checkOut ?? "any-date",
        input.guests ?? "any-guests",
      ].join(":"),
      page: input.page,
      pageSize: input.limit,
      at: new Date(),
    },
  });
  const recordById = new Map(records.map((record) => [record.item.id, record]));
  const contextKey = [
    "residence",
    input.destination?.toLocaleLowerCase("fr") ?? "all",
    input.checkIn ?? "any-date",
    input.checkOut ?? "any-date",
    input.guests ?? "any-guests",
  ].join(":");
  const tokens = await issueDiscoveryAttributions(
    ranking.items.map((ranked) => {
      const record = recordById.get(ranked.resourceId);
      if (!record) {
        throw new Error(`Résidence classée introuvable : ${ranked.resourceId}`);
      }
      return {
        ...ranked,
        contextKey,
        destinationPath: `/residences/${record.item.slug}`,
      };
    }),
  );
  return {
    items: ranking.items.map((ranked) => {
      const record = recordById.get(ranked.resourceId);
      if (!record) throw new Error(`Résidence classée introuvable : ${ranked.resourceId}`);
      return {
        ...record.item,
        placement: ranked.placement,
        partnerBadgeEnabled:
          configuration.benefitsByPlan[ranked.planCode].partnerBadgeEnabled,
        discoveryToken: tokens.get(ranked.resourceId) ?? "",
      };
    }),
    total: ranking.total,
    page: input.page,
    limit: input.limit,
    totalPages: ranking.totalPages,
  };
}

export async function searchPublicResidences(input: PublicResidenceSearchInput) {
  const parsed = publicResidenceSearchSchema.parse(input);
  const [records, configuration] = await Promise.all([
    searchPublicResidenceRecords(parsed),
    getDiscoveryRankingConfiguration("residence"),
  ]);
  return rankPublicResidenceRecords(records, parsed, configuration);
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
  const [composed, hasProviderAccount] = await Promise.all([
    composePartnerResidencePublication(context.partnerAccountId, records, {
      executor,
      persistFirstPublished: false,
    }),
    hasActivePaystackProviderAccount(context.partnerAccountId, executor),
  ]);
  const residence = composed.find((item) => item.id === residenceId);
  if (!residence?.publication.isPubliclyVisible) return null;
  return {
    partnerAccountId: context.partnerAccountId,
    residence,
    publicResidence: toPublicResidenceDTO(residence, hasProviderAccount),
  };
}

async function assertActiveResident(clientId: string, executor: DbExecutor = db) {
  const client = await executor.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.actif, true)),
    columns: { id: true },
  });
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
    await Promise.all([
      persistNotification(tx, {
        clientId,
        type: "systeme",
        titre: "Réservation créée",
        message: `Votre séjour à ${context.residence.title} attend le paiement Paystack.`,
        lienType: "reservation_residence",
        lienId: reservation.id,
      }),
      partner
        ? persistNotification(tx, {
            userId: partner.userId,
            type: "systeme",
            titre: "Nouvelle demande de réservation",
            message: `${context.residence.title} est demandé du ${parsed.checkIn} au ${parsed.checkOut}.`,
            lienType: "reservation_residence",
            lienId: reservation.id,
          })
        : Promise.resolve(),
    ]);
    return { reservationId: reservation.id, paymentId: payment.id };
  });
  await recordDiscoveryConversion({
    token: parsed.discoveryToken,
    activityType: "residence",
    resourceId: parsed.residenceId,
    conversionReferenceId: prepared.reservationId,
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
    if (reservation.status === "annulee") return reservation;
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
    const cancelledReservation = await cancelResidenceReservationRecord(
      tx,
      parsedId,
      now,
    );
    const partner = await tx.query.partnerAccounts.findFirst({
      where: eq(partnerAccounts.id, reservation.partnerAccountId),
      columns: { userId: true },
    });
    await Promise.all([
      persistNotification(tx, {
        clientId,
        type: "systeme",
        titre: "Réservation annulée",
        message: "Votre réservation de résidence a été annulée.",
        lienType: "reservation_residence",
        lienId: parsedId,
      }),
      partner
        ? persistNotification(tx, {
            userId: partner.userId,
            type: "systeme",
            titre: "Réservation annulée",
            message: `Le séjour du ${reservation.checkIn} au ${reservation.checkOut} a été annulé.`,
            lienType: "reservation_residence",
            lienId: parsedId,
          })
        : Promise.resolve(),
    ]);
    return cancelledReservation;
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
    return createResidenceUnavailablePeriodRecord(tx, { ...parsed, now });
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
    return deleteResidenceUnavailablePeriodRecord(tx, {
      periodId: parsedPeriodId,
      residenceId: parsedResidenceId,
    });
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
  return createResidenceRecord(partnerAccountId, saveResidenceSchema.parse(input));
}

export function updateResidence(
  partnerAccountId: string,
  residenceId: string,
  input: SaveResidenceInput,
) {
  return updateResidenceRecord(
    partnerAccountId,
    residenceIdSchema.parse(residenceId),
    saveResidenceSchema.parse(input),
  );
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
      return { ...current, publicationEnabledAt: null };
    },
  );
}

export function listAdminResidences(input: ListAdminResidencesInput) {
  return listAdminResidenceRecords(listAdminResidencesSchema.parse(input));
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
