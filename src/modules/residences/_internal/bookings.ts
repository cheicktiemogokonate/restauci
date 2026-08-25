import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  residenceReservations,
  residences,
  residenceUnavailablePeriods,
} from "@/lib/db/schema";
import type { DbExecutor, TransactionExecutor } from "@/lib/db/transaction";
import type {
  ResidenceAvailabilityDTO,
  ResidenceReservationDTO,
  ResidenceUnavailablePeriodDTO,
} from "../contracts";
import { getResidenceReservationTemporalStatus } from "../model";

export async function lockResidenceRecord(
  tx: TransactionExecutor,
  residenceId: string,
) {
  await tx.execute(
    sql`SELECT id FROM ${residences} WHERE id = ${residenceId} FOR UPDATE`,
  );
}

export async function getResidenceBookingContextRecord(
  residenceId: string,
  executor: DbExecutor = db,
) {
  return executor.query.residences.findFirst({
    where: eq(residences.id, residenceId),
    with: { images: { orderBy: (image, { asc: orderAsc }) => [orderAsc(image.sortOrder)] } },
  });
}

export async function hasResidenceConflictRecord(
  executor: DbExecutor,
  input: { residenceId: string; checkIn: string; checkOut: string },
) {
  const [reservation, ownerBlock] = await Promise.all([
    executor.query.residenceReservations.findFirst({
      where: and(
        eq(residenceReservations.residenceId, input.residenceId),
        ne(residenceReservations.status, "annulee"),
        sql`${residenceReservations.checkIn} < ${input.checkOut}`,
        sql`${residenceReservations.checkOut} > ${input.checkIn}`,
      ),
      columns: { id: true },
    }),
    executor.query.residenceUnavailablePeriods.findFirst({
      where: and(
        eq(residenceUnavailablePeriods.residenceId, input.residenceId),
        sql`${residenceUnavailablePeriods.checkIn} < ${input.checkOut}`,
        sql`${residenceUnavailablePeriods.checkOut} > ${input.checkIn}`,
      ),
      columns: { id: true },
    }),
  ]);
  return Boolean(reservation || ownerBlock);
}

export async function createResidenceReservationRecord(
  tx: TransactionExecutor,
  input: typeof residenceReservations.$inferInsert,
) {
  const [created] = await tx
    .insert(residenceReservations)
    .values(input)
    .returning();
  return created!;
}

export async function getResidenceAvailabilityRecord(
  residenceId: string,
  executor: DbExecutor = db,
): Promise<ResidenceAvailabilityDTO> {
  const [reservations, ownerBlocks] = await Promise.all([
    executor.query.residenceReservations.findMany({
      where: and(
        eq(residenceReservations.residenceId, residenceId),
        ne(residenceReservations.status, "annulee"),
      ),
      columns: { checkIn: true, checkOut: true },
      orderBy: [asc(residenceReservations.checkIn)],
    }),
    executor.query.residenceUnavailablePeriods.findMany({
      where: eq(residenceUnavailablePeriods.residenceId, residenceId),
      columns: { checkIn: true, checkOut: true },
      orderBy: [asc(residenceUnavailablePeriods.checkIn)],
    }),
  ]);
  return {
    residenceId,
    unavailable: [
      ...reservations.map((item) => ({ ...item, source: "reservation" as const })),
      ...ownerBlocks.map((item) => ({ ...item, source: "owner_block" as const })),
    ].sort((first, second) => first.checkIn.localeCompare(second.checkIn)),
  };
}

type ReservationProjection = NonNullable<Awaited<ReturnType<typeof getReservationProjectionRecord>>>;

