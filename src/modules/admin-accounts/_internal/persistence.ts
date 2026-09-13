import "server-only";

import { persistBusinessEvent } from "@/modules/events/server";
import { users } from "@/infrastructure/db/schema";
import { transactionalDb } from "@/infrastructure/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import {
  ADMIN_ACCOUNT_CREATED_EVENT_TYPE,
  ADMIN_ACCOUNT_PASSWORD_RESET_EVENT_TYPE,
  ADMIN_ACCOUNT_REACTIVATED_EVENT_TYPE,
  ADMIN_ACCOUNT_SUSPENDED_EVENT_TYPE,
  AdminAccountDomainError,
} from "../model";

export function listAdminAccountsPersistence(search?: string) {
  const normalizedSearch = search?.trim().slice(0, 100);
  return transactionalDb
    .select({
      id: users.id,
      nom: users.nom,
      email: users.email,
      telephone: users.telephone,
      suspendu: users.suspendu,
      dernierConnexion: users.dernierConnexion,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        normalizedSearch
          ? or(
              ilike(users.nom, `%${normalizedSearch.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`),
              ilike(users.email, `%${normalizedSearch.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(users.createdAt));
}

export async function getAdminPasswordHash(adminId: string) {
  const [admin] = await transactionalDb
    .select({ password: users.password, role: users.role, suspendu: users.suspendu })
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);
  return admin?.role === "admin" && !admin.suspendu ? admin.password : null;
}

export async function createAdminAccountPersistence(input: {
  actorId: string;
  id: string;
  eventId: string;
  correlationId: string;
  occurredAt: Date;
  email: string;
  nom: string;
  telephone: string;
  passwordHash: string;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing) {
      throw new AdminAccountDomainError(
        "ADMIN_ACCOUNT_EMAIL_TAKEN",
        "Un compte utilise déjà cet email.",
      );
    }

    const [created] = await tx
      .insert(users)
      .values({
        id: input.id,
        email: input.email,
        nom: input.nom,
        telephone: input.telephone,
        password: input.passwordHash,
        role: "admin",
        emailVerifie: true,
      })
      .returning({ id: users.id, email: users.email, nom: users.nom });
    await persistBusinessEvent(tx, {
      eventId: input.eventId,
      correlationId: input.correlationId,
      type: ADMIN_ACCOUNT_CREATED_EVENT_TYPE,
      actor: { type: "admin", id: input.actorId },
      partnerAccountId: null,
      target: { type: "admin_account", id: input.id },
      occurredAt: input.occurredAt,
      payload: {},
      effects: [
        {
          type: "audit.project",
          payload: { action: "admin_account_created" },
        },
      ],
    });
    return created;
  });
}

export async function resetAdminPasswordPersistence(input: {
  actorId: string;
  targetAdminId: string;
  passwordHash: string;
  eventId: string;
  correlationId: string;
  occurredAt: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ password: input.passwordHash, updatedAt: input.occurredAt })
      .where(and(eq(users.id, input.targetAdminId), eq(users.role, "admin")))
      .returning({ id: users.id, email: users.email });
    if (!updated) {
      throw new AdminAccountDomainError(
        "ADMIN_ACCOUNT_NOT_FOUND",
        "Compte administrateur introuvable.",
      );
    }
    await persistBusinessEvent(tx, {
      eventId: input.eventId,
      correlationId: input.correlationId,
      type: ADMIN_ACCOUNT_PASSWORD_RESET_EVENT_TYPE,
      actor: { type: "admin", id: input.actorId },
      partnerAccountId: null,
      target: { type: "admin_account", id: updated.id },
      occurredAt: input.occurredAt,
      payload: {},
      effects: [
        {
          type: "audit.project",
          payload: { action: "admin_password_reset" },
        },
      ],
    });
    return updated;
  });
}

export async function suspendAdminAccountPersistence(input: {
  actorId: string;
  targetAdminId: string;
  motif: string;
  eventId: string;
  correlationId: string;
  occurredAt: Date;
}) {
  if (input.actorId === input.targetAdminId) {
    throw new AdminAccountDomainError(
      "ADMIN_ACCOUNT_SELF_SUSPENSION",
      "Vous ne pouvez pas suspendre votre propre compte.",
    );
  }
  return transactionalDb.transaction(async (tx) => {
    const [activeCount] = await tx
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.suspendu, false)));
    if (Number(activeCount?.value ?? 0) <= 1) {
      throw new AdminAccountDomainError(
        "ADMIN_ACCOUNT_LAST_ACTIVE",
        "Le dernier administrateur actif ne peut pas être suspendu.",
      );
    }
    const [updated] = await tx
      .update(users)
      .set({
        suspendu: true,
        motifSuspension: input.motif,
        suspenduAt: input.occurredAt,
        updatedAt: input.occurredAt,
      })
      .where(
        and(
          eq(users.id, input.targetAdminId),
          eq(users.role, "admin"),
          eq(users.suspendu, false),
        ),
      )
      .returning({ id: users.id });
    if (!updated) {
      throw new AdminAccountDomainError(
        "ADMIN_ACCOUNT_ALREADY_SUSPENDED",
        "Ce compte est introuvable ou déjà suspendu.",
      );
    }
    await persistBusinessEvent(tx, {
      eventId: input.eventId,
      correlationId: input.correlationId,
      type: ADMIN_ACCOUNT_SUSPENDED_EVENT_TYPE,
      actor: { type: "admin", id: input.actorId },
      partnerAccountId: null,
      target: { type: "admin_account", id: updated.id },
      occurredAt: input.occurredAt,
      payload: {},
      effects: [
        {
          type: "audit.project",
          payload: { action: "admin_account_suspended" },
        },
      ],
    });
    return updated;
  });
}

export async function reactivateAdminAccountPersistence(input: {
  actorId: string;
  targetAdminId: string;
  eventId: string;
  correlationId: string;
  occurredAt: Date;
}) {
  return transactionalDb.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({
        suspendu: false,
        motifSuspension: null,
        suspenduAt: null,
        updatedAt: input.occurredAt,
      })
      .where(
        and(
          eq(users.id, input.targetAdminId),
          eq(users.role, "admin"),
          eq(users.suspendu, true),
        ),
      )
      .returning({ id: users.id });
    if (!updated) {
      throw new AdminAccountDomainError(
        "ADMIN_ACCOUNT_ALREADY_ACTIVE",
        "Ce compte est introuvable ou déjà actif.",
      );
    }
    await persistBusinessEvent(tx, {
      eventId: input.eventId,
      correlationId: input.correlationId,
      type: ADMIN_ACCOUNT_REACTIVATED_EVENT_TYPE,
      actor: { type: "admin", id: input.actorId },
      partnerAccountId: null,
      target: { type: "admin_account", id: updated.id },
      occurredAt: input.occurredAt,
      payload: {},
      effects: [
        {
          type: "audit.project",
          payload: { action: "admin_account_reactivated" },
        },
      ],
    });
    return updated;
  });
}
