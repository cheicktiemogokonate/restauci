import "server-only";

import { comparePassword, hashPassword } from "@/modules/auth/server";
import { revokeOwnerSessions } from "@/infrastructure/auth/revocation";
import { transactionalDb } from "@/infrastructure/db";
import { persistAuditLog } from "@/modules/audit/server";
import {
  authenticateClientSchema,
  listAdminClientsSchema,
  registerClientSchema,
  updateClientProfileSchema,
  type AuthenticateClientCommand,
  type ListAdminClientsInput,
  type RegisterClientCommand,
  type UpdateClientProfileCommand,
} from "./contracts";
import { ClientDomainError } from "./model";
import {
  findClientAuthRecordByPhone,
  findClientAuthRecordById,
  findClientOrderIdentity,
  findClientProfile,
  findClientSessionState,
  insertClient,
  listAdminClientRecords,
  setClientActiveState,
  updateClientProfileRecord,
} from "./_internal/persistence";

const DUMMY_PASSWORD_HASH =
  "$2b$12$uTgttD2C7DC66CkZOWNP..p1.dVZb72d./VYmD08jia4VsjYPs3O2";

export { ClientDomainError } from "./model";

export async function authenticateClientCredentials(
  command: AuthenticateClientCommand,
) {
  const input = authenticateClientSchema.parse(command);
  const client = await findClientAuthRecordByPhone(input.telephone);
  const passwordValid = await comparePassword(
    input.password,
    client?.password ?? DUMMY_PASSWORD_HASH,
  );
  if (!client?.password || !passwordValid) {
    throw new ClientDomainError(
      "CLIENT_CREDENTIALS_INVALID",
      "Numéro de téléphone ou mot de passe incorrect",
    );
  }
  if (!client.actif) {
    throw new ClientDomainError(
      "CLIENT_INACTIVE",
      "Votre compte a été désactivé. Contactez le support.",
    );
  }
  const { password: _password, actif: _active, ...safe } = client;
  void _password;
  void _active;
  return safe;
}

export async function registerClient(command: RegisterClientCommand) {
  const input = registerClientSchema.parse(command);
  const existing = await findClientAuthRecordByPhone(input.telephone);
  if (existing) {
    throw new ClientDomainError(
      "CLIENT_ALREADY_EXISTS",
      "Un compte existe déjà avec ce numéro de téléphone",
    );
  }
  const passwordHash = await hashPassword(input.password);
  try {
    return await insertClient({
      nom: input.nom,
      telephone: input.telephone,
      email: input.email,
      passwordHash,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      throw new ClientDomainError(
        "CLIENT_ALREADY_EXISTS",
        "Un compte existe déjà avec ce numéro de téléphone ou cet e-mail",
      );
    }
    throw error;
  }
}

export async function getClientSessionState(clientId: string) {
  const client = await findClientSessionState(clientId);
  return client ? { id: client.id, active: client.actif } : null;
}

export function getClientOrderIdentity(
  clientId: string,
  options: { executor?: Parameters<typeof findClientOrderIdentity>[1] } = {},
) {
  return findClientOrderIdentity(clientId, options.executor);
}

export function getClientProfile(clientId: string) {
  return findClientProfile(clientId);
}

export async function updateClientProfile(
  clientId: string,
  command: UpdateClientProfileCommand,
) {
  const input = updateClientProfileSchema.parse(command);
  const values: Parameters<typeof updateClientProfileRecord>[1] = {};
  if (input.nom !== undefined) values.nom = input.nom;
  if (input.email !== undefined) values.email = input.email;
  if (input.adresseDefaut !== undefined) values.adresseDefaut = input.adresseDefaut;
  if (input.latitudeDefaut !== undefined) values.latitudeDefaut = input.latitudeDefaut;
  if (input.longitudeDefaut !== undefined) values.longitudeDefaut = input.longitudeDefaut;

  let passwordChanged = false;
  if (input.nouveauPassword && input.ancienPassword) {
    const current = await findClientAuthRecordById(clientId);
    if (!current?.password || !(await comparePassword(input.ancienPassword, current.password))) {
      throw new ClientDomainError(
        "CLIENT_CURRENT_PASSWORD_INVALID",
        "Ancien mot de passe incorrect",
      );
    }
    values.password = await hashPassword(input.nouveauPassword);
    passwordChanged = true;
  }
  if (Object.keys(values).length === 0) {
    throw new ClientDomainError("CLIENT_NOT_FOUND", "Aucune donnée à mettre à jour");
  }
  const updated = await updateClientProfileRecord(clientId, values);
  if (!updated) {
    throw new ClientDomainError("CLIENT_NOT_FOUND", "Client introuvable");
  }
  if (passwordChanged) await revokeOwnerSessions("client", clientId);
  return { id: clientId, passwordChanged };
}

export function listAdminClients(input: ListAdminClientsInput) {
  return listAdminClientRecords(listAdminClientsSchema.parse(input));
}

export async function suspendClient(
  actor: { adminId: string },
  input: { clientId: string; reason: string },
) {
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("Le motif doit contenir au moins 5 caractères.");
  await revokeOwnerSessions("client", input.clientId);
  return transactionalDb.transaction(async (tx) => {
    const client = await setClientActiveState(tx, {
      clientId: input.clientId,
      active: false,
      reason,
      now: new Date(),
    });
    if (!client) {
      throw new ClientDomainError(
        "CLIENT_TRANSITION_INVALID",
        "Seul un client actif peut être suspendu.",
      );
    }
    await persistAuditLog(tx, {
      adminId: actor.adminId,
      action: "client_suspendu",
      ressourceType: "client",
      ressourceId: input.clientId,
      details: { motif: reason },
    });
    return client;
  });
}

export function reactivateClient(actor: { adminId: string }, clientId: string) {
  return transactionalDb.transaction(async (tx) => {
    const client = await setClientActiveState(tx, {
      clientId,
      active: true,
      now: new Date(),
    });
    if (!client) {
      throw new ClientDomainError(
        "CLIENT_TRANSITION_INVALID",
        "Seul un client suspendu peut être réactivé.",
      );
    }
    await persistAuditLog(tx, {
      adminId: actor.adminId,
      action: "client_reactive",
      ressourceType: "client",
      ressourceId: clientId,
    });
    return client;
  });
}

export async function upsertClient(input: {
  nom: string;
  telephone: string;
  email?: string;
  passwordHash?: string;
  adresseDefaut?: string;
  latitudeDefaut?: number;
  longitudeDefaut?: number;
}) {
  const existing = await findClientAuthRecordByPhone(input.telephone);
  if (existing) return existing;
  return insertClient(input);
}
