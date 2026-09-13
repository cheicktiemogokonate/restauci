import "server-only";

import { comparePassword, hashPassword } from "@/modules/auth/server";
import { revokeOwnerSessions } from "@/infrastructure/auth/revocation";
import { randomBytes, randomUUID } from "node:crypto";
import {
  adminAccountIdSchema,
  adminAccountConfirmationSchema,
  createAdminAccountSchema,
  resetAdminPasswordSchema,
  suspendAdminAccountSchema,
  type CreateAdminAccountCommand,
} from "./contracts";
import {
  createAdminAccountPersistence,
  getAdminPasswordHash,
  listAdminAccountsPersistence,
  reactivateAdminAccountPersistence,
  resetAdminPasswordPersistence,
  suspendAdminAccountPersistence,
} from "./_internal/persistence";
import { AdminAccountDomainError, type AdminAccountActor } from "./model";

function generateTemporaryPassword() {
  return `${randomBytes(12).toString("base64url")}aA7!`;
}

async function requirePasswordConfirmation(actorId: string, password: string) {
  const hash = await getAdminPasswordHash(actorId);
  if (!hash || !(await comparePassword(password, hash))) {
    throw new AdminAccountDomainError(
      "ADMIN_ACCOUNT_INVALID_CONFIRMATION",
      "Votre mot de passe administrateur est incorrect.",
    );
  }
}

export function listAdminAccounts(search?: string) {
  return listAdminAccountsPersistence(search);
}

export async function createAdminAccount(
  actor: AdminAccountActor,
  command: CreateAdminAccountCommand,
) {
  const parsed = createAdminAccountSchema.parse(command);
  await requirePasswordConfirmation(actor.adminId, parsed.actorPassword);
  const temporaryPassword = generateTemporaryPassword();
  const account = await createAdminAccountPersistence({
    actorId: actor.adminId,
    id: randomUUID(),
    eventId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date(),
    email: parsed.email,
    nom: parsed.nom,
    telephone: parsed.telephone,
    passwordHash: await hashPassword(temporaryPassword),
  });
  return { account, temporaryPassword };
}

export async function resetAdminPassword(
  actor: AdminAccountActor,
  command: { adminId: string; actorPassword: string },
) {
  const parsed = resetAdminPasswordSchema.parse(command);
  await requirePasswordConfirmation(actor.adminId, parsed.actorPassword);
  const temporaryPassword = generateTemporaryPassword();
  const account = await resetAdminPasswordPersistence({
    actorId: actor.adminId,
    targetAdminId: parsed.adminId,
    passwordHash: await hashPassword(temporaryPassword),
    eventId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date(),
  });
  await revokeOwnerSessions("user", parsed.adminId);
  return { account, temporaryPassword };
}

export async function suspendAdminAccount(
  actor: AdminAccountActor,
  command: { adminId: string; motif: string },
) {
  const parsed = suspendAdminAccountSchema.parse(command);
  const account = await suspendAdminAccountPersistence({
    actorId: actor.adminId,
    targetAdminId: parsed.adminId,
    motif: parsed.motif,
    eventId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date(),
  });
  await revokeOwnerSessions("user", parsed.adminId);
  return account;
}

export async function reactivateAdminAccount(
  actor: AdminAccountActor,
  adminId: string,
) {
  const targetAdminId = adminAccountIdSchema.parse(adminId);
  return reactivateAdminAccountPersistence({
    actorId: actor.adminId,
    targetAdminId,
    eventId: randomUUID(),
    correlationId: randomUUID(),
    occurredAt: new Date(),
  });
}

export async function confirmAdminPassword(adminId: string, password: string) {
  await requirePasswordConfirmation(
    adminAccountIdSchema.parse(adminId),
    adminAccountConfirmationSchema.parse(password),
  );
}