function toReservationDTO(
  row: ReservationProjection,
  today: string,
): ResidenceReservationDTO {
  const payment = row.financialTransaction?.payments
    .slice()
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())[0];
  return {
    id: row.id,
    residenceId: row.residenceId,
    residenceSlug: row.residence.slug,
    residenceTitle: row.residence.title,
    residenceCity: row.residence.city,
    residenceCoverUrl: row.residence.images[0]?.url ?? null,
    partnerAccountId: row.partnerAccountId,
    clientId: row.clientId,
    clientName: row.client.nom,
    clientPhone: row.client.telephone,
    status: row.status,
    temporalStatus: getResidenceReservationTemporalStatus({
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      today,
    }),
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    nights: row.nights,
    guests: row.guests,
    pricePerNightSnapshotFcfa: row.pricePerNightSnapshotFcfa,
    subtotalFcfa: row.subtotalFcfa,
    totalFcfa: row.totalFcfa,
    commissionRateBpsSnapshot: row.commission?.rateBpsSnapshot ?? 0,
    commissionAmountFcfa: row.commission?.amountFcfa ?? 0,
    paymentMethod:
      payment?.method === "card" ? "card" : "mobile_money",
    paymentStatus: payment?.status ?? "pending",
    checkoutUrl: payment?.checkoutUrl ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getReservationProjectionRecord(
  residenceReservationId: string,
  executor: DbExecutor = db,
) {
  return executor.query.residenceReservations.findFirst({
    where: eq(residenceReservations.id, residenceReservationId),
    with: {
      residence: { with: { images: { orderBy: (image, { asc: orderAsc }) => [orderAsc(image.sortOrder)] } } },
      client: true,
      commission: true,
      financialTransaction: { with: { payments: true } },
    },
  });
}

export async function getResidenceReservationDTORecord(
  reservationId: string,
  today: string,
  executor: DbExecutor = db,
) {
  const row = await getReservationProjectionRecord(reservationId, executor);
  return row ? toReservationDTO(row, today) : null;
}

export async function listClientResidenceReservationDTORecords(
  clientId: string,
  today: string,
) {
  const rows = await db.query.residenceReservations.findMany({
    where: eq(residenceReservations.clientId, clientId),
    with: {
      residence: { with: { images: { orderBy: (image, { asc: orderAsc }) => [orderAsc(image.sortOrder)] } } },
      client: true,
      commission: true,
      financialTransaction: { with: { payments: true } },
    },
    orderBy: [desc(residenceReservations.createdAt)],
  });
  return rows.map((row) => toReservationDTO(row, today));
}

export async function listPartnerResidenceReservationDTORecords(
  partnerAccountId: string,
  today: string,
) {
  const rows = await db.query.residenceReservations.findMany({
    where: eq(residenceReservations.partnerAccountId, partnerAccountId),
    with: {
      residence: { with: { images: { orderBy: (image, { asc: orderAsc }) => [orderAsc(image.sortOrder)] } } },
      client: true,
      commission: true,
      financialTransaction: { with: { payments: true } },
    },
    orderBy: [desc(residenceReservations.createdAt)],
  });
  return rows.map((row) => toReservationDTO(row, today));
}

export async function createResidenceUnavailablePeriodRecord(
  tx: TransactionExecutor,
  input: {
    residenceId: string;
    checkIn: string;
    checkOut: string;
    reason: string | null;
    now: Date;
  },
) {
  const [created] = await tx
    .insert(residenceUnavailablePeriods)
    .values(input)
    .returning();
  return created!;
}

export async function listResidenceUnavailablePeriodRecords(
  residenceId: string,
): Promise<ResidenceUnavailablePeriodDTO[]> {
  const rows = await db.query.residenceUnavailablePeriods.findMany({
    where: eq(residenceUnavailablePeriods.residenceId, residenceId),
    orderBy: [asc(residenceUnavailablePeriods.checkIn)],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function deleteResidenceUnavailablePeriodRecord(
  tx: TransactionExecutor,
  input: { periodId: string; residenceId: string },
) {
  const [deleted] = await tx
    .delete(residenceUnavailablePeriods)
    .where(
      and(
        eq(residenceUnavailablePeriods.id, input.periodId),
        eq(residenceUnavailablePeriods.residenceId, input.residenceId),
      ),
    )
    .returning({ id: residenceUnavailablePeriods.id });
  return Boolean(deleted);
}

export async function confirmResidenceReservationRecord(
  tx: TransactionExecutor,
  reservationId: string,
  now: Date,
) {
  const [updated] = await tx
    .update(residenceReservations)
    .set({ status: "confirmee", confirmedAt: now, updatedAt: now })
    .where(
      and(
        eq(residenceReservations.id, reservationId),
        eq(residenceReservations.status, "en_attente_paiement"),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function cancelResidenceReservationRecord(
  tx: TransactionExecutor,
  reservationId: string,
  now: Date,
) {
  const [updated] = await tx
    .update(residenceReservations)
    .set({ status: "annulee", cancelledAt: now, updatedAt: now })
    .where(
      and(
        eq(residenceReservations.id, reservationId),
        ne(residenceReservations.status, "annulee"),
      ),
    )
    .returning();
  return updated ?? null;
}
