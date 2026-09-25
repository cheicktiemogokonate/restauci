import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, type DbExecutor, type TransactionExecutor } from "@/infrastructure/db";
import { clients, commandes } from "@/infrastructure/db/schema";

const completedOrderCount = sql<number>`COUNT(${commandes.id}) FILTER (WHERE ${commandes.statut} = 'servie')::integer`;
const completedOrderSpend = sql<number>`COALESCE(SUM(${commandes.total}) FILTER (WHERE ${commandes.statut} = 'servie'), 0)::integer`;

export function findClientAuthRecordByPhone(
  phone: string,
  executor: DbExecutor = db,
) {
  return executor.query.clients.findFirst({
    where: eq(clients.telephone, phone),
    columns: {
      id: true,
      nom: true,
      telephone: true,
      email: true,
      password: true,
      actif: true,
    },
  });
}

export function findClientAuthRecordById(
  clientId: string,
  executor: DbExecutor = db,
) {
  return executor.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: {
      id: true,
      nom: true,
      telephone: true,
      email: true,
      password: true,
      actif: true,
    },
  });
}

export function findClientSessionState(
  clientId: string,
  executor: DbExecutor = db,
) {
  return executor.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: { id: true, actif: true },
  });
}

export function findClientOrderIdentity(
  clientId: string,
  executor: DbExecutor = db,
) {
  return executor.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.actif, true)),
    columns: { id: true, nom: true, telephone: true, email: true },
  });
}

export function findClientProfile(clientId: string, executor: DbExecutor = db) {
  return executor
    .select({
      id: clients.id,
      nom: clients.nom,
      telephone: clients.telephone,
      email: clients.email,
      adresseDefaut: clients.adresseDefaut,
      latitudeDefaut: clients.latitudeDefaut,
      longitudeDefaut: clients.longitudeDefaut,
      nombreCommandes: completedOrderCount,
      totalDepense: completedOrderSpend,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .leftJoin(commandes, eq(commandes.clientId, clients.id))
    .where(eq(clients.id, clientId))
    .groupBy(clients.id)
    .then((rows) => rows[0] ?? null);
}

export async function insertClient(input: {
  nom: string;
  telephone: string;
  email?: string | null;
  passwordHash?: string | null;
  adresseDefaut?: string | null;
  latitudeDefaut?: number | null;
  longitudeDefaut?: number | null;
}) {
  const [client] = await db
    .insert(clients)
    .values({
      nom: input.nom,
      telephone: input.telephone,
      email: input.email ?? null,
      password: input.passwordHash ?? null,
      adresseDefaut: input.adresseDefaut ?? null,
      latitudeDefaut: input.latitudeDefaut ?? null,
      longitudeDefaut: input.longitudeDefaut ?? null,
    })
    .returning({
      id: clients.id,
      nom: clients.nom,
      telephone: clients.telephone,
      email: clients.email,
    });
  return client!;
}

export async function updateClientProfileRecord(
  clientId: string,
  values: Partial<{
    nom: string;
    email: string | null;
    adresseDefaut: string | null;
    latitudeDefaut: number | null;
    longitudeDefaut: number | null;
    password: string;
  }>,
) {
  const [client] = await db
    .update(clients)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning({ id: clients.id });
  return client ?? null;
}

export async function listAdminClientRecords(input: {
  search?: string;
  page: number;
  limit: number;
}) {
  const where = input.search
    ? or(
        ilike(clients.nom, `%${input.search}%`),
        ilike(clients.telephone, `%${input.search}%`),
        ilike(clients.email, `%${input.search}%`),
      )
    : undefined;
  const projection = db
    .select({
      id: clients.id,
      nom: clients.nom,
      telephone: clients.telephone,
      email: clients.email,
      adresseDefaut: clients.adresseDefaut,
      latitudeDefaut: clients.latitudeDefaut,
      longitudeDefaut: clients.longitudeDefaut,
      nombreCommandes: completedOrderCount,
      totalDepense: completedOrderSpend,
      createdAt: clients.createdAt,
      actif: clients.actif,
    })
    .from(clients)
    .leftJoin(commandes, eq(commandes.clientId, clients.id))
    .where(where)
    .groupBy(clients.id)
    .orderBy(desc(clients.createdAt))
    .limit(input.limit)
    .offset((input.page - 1) * input.limit);
  const [items, totalRows] = await Promise.all([
    projection,
    db.select({ total: count() }).from(clients).where(where),
  ]);
  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items,
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function setClientActiveState(
  tx: TransactionExecutor,
  input: {
    clientId: string;
    active: boolean;
    reason?: string | null;
    now: Date;
  },
) {
  const [client] = await tx
    .update(clients)
    .set({
      actif: input.active,
      motifSuspension: input.active ? null : input.reason,
      suspenduAt: input.active ? null : input.now,
      updatedAt: input.now,
    })
    .where(
      and(eq(clients.id, input.clientId), eq(clients.actif, !input.active)),
    )
    .returning();
  return client ?? null;
}

export async function softDeleteClientRecord(
  clientId: string,
  now: Date,
  executor: DbExecutor = db,
) {
  const anonymizedPhone = `deleted_${clientId.slice(0, 8)}`;
  const [client] = await executor
    .update(clients)
    .set({
      actif: false,
      nom: "Compte supprimé",
      telephone: anonymizedPhone,
      email: null,
      password: null,
      avatarUrl: null,
      adresseDefaut: null,
      latitudeDefaut: null,
      longitudeDefaut: null,
      motifSuspension: "Suppression volontaire du compte",
      suspenduAt: now,
      updatedAt: now,
    })
    .where(and(eq(clients.id, clientId), eq(clients.actif, true)))
    .returning();
  return client ? { id: client.id } : null;
}
